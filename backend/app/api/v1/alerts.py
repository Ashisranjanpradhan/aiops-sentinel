from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_current_operator, get_current_user
from app.core.response import make_response
from app.db.session import get_db
from app.models.entities import User
from app.schemas.domain import AlertRuleCreate, AlertRuleUpdate
from app.services.alert_service import alert_service

router = APIRouter(prefix="/alert-rules", tags=["Alert Rules"])


@router.get("")
async def list_alert_rules(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rules, total = await alert_service.list_rules(db=db, page=page, page_size=page_size)
    return make_response(
        [r.model_dump() for r in rules], page=page, page_size=page_size, total=total
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_alert_rule(
    payload: AlertRuleCreate,
    current_user: User = Depends(get_current_operator),
    db: AsyncSession = Depends(get_db),
):
    rule = await alert_service.create_rule(db, payload, user_id=current_user.id)
    detail = await alert_service.get_rule(db, rule.id)
    return make_response(detail.model_dump())


@router.get("/{rule_id}")
async def get_alert_rule(
    rule_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    detail = await alert_service.get_rule(db, rule_id)
    return make_response(detail.model_dump())


@router.patch("/{rule_id}")
async def update_alert_rule(
    rule_id: str,
    payload: AlertRuleUpdate,
    current_user: User = Depends(get_current_operator),
    db: AsyncSession = Depends(get_db),
):
    rule = await alert_service.update_rule(db, rule_id, payload)
    detail = await alert_service.get_rule(db, rule.id)
    return make_response(detail.model_dump())


@router.delete("/{rule_id}")
async def delete_alert_rule(
    rule_id: str, current_user: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)
):
    await alert_service.delete_rule(db, rule_id)
    return make_response({"message": f"Alert rule '{rule_id}' deleted successfully"})
