from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ConflictError, NotFoundError
from app.models.entities import AlertRule
from app.schemas.domain import AlertRuleCreate, AlertRuleResponse, AlertRuleUpdate


class AlertService:
    async def list_rules(
        self, db: AsyncSession, page: int = 1, page_size: int = 20
    ) -> tuple[list[AlertRuleResponse], int]:
        count_res = await db.execute(select(func.count()).select_from(AlertRule))
        total = count_res.scalar_one()

        query = (
            select(AlertRule)
            .order_by(AlertRule.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await db.execute(query)
        rules = result.scalars().all()

        responses = [
            AlertRuleResponse(
                id=r.id,
                name=r.name,
                description=r.description,
                service_scope_json=r.service_scope_json or [],
                condition_json=r.condition_json or {},
                severity=r.severity,
                evaluation_interval_seconds=r.evaluation_interval_seconds,
                is_enabled=r.is_enabled,
                created_by_user_id=r.created_by_user_id,
                created_at=r.created_at,
                updated_at=r.updated_at,
            )
            for r in rules
        ]
        return responses, total

    async def get_rule(self, db: AsyncSession, rule_id: str) -> AlertRuleResponse:
        result = await db.execute(select(AlertRule).where(AlertRule.id == rule_id))
        r = result.scalar_one_or_none()
        if not r:
            raise NotFoundError("AlertRule", rule_id)

        return AlertRuleResponse(
            id=r.id,
            name=r.name,
            description=r.description,
            service_scope_json=r.service_scope_json or [],
            condition_json=r.condition_json or {},
            severity=r.severity,
            evaluation_interval_seconds=r.evaluation_interval_seconds,
            is_enabled=r.is_enabled,
            created_by_user_id=r.created_by_user_id,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )

    async def create_rule(
        self, db: AsyncSession, data: AlertRuleCreate, user_id: str | None = None
    ) -> AlertRule:
        # Check name uniqueness
        existing = await db.execute(select(AlertRule).where(AlertRule.name == data.name.strip()))
        if existing.scalar_one_or_none():
            raise ConflictError(f"Alert rule with name '{data.name}' already exists.")

        rule = AlertRule(
            name=data.name.strip(),
            description=data.description,
            service_scope_json=data.service_scope_json,
            condition_json=data.condition_json,
            severity=data.severity,
            evaluation_interval_seconds=data.evaluation_interval_seconds,
            is_enabled=data.is_enabled,
            created_by_user_id=user_id,
        )
        db.add(rule)
        await db.commit()
        await db.refresh(rule)
        return rule

    async def update_rule(self, db: AsyncSession, rule_id: str, data: AlertRuleUpdate) -> AlertRule:
        result = await db.execute(select(AlertRule).where(AlertRule.id == rule_id))
        rule = result.scalar_one_or_none()
        if not rule:
            raise NotFoundError("AlertRule", rule_id)

        if data.name is not None and data.name.strip() != rule.name:
            existing = await db.execute(
                select(AlertRule).where(AlertRule.name == data.name.strip())
            )
            if existing.scalar_one_or_none():
                raise ConflictError(f"Alert rule with name '{data.name}' already exists.")
            rule.name = data.name.strip()

        if data.description is not None:
            rule.description = data.description
        if data.service_scope_json is not None:
            rule.service_scope_json = data.service_scope_json
        if data.condition_json is not None:
            rule.condition_json = data.condition_json
        if data.severity is not None:
            rule.severity = data.severity
        if data.evaluation_interval_seconds is not None:
            rule.evaluation_interval_seconds = data.evaluation_interval_seconds
        if data.is_enabled is not None:
            rule.is_enabled = data.is_enabled

        rule.updated_at = datetime.now(UTC)
        await db.commit()
        await db.refresh(rule)
        return rule

    async def delete_rule(self, db: AsyncSession, rule_id: str) -> None:
        result = await db.execute(select(AlertRule).where(AlertRule.id == rule_id))
        rule = result.scalar_one_or_none()
        if not rule:
            raise NotFoundError("AlertRule", rule_id)

        await db.delete(rule)
        await db.commit()


alert_service = AlertService()
