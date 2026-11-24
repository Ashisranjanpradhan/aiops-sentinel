from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_operator, get_current_user
from app.core.response import make_response
from app.db.session import get_db
from app.models.entities import Incident, IncidentEvent, User
from app.schemas.domain import (
    RemediationExecutionRequest,
)
from app.services.remediation_service import remediation_service

router = APIRouter(tags=["Remediations"])


@router.get("/remediations/runbooks")
async def list_remediation_runbooks(
    current_user: User = Depends(get_current_user),
):
    """Lists safe, pre-approved remediation runbooks with parameters and risk ratings."""
    runbooks = remediation_service.list_runbooks()
    return make_response([r.model_dump() for r in runbooks])


@router.post("/remediations/services/{service_id}/execute", status_code=status.HTTP_200_OK)
async def execute_service_remediation(
    service_id: str,
    req: RemediationExecutionRequest,
    current_user: User = Depends(get_current_operator),
    db: AsyncSession = Depends(get_db),
):
    """Executes a human-in-the-loop approved remediation runbook for a service."""
    res = await remediation_service.execute_remediation(
        db=db,
        req=req,
        service_id=service_id,
        current_user_id=current_user.id,
    )
    return make_response(res.model_dump())


@router.post("/incidents/{incident_id}/remediations", status_code=status.HTTP_200_OK)
async def execute_incident_remediation(
    incident_id: str,
    req: RemediationExecutionRequest,
    current_user: User = Depends(get_current_operator),
    db: AsyncSession = Depends(get_db),
):
    """Executes a human-in-the-loop approved remediation runbook linked to an incident."""
    # Find incident to get service_id
    inc_res = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = inc_res.scalar_one_or_none()
    if not incident:
        from app.core.errors import NotFoundError

        raise NotFoundError("Incident", incident_id)

    res = await remediation_service.execute_remediation(
        db=db,
        req=req,
        service_id=incident.primary_service_id,
        current_user_id=current_user.id,
        incident_id=incident_id,
    )
    return make_response(res.model_dump())


@router.get("/incidents/{incident_id}/remediations")
async def list_incident_remediations(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lists historical remediation actions applied to an incident."""
    ev_res = await db.execute(
        select(IncidentEvent)
        .where(
            IncidentEvent.incident_id == incident_id,
            IncidentEvent.event_type == "remediation_applied",
        )
        .order_by(IncidentEvent.created_at.desc())
    )
    events = ev_res.scalars().all()
    history = [
        {
            "id": e.id,
            "event_type": e.event_type,
            "created_at": e.created_at.isoformat(),
            "actor_user_id": e.actor_user_id,
            "details": e.new_value_json,
            "reason": e.reason,
        }
        for e in events
    ]
    return make_response(history)
