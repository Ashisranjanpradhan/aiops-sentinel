from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import NotFoundError
from app.models.entities import DeploymentEvent, Incident
from app.schemas.domain import DeploymentResponse


class DeploymentService:
    async def list_deployments(
        self,
        db: AsyncSession,
        service_id: str | None = None,
        environment: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[DeploymentResponse], int]:
        query = select(DeploymentEvent).options(selectinload(DeploymentEvent.service))

        if service_id:
            query = query.where(DeploymentEvent.service_id == service_id)
        if environment:
            query = query.where(DeploymentEvent.environment == environment)

        count_query = select(func.count()).select_from(query.subquery())
        total_res = await db.execute(count_query)
        total = total_res.scalar_one()

        query = (
            query.order_by(DeploymentEvent.started_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await db.execute(query)
        deps = result.scalars().all()

        responses: list[DeploymentResponse] = []
        for d in deps:
            # Check correlated incidents (within +/- 30 minutes of deployment)
            inc_res = await db.execute(
                select(func.count())
                .select_from(Incident)
                .where(Incident.primary_service_id == d.service_id)
            )
            corr_count = inc_res.scalar_one()

            responses.append(
                DeploymentResponse(
                    id=d.id,
                    deployment_id=d.deployment_id,
                    service_id=d.service_id,
                    service_name=d.service.name if d.service else None,
                    environment=d.environment,
                    status=d.status,
                    commit_id=d.commit_id,
                    started_at=d.started_at,
                    completed_at=d.completed_at,
                    details_json=d.details_json or {},
                    correlated_incidents_count=corr_count,
                )
            )

        return responses, total

    async def get_deployment(self, db: AsyncSession, deployment_id: str) -> DeploymentResponse:
        result = await db.execute(
            select(DeploymentEvent)
            .where(DeploymentEvent.id == deployment_id)
            .options(selectinload(DeploymentEvent.service))
        )
        d = result.scalar_one_or_none()
        if not d:
            raise NotFoundError("Deployment", deployment_id)

        inc_res = await db.execute(
            select(func.count())
            .select_from(Incident)
            .where(Incident.primary_service_id == d.service_id)
        )
        corr_count = inc_res.scalar_one()

        return DeploymentResponse(
            id=d.id,
            deployment_id=d.deployment_id,
            service_id=d.service_id,
            service_name=d.service.name if d.service else None,
            environment=d.environment,
            status=d.status,
            commit_id=d.commit_id,
            started_at=d.started_at,
            completed_at=d.completed_at,
            details_json=d.details_json or {},
            correlated_incidents_count=corr_count,
        )


deployment_service = DeploymentService()
