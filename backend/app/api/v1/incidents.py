from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.response import make_response
from app.db.session import get_db
from app.models.entities import User
from app.schemas.domain import (
    IncidentCreate,
    IncidentUpdate,
    NoteCreate,
)
from app.services.incident_service import incident_service
from app.services.investigation_service import investigation_service

router = APIRouter(prefix="/incidents", tags=["Incidents"])


@router.get("")
async def list_incidents(
    search: str | None = Query(None),
    severity: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    service_id: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("detected_at"),
    sort_order: str = Query("desc"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    incidents, total = await incident_service.list_incidents(
        db=db,
        search=search,
        severity=severity,
        status=status_filter,
        service_id=service_id,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return make_response(
        [inc.model_dump() for inc in incidents], page=page, page_size=page_size, total=total
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_incident(
    payload: IncidentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    incident = await incident_service.create_incident(
        db=db, data=payload, actor_user_id=current_user.id
    )
    detail = await incident_service.get_incident(db, incident.id)
    return make_response(detail.model_dump())


@router.get("/{incident_id}")
async def get_incident(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    detail = await incident_service.get_incident(db, incident_id)
    return make_response(detail.model_dump())


@router.patch("/{incident_id}")
async def update_incident(
    incident_id: str,
    payload: IncidentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await incident_service.update_incident(
        db=db, incident_id=incident_id, data=payload, actor_user_id=current_user.id
    )
    detail = await incident_service.get_incident(db, incident_id)
    return make_response(detail.model_dump())


@router.post("/{incident_id}/notes")
async def add_note(
    incident_id: str,
    payload: NoteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await incident_service.add_note(
        db=db, incident_id=incident_id, data=payload, actor_user_id=current_user.id
    )
    return make_response(
        {
            "id": event.id,
            "event_type": event.event_type,
            "note": payload.note,
            "created_at": event.created_at.isoformat(),
        }
    )


@router.post("/{incident_id}/investigations", status_code=status.HTTP_202_ACCEPTED)
async def run_investigation(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job = await investigation_service.queue_investigation(
        db=db, incident_id=incident_id, actor_user_id=current_user.id
    )
    job_detail = await investigation_service.get_job(db, job.id)
    return make_response(job_detail.model_dump())


@router.get("/{incident_id}/timeline")
async def get_incident_timeline(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    detail = await incident_service.get_incident(db, incident_id)
    return make_response([e.model_dump() for e in detail.events])
