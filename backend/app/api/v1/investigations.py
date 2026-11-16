from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.response import make_response
from app.db.session import get_db
from app.models.entities import User
from app.services.investigation_service import investigation_service

router = APIRouter(prefix="/investigations", tags=["Investigations"])


@router.get("/{job_id}")
async def get_investigation_job(
    job_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    job = await investigation_service.get_job(db, job_id)
    return make_response(job.model_dump())


@router.get("/{job_id}/result")
async def get_investigation_result(
    job_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    job = await investigation_service.get_job(db, job_id)
    return make_response(
        {
            "job_id": job.id,
            "incident_id": job.incident_id,
            "status": job.status,
            "candidates": [c.model_dump() for c in job.candidates],
        }
    )
