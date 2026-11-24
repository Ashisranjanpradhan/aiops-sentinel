import asyncio
import logging
from pathlib import Path
from typing import Any

from fastapi import UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import ForbiddenError, NotFoundError, ValidationError
from app.db.session import AsyncSessionLocal
from app.models.entities import (
    AssessmentFinding,
    AssessmentJob,
    CodebaseAssessment,
    User,
    gen_uuid,
    utcnow,
)
from app.schemas.domain import (
    AssessmentFindingResponse,
    AssessmentJobResponse,
    CodebaseAssessmentDetailResponse,
    CodebaseAssessmentResponse,
)
from app.services.assessment.ast_analyzer import MultiLanguageCodeAnalyzer
from app.services.assessment.detector import CodebaseDetector
from app.services.assessment.evaluator import DimensionEvaluator
from app.services.assessment.secrets_scanner import SecretsScanner
from app.services.assessment.workspace import WorkspaceManager
from app.services.queue_service import task_queue
from app.services.storage_service import storage_service

logger = logging.getLogger("aiops.assessment_service")


class AssessmentService:
    """Orchestrates codebase production-readiness evaluation jobs and reporting."""

    def __init__(self):
        self._worker_task: asyncio.Task | None = None
        self._shutdown_event = asyncio.Event()

    def _ensure_worker_running(self) -> None:
        """Start durable background queue processor if not already active."""
        if self._worker_task is None or self._worker_task.done():
            self._shutdown_event.clear()
            self._worker_task = asyncio.create_task(self._process_queue_loop())

    async def _process_queue_loop(self) -> None:
        """Worker loop consuming codebase assessment tasks from the durable queue."""
        logger.info("Assessment queue worker active and consuming jobs")
        while not self._shutdown_event.is_set():
            try:
                msg = await task_queue.dequeue(timeout_seconds=0.5)
                if not msg:
                    continue
                if msg.get("task_name") != "codebase_assessment":
                    continue

                payload = msg.get("payload", {})
                job_id = msg.get("job_id")
                assessment_id = payload.get("assessment_id")
                ws_path = Path(payload.get("workspace_dir", ""))

                try:
                    await self._run_assessment_pipeline(
                        assessment_id=assessment_id,
                        job_id=job_id,
                        workspace_dir=ws_path,
                        profile=payload.get("profile", "auto"),
                        mode=payload.get("mode", "full_assessment"),
                    )
                    await task_queue.ack(job_id)
                except Exception as ex:
                    await task_queue.nack(job_id, str(ex))
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Error in assessment queue worker loop: %s", e)
                await asyncio.sleep(0.5)

    async def list_assessments(
        self,
        db: AsyncSession,
        current_user: User | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[CodebaseAssessmentResponse], int]:
        query = select(CodebaseAssessment)
        if current_user and current_user.role not in ("admin", "operator"):
            query = query.where(CodebaseAssessment.created_by_user_id == current_user.id)

        total_res = await db.execute(select(func.count()).select_from(query.subquery()))
        total = total_res.scalar_one()

        query = (
            query.order_by(CodebaseAssessment.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await db.execute(query)
        assessments = result.scalars().all()

        responses = []
        for a in assessments:
            count_res = await db.execute(
                select(func.count(AssessmentFinding.id)).where(
                    AssessmentFinding.assessment_id == a.id
                )
            )
            findings_count = count_res.scalar_one()

            meta = (a.dimension_scores_json or {}).get("_meta", {})
            profile = meta.get("profile", "Generic Software Repository")
            mode = meta.get("execution_mode", "full_assessment")
            clean_dim_scores = {
                k: v for k, v in (a.dimension_scores_json or {}).items() if k != "_meta"
            }

            responses.append(
                CodebaseAssessmentResponse(
                    id=a.id,
                    project_name=a.project_name,
                    source_type=a.source_type,
                    source_size_bytes=a.source_size_bytes,
                    file_count=a.file_count,
                    primary_languages_json=a.primary_languages_json or [],
                    frameworks_json=a.frameworks_json or [],
                    profile=profile,
                    execution_mode=mode,
                    overall_score=a.overall_score,
                    readiness_level=a.readiness_level,
                    dimension_scores_json=clean_dim_scores,
                    summary=a.summary,
                    recommendations_json=a.recommendations_json or [],
                    project_tree=meta.get("project_tree", []),
                    capability_matrix=meta.get("capability_matrix", []),
                    missing_critical_files=meta.get("missing_critical_files", []),
                    created_by_user_id=a.created_by_user_id,
                    created_at=a.created_at,
                    updated_at=a.updated_at,
                    findings_count=findings_count,
                )
            )
        return responses, total

    async def get_assessment(
        self, db: AsyncSession, assessment_id: str, current_user: User | None = None
    ) -> CodebaseAssessmentDetailResponse:
        query = (
            select(CodebaseAssessment)
            .options(selectinload(CodebaseAssessment.findings))
            .where(CodebaseAssessment.id == assessment_id)
        )
        res = await db.execute(query)
        a = res.scalar_one_or_none()
        if not a:
            raise NotFoundError("CodebaseAssessment", assessment_id)

        # Enforce authenticated ownership or admin/operator privilege
        if (
            current_user
            and a.created_by_user_id
            and a.created_by_user_id != current_user.id
            and current_user.role not in ("admin", "operator")
        ):
            raise ForbiddenError("You are not authorized to access this assessment.")

        findings_resp = [
            AssessmentFindingResponse(
                id=f.id,
                assessment_id=f.assessment_id,
                dimension=f.dimension,
                rule_id=f.rule_id,
                title=f.title,
                description=f.description,
                severity=f.severity,
                file_path=f.file_path,
                line_number=f.line_number,
                evidence_snippet=f.evidence_snippet,
                remediation_advice=f.remediation_advice,
                created_at=f.created_at,
            )
            for f in a.findings
        ]

        meta = (a.dimension_scores_json or {}).get("_meta", {})
        profile = meta.get("profile", "Generic Software Repository")
        mode = meta.get("execution_mode", "full_assessment")
        clean_dim_scores = {
            k: v for k, v in (a.dimension_scores_json or {}).items() if k != "_meta"
        }

        return CodebaseAssessmentDetailResponse(
            id=a.id,
            project_name=a.project_name,
            source_type=a.source_type,
            source_size_bytes=a.source_size_bytes,
            file_count=a.file_count,
            primary_languages_json=a.primary_languages_json or [],
            frameworks_json=a.frameworks_json or [],
            profile=profile,
            execution_mode=mode,
            overall_score=a.overall_score,
            readiness_level=a.readiness_level,
            dimension_scores_json=clean_dim_scores,
            summary=a.summary,
            recommendations_json=a.recommendations_json or [],
            project_tree=meta.get("project_tree", []),
            capability_matrix=meta.get("capability_matrix", []),
            missing_critical_files=meta.get("missing_critical_files", []),
            created_by_user_id=a.created_by_user_id,
            created_at=a.created_at,
            updated_at=a.updated_at,
            findings_count=len(findings_resp),
            findings=findings_resp,
        )

    async def delete_assessment(
        self, db: AsyncSession, assessment_id: str, current_user: User
    ) -> bool:
        """Deletes assessment, its findings, jobs, and clean up temporary workspaces."""
        query = select(CodebaseAssessment).where(CodebaseAssessment.id == assessment_id)
        res = await db.execute(query)
        a = res.scalar_one_or_none()
        if not a:
            raise NotFoundError("CodebaseAssessment", assessment_id)

        # Ownership check
        if (
            a.created_by_user_id
            and a.created_by_user_id != current_user.id
            and current_user.role not in ("admin", "operator")
        ):
            raise ForbiddenError("You cannot delete an assessment uploaded by another user.")

        await db.delete(a)
        await db.commit()

        # Clean disk artifacts and persistent storage
        WorkspaceManager.cleanup_assessment_artifacts(assessment_id)
        await storage_service.cleanup_assessment(assessment_id)
        return True

    async def export_assessment(
        self,
        db: AsyncSession,
        assessment_id: str,
        current_user: User | None = None,
        export_format: str = "json",
    ) -> Any:
        detail = await self.get_assessment(db, assessment_id, current_user=current_user)
        findings_dict = [f.model_dump() for f in detail.findings]
        assessment_dict = detail.model_dump()

        if export_format == "sarif":
            return DimensionEvaluator.generate_sarif_report(assessment_dict, findings_dict)
        elif export_format == "html":
            return DimensionEvaluator.generate_html_report(assessment_dict, findings_dict)
        return assessment_dict

    async def list_findings(
        self,
        db: AsyncSession,
        assessment_id: str,
        current_user: User | None = None,
        dimension: str | None = None,
        severity: str | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[AssessmentFindingResponse], int]:
        # Enforce authenticated ownership or administrative access to parent assessment
        if current_user:
            await self.get_assessment(db, assessment_id, current_user=current_user)

        query = select(AssessmentFinding).where(AssessmentFinding.assessment_id == assessment_id)

        if dimension:
            query = query.where(AssessmentFinding.dimension == dimension)
        if severity:
            query = query.where(AssessmentFinding.severity == severity.lower())
        if search:
            query = query.where(
                AssessmentFinding.title.ilike(f"%{search.strip()}%")
                | AssessmentFinding.file_path.ilike(f"%{search.strip()}%")
            )

        count_res = await db.execute(select(func.count()).select_from(query.subquery()))
        total = count_res.scalar_one()

        query = (
            query.order_by(AssessmentFinding.created_at.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await db.execute(query)
        findings = result.scalars().all()

        responses = [
            AssessmentFindingResponse(
                id=f.id,
                assessment_id=f.assessment_id,
                dimension=f.dimension,
                rule_id=f.rule_id,
                title=f.title,
                description=f.description,
                severity=f.severity,
                file_path=f.file_path,
                line_number=f.line_number,
                evidence_snippet=f.evidence_snippet,
                remediation_advice=f.remediation_advice,
                created_at=f.created_at,
            )
            for f in findings
        ]
        return responses, total

    async def get_job(
        self, db: AsyncSession, job_id: str, current_user: User | None = None
    ) -> AssessmentJobResponse:
        res = await db.execute(select(AssessmentJob).where(AssessmentJob.id == job_id))
        job = res.scalar_one_or_none()
        if not job:
            raise NotFoundError("AssessmentJob", job_id)

        # Enforce job ownership via parent assessment
        if current_user and current_user.role not in ("admin", "operator"):
            a_res = await db.execute(
                select(CodebaseAssessment).where(CodebaseAssessment.id == job.assessment_id)
            )
            assessment = a_res.scalar_one_or_none()
            if (
                assessment
                and assessment.created_by_user_id
                and assessment.created_by_user_id != current_user.id
            ):
                raise ForbiddenError("You are not authorized to access this assessment job.")

        return AssessmentJobResponse(
            id=job.id,
            assessment_id=job.assessment_id,
            status=job.status,
            progress_percent=job.progress_percent,
            current_stage=job.current_stage,
            error_message=job.error_message,
            created_at=job.created_at,
            completed_at=job.completed_at,
        )

    async def start_assessment(
        self,
        db: AsyncSession,
        files: list[UploadFile],
        project_name: str,
        user_id: str | None = None,
        profile: str = "auto",
        mode: str = "full_assessment",
        relative_paths: list[str] | None = None,
    ) -> tuple[str, str]:
        """
        Extracts files into isolated scratch space and queues async assessment pipeline.
        Returns (assessment_id, job_id).
        """
        if not files:
            raise ValidationError("No files uploaded for assessment.")

        assessment_id = gen_uuid()
        job_id = gen_uuid()
        workspace_dir = WorkspaceManager.create_isolated_workspace(assessment_id)

        source_type = (
            "zip"
            if len(files) == 1 and files[0].filename and files[0].filename.endswith(".zip")
            else "files"
        )
        total_size = 0
        file_count = 0

        try:
            if source_type == "zip":
                file_count = await WorkspaceManager.extract_zip_safely(files[0], workspace_dir)
            else:
                file_count = await WorkspaceManager.save_multiple_files_safely(
                    files, workspace_dir, relative_paths=relative_paths
                )
        except Exception as e:
            WorkspaceManager.cleanup_workspace(workspace_dir)
            raise ValidationError(str(e)) from e

        # Calculate workspace size
        for f in workspace_dir.rglob("*"):
            if f.is_file():
                total_size += f.stat().st_size

        clean_name = project_name.strip() or (files[0].filename or "Uploaded Codebase").replace(
            ".zip", ""
        )

        assessment = CodebaseAssessment(
            id=assessment_id,
            project_name=clean_name,
            source_type=source_type,
            source_size_bytes=total_size,
            file_count=file_count,
            created_by_user_id=user_id,
        )
        db.add(assessment)

        job = AssessmentJob(
            id=job_id,
            assessment_id=assessment_id,
            status="pending",
            progress_percent=10,
            current_stage="Workspace initialized",
        )
        db.add(job)
        await db.commit()

        # Enqueue task into durable background queue
        await task_queue.enqueue(
            task_name="codebase_assessment",
            payload={
                "assessment_id": assessment_id,
                "job_id": job_id,
                "workspace_dir": str(workspace_dir),
                "profile": profile,
                "mode": mode,
            },
            job_id=job_id,
        )
        self._ensure_worker_running()

        return assessment_id, job_id

    async def _run_assessment_pipeline(
        self,
        assessment_id: str,
        job_id: str,
        workspace_dir: Path,
        profile: str = "auto",
        mode: str = "full_assessment",
    ) -> None:
        """Background pipeline running deterministic analysis across 10 dimensions."""
        async with AsyncSessionLocal() as db:
            try:
                # Stage 1: Detect languages, frameworks, manifests & tree (30%)
                await self._update_job(db, job_id, 30, "Scanning files and repository structure")
                detector_info = await asyncio.to_thread(
                    CodebaseDetector.scan_workspace, workspace_dir
                )

                resolved_profile = (
                    detector_info["profile"] if profile in ("auto", "", None) else profile
                )

                # Stage 2: Secrets and credentials scanner (50%)
                await self._update_job(db, job_id, 50, "Scanning credentials and secrets")
                secret_findings = await asyncio.to_thread(
                    SecretsScanner.scan_files, workspace_dir, detector_info["inventory"]
                )

                # Stage 3: Static multi-language AST and pattern analysis (70%)
                await self._update_job(db, job_id, 70, "Performing multi-language static analysis")
                if mode == "quick_scan":
                    ast_findings = []
                else:
                    ast_findings = await asyncio.to_thread(
                        MultiLanguageCodeAnalyzer.analyze_files,
                        workspace_dir,
                        detector_info["inventory"],
                    )

                # Stage 4: 10-dimension evaluation and scoring (90%)
                await self._update_job(db, job_id, 90, "Evaluating 10 readiness dimensions")
                raw_findings = secret_findings + ast_findings
                is_partial = (
                    detector_info["total_files"] < 3 and detector_info.get("source_type") != "zip"
                )

                (
                    score,
                    level,
                    dim_scores,
                    all_findings,
                    recs,
                    summary,
                ) = await asyncio.to_thread(
                    DimensionEvaluator.evaluate,
                    workspace_dir,
                    detector_info["inventory"],
                    detector_info,
                    raw_findings,
                    is_partial,
                )

                capability_matrix = MultiLanguageCodeAnalyzer.get_capability_matrix(
                    detector_info["languages"]
                )

                # Store metadata inside dimension_scores_json under _meta key
                dim_scores["_meta"] = {
                    "profile": resolved_profile,
                    "execution_mode": mode,
                    "project_tree": detector_info.get("project_tree", []),
                    "capability_matrix": capability_matrix,
                    "missing_critical_files": detector_info.get("missing_critical_files", []),
                    "structural_components": detector_info.get("structural_components", {}),
                    "unsupported_files": detector_info.get("unsupported_files", []),
                }

                # Update assessment record
                res = await db.execute(
                    select(CodebaseAssessment).where(CodebaseAssessment.id == assessment_id)
                )
                assessment = res.scalar_one()
                assessment.overall_score = score
                assessment.readiness_level = level
                assessment.dimension_scores_json = dim_scores
                assessment.primary_languages_json = detector_info["languages"]
                assessment.frameworks_json = detector_info["frameworks"]
                assessment.summary = summary
                assessment.recommendations_json = recs
                assessment.updated_at = utcnow()

                # Add findings to database
                for f in all_findings:
                    finding_entity = AssessmentFinding(
                        assessment_id=assessment_id,
                        dimension=f["dimension"],
                        rule_id=f["rule_id"],
                        title=f["title"],
                        description=f["description"],
                        severity=f["severity"],
                        file_path=f["file_path"],
                        line_number=f.get("line_number"),
                        evidence_snippet=f.get("evidence_snippet"),
                        remediation_advice=f["remediation_advice"],
                    )
                    db.add(finding_entity)

                # Update job to completed
                job_res = await db.execute(select(AssessmentJob).where(AssessmentJob.id == job_id))
                job = job_res.scalar_one()
                job.status = "completed"
                job.progress_percent = 100
                job.current_stage = "Assessment completed"
                job.completed_at = utcnow()

                await db.commit()
                logger.info(
                    "Assessment %s completed with score %.1f (%s, profile=%s)",
                    assessment_id,
                    score,
                    level,
                    resolved_profile,
                )

            except Exception as e:
                logger.exception("Assessment %s failed during pipeline execution", assessment_id)
                await db.rollback()
                try:
                    job_res = await db.execute(
                        select(AssessmentJob).where(AssessmentJob.id == job_id)
                    )
                    job = job_res.scalar_one()
                    job.status = "failed"
                    job.error_message = str(e)
                    job.completed_at = utcnow()
                    await db.commit()
                except Exception:
                    pass
            finally:
                WorkspaceManager.cleanup_workspace(workspace_dir)

    async def _update_job(self, db: AsyncSession, job_id: str, progress: int, stage: str) -> None:
        res = await db.execute(select(AssessmentJob).where(AssessmentJob.id == job_id))
        job = res.scalar_one_or_none()
        if job:
            job.progress_percent = progress
            job.current_stage = stage
            await db.commit()


assessment_service = AssessmentService()
