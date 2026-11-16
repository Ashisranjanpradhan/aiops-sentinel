from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.response import make_response
from app.db.session import get_db
from app.models.entities import User
from app.schemas.domain import DeliverDeploymentRequest, PreflightCheckRequest
from app.services.deployment_service import deployment_service

router = APIRouter(prefix="/deployments", tags=["Deployments"])


@router.get("")
async def list_deployments(
    service_id: str | None = Query(None),
    environment: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    deployments, total = await deployment_service.list_deployments(
        db=db, service_id=service_id, environment=environment, page=page, page_size=page_size
    )
    return make_response(
        [d.model_dump() for d in deployments], page=page, page_size=page_size, total=total
    )


@router.post("/preflight-check")
async def run_preflight_check(
    req: PreflightCheckRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await deployment_service.preflight_check(db=db, req=req)
    return make_response(res.model_dump())


@router.post("/deliver")
async def deliver_deployment(
    req: DeliverDeploymentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await deployment_service.deliver_deployment(
        db=db, req=req, current_user_id=current_user.id
    )
    return make_response(res.model_dump())


@router.get("/{deployment_id}")
async def get_deployment(
    deployment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    d = await deployment_service.get_deployment(db, deployment_id)
    return make_response(d.model_dump())

