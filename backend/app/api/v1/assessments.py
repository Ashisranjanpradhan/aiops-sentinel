import json
from fastapi import APIRouter, Depends, File, Form, Query, Response, UploadFile, status
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.response import make_response
from app.db.session import get_db
from app.models.entities import User
from app.services.assessment.assessment_service import assessment_service

router = APIRouter(prefix="/assessments", tags=["Codebase Production-Readiness Assessment"])


@router.post("/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_codebase_for_assessment(
    files: list[UploadFile] = File(...),
    project_name: str = Form(""),
    profile: str = Form("auto"),
    mode: str = Form("full_assessment"),
    relative_paths_json: str = Form("[]"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a ZIP archive, complete directory, or individual source files for readiness inspection.
    Safe archive isolation, multi-language structural checks, and 10-dimension scoring are performed.
    """
    try:
        relative_paths = json.loads(relative_paths_json)
        if not isinstance(relative_paths, list):
            relative_paths = []
    except Exception:
        relative_paths = []

    assessment_id, job_id = await assessment_service.start_assessment(
        db=db,
        files=files,
        project_name=project_name,
        user_id=current_user.id,
        profile=profile,
        mode=mode,
        relative_paths=relative_paths,
    )
    return make_response(
        {
            "assessment_id": assessment_id,
            "job_id": job_id,
            "status": "pending",
            "profile": profile,
            "mode": mode,
            "message": "Codebase uploaded and queued for static readiness assessment.",
        }
    )


@router.get("")
async def list_assessments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    assessments, total = await assessment_service.list_assessments(
        db=db, current_user=current_user, page=page, page_size=page_size
    )
    return make_response(
        [a.model_dump() for a in assessments], page=page, page_size=page_size, total=total
    )


@router.get("/jobs/{job_id}")
async def get_assessment_job_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job = await assessment_service.get_job(db=db, job_id=job_id, current_user=current_user)
    return make_response(job.model_dump())


@router.get("/{assessment_id}")
async def get_assessment_detail(
    assessment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    detail = await assessment_service.get_assessment(
        db=db, assessment_id=assessment_id, current_user=current_user
    )
    return make_response(detail.model_dump())


@router.delete("/{assessment_id}", status_code=status.HTTP_200_OK)
async def delete_assessment(
    assessment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Securely deletes assessment record, related findings, and cleans disk scratch files."""
    await assessment_service.delete_assessment(
        db=db, assessment_id=assessment_id, current_user=current_user
    )
    return make_response({"message": f"Assessment '{assessment_id}' deleted successfully."})


@router.get("/{assessment_id}/export")
async def export_assessment_report(
    assessment_id: str,
    export_format: str = Query("json", alias="format", pattern="^(json|sarif|html)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Exports assessment findings in standard machine-readable JSON, OASIS SARIF v2.1.0, or HTML format."""
    exported = await assessment_service.export_assessment(
        db=db, assessment_id=assessment_id, current_user=current_user, export_format=export_format
    )

    if export_format == "html":
        return HTMLResponse(content=exported, status_code=200)
    elif export_format == "sarif":
        return Response(
            content=json.dumps(exported, indent=2),
            media_type="application/sarif+json",
            headers={"Content-Disposition": f'attachment; filename="assessment-{assessment_id[:8]}.sarif"'},
        )
    return make_response(exported)


@router.get("/{assessment_id}/findings")
async def list_assessment_findings(
    assessment_id: str,
    dimension: str | None = Query(None),
    severity: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    findings, total = await assessment_service.list_findings(
        db=db,
        assessment_id=assessment_id,
        current_user=current_user,
        dimension=dimension,
        severity=severity,
        search=search,
        page=page,
        page_size=page_size,
    )
    return make_response(
        [f.model_dump() for f in findings], page=page, page_size=page_size, total=total
    )
