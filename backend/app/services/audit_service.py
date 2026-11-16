from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import AuditEvent


class AuditService:
    async def log_event(
        self,
        db: AsyncSession,
        action: str,
        resource_type: str,
        resource_id: str,
        actor_user_id: str | None = None,
        request_id: str = "",
        details: dict[str, Any] | None = None,
    ) -> AuditEvent:
        event = AuditEvent(
            actor_user_id=actor_user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            request_id=request_id,
            details_json=details or {},
        )
        db.add(event)
        await db.commit()
        return event


audit_service = AuditService()
