from datetime import UTC, datetime

from aiops_ml.localization.ranker import RootCauseRanker
from aiops_ml.topology.graph import ServiceDependencyGraph
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import NotFoundError
from app.models.entities import (
    Incident,
    IncidentEvent,
    InvestigationJob,
    RootCauseCandidate,
    Service,
    ServiceEdge,
)
from app.schemas.domain import (
    InvestigationJobResponse,
    RootCauseCandidateResponse,
)


class InvestigationService:
    def __init__(self):
        self.ranker = RootCauseRanker()

    async def queue_investigation(
        self, db: AsyncSession, incident_id: str, actor_user_id: str | None = None
    ) -> InvestigationJob:
        result = await db.execute(select(Incident).where(Incident.id == incident_id))
        incident = result.scalar_one_or_none()
        if not incident:
            raise NotFoundError("Incident", incident_id)

        now = datetime.now(UTC)
        job = InvestigationJob(
            incident_id=incident_id,
            status="queued",
            progress=0,
            model_version=self.ranker.version,
            started_at=now,
        )
        db.add(job)
        await db.flush()

        # Log event on incident
        event = IncidentEvent(
            incident_id=incident_id,
            actor_user_id=actor_user_id,
            event_type="investigation_triggered",
            new_value_json={"job_id": job.id, "status": "queued"},
            reason="Investigation job queued",
        )
        db.add(event)
        await db.commit()
        await db.refresh(job)

        # Run investigation execution
        await self.execute_job(db, job.id, actor_user_id)
        await db.refresh(job)
        return job

    async def execute_job(
        self, db: AsyncSession, job_id: str, actor_user_id: str | None = None
    ) -> None:
        result = await db.execute(
            select(InvestigationJob)
            .where(InvestigationJob.id == job_id)
            .options(selectinload(InvestigationJob.incident))
        )
        job = result.scalar_one_or_none()
        if not job:
            return

        job.status = "running"
        job.progress = 30
        await db.commit()

        try:
            # 1. Fetch incident details and evidence
            inc_res = await db.execute(
                select(Incident)
                .where(Incident.id == job.incident_id)
                .options(selectinload(Incident.evidence))
            )
            incident = inc_res.scalar_one()

            # 2. Build service map and dependency graph
            srv_res = await db.execute(select(Service))
            services = srv_res.scalars().all()
            service_names_map = {s.id: s.name for s in services}

            graph = ServiceDependencyGraph()
            for s in services:
                graph.add_service(s.id, s.name)

            edge_res = await db.execute(select(ServiceEdge))
            edges = edge_res.scalars().all()
            for e in edges:
                graph.add_edge(e.source_service_id, e.target_service_id, error_rate=e.error_rate)

            # 3. Format evidence list
            ev_list = [
                {
                    "id": ev.id,
                    "evidence_type": ev.evidence_type,
                    "service_id": ev.service_id,
                    "summary_json": ev.summary_json,
                }
                for ev in incident.evidence
            ]

            job.progress = 70
            await db.commit()

            # 4. Rank candidates using ML localization engine
            ranked_candidates = self.ranker.rank_candidates(
                primary_service_id=incident.primary_service_id,
                service_names_map=service_names_map,
                evidence_list=ev_list,
                topology_graph=graph,
            )

            # 5. Persist candidates
            for cand in ranked_candidates:
                db_cand = RootCauseCandidate(
                    investigation_job_id=job.id,
                    service_id=cand.service_id,
                    rank=cand.rank,
                    score=cand.score,
                    calibrated_confidence=cand.calibrated_confidence,
                    candidate_indicator=cand.candidate_indicator,
                    explanation=cand.explanation,
                    evidence_ids=cand.evidence_ids,
                )
                db.add(db_cand)

            now = datetime.now(UTC)
            job.status = "succeeded"
            job.progress = 100
            job.completed_at = now
            job.result_reference = f"candidates_{len(ranked_candidates)}"

            # Log completion event
            top_cand = ranked_candidates[0] if ranked_candidates else None
            event = IncidentEvent(
                incident_id=incident.id,
                actor_user_id=actor_user_id,
                event_type="investigation_completed",
                new_value_json={
                    "job_id": job.id,
                    "top_candidate": top_cand.service_name if top_cand else "None",
                    "top_confidence": top_cand.calibrated_confidence if top_cand else None,
                },
                reason="Investigation completed successfully",
            )
            db.add(event)
            await db.commit()

        except Exception:
            job.status = "failed"
            job.error_code = "ANALYSIS_ERROR"
            job.safe_error_summary = "An unexpected error occurred while correlating evidence."
            job.completed_at = datetime.now(UTC)
            await db.commit()

    async def get_job(self, db: AsyncSession, job_id: str) -> InvestigationJobResponse:
        result = await db.execute(
            select(InvestigationJob)
            .where(InvestigationJob.id == job_id)
            .options(
                selectinload(InvestigationJob.candidates).selectinload(RootCauseCandidate.service)
            )
        )
        job = result.scalar_one_or_none()
        if not job:
            raise NotFoundError("InvestigationJob", job_id)

        cands = [
            RootCauseCandidateResponse(
                id=c.id,
                service_id=c.service_id,
                service_name=c.service.name if c.service else "Unknown",
                rank=c.rank,
                score=c.score,
                calibrated_confidence=c.calibrated_confidence,
                candidate_indicator=c.candidate_indicator,
                explanation=c.explanation,
                evidence_ids=c.evidence_ids or [],
            )
            for c in sorted(job.candidates, key=lambda x: x.rank)
        ]

        return InvestigationJobResponse(
            id=job.id,
            incident_id=job.incident_id,
            status=job.status,
            progress=job.progress,
            model_version=job.model_version,
            started_at=job.started_at,
            completed_at=job.completed_at,
            error_code=job.error_code,
            safe_error_summary=job.safe_error_summary,
            candidates=cands,
        )


investigation_service = InvestigationService()
