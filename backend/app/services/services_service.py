from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError
from app.models.entities import Incident, Service
from app.schemas.domain import ServiceCreate, ServiceResponse


class ServicesService:
    async def list_services(
        self,
        db: AsyncSession,
        search: str | None = None,
        environment: str | None = None,
        health_status: str | None = None,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "name",
        sort_order: str = "asc",
    ) -> tuple[list[ServiceResponse], int]:
        query = select(Service)

        if search:
            query = query.where(Service.name.ilike(f"%{search.strip()}%"))
        if environment:
            query = query.where(Service.environment == environment)
        if health_status:
            query = query.where(Service.health_status == health_status)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_res = await db.execute(count_query)
        total = total_res.scalar_one()

        # Sorting
        sort_col = getattr(Service, sort_by, Service.name)
        if sort_order.lower() == "desc":
            query = query.order_by(sort_col.desc())
        else:
            query = query.order_by(sort_col.asc())

        # Pagination
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        services = result.scalars().all()

        responses: list[ServiceResponse] = []
        for s in services:
            # Count active incidents
            inc_res = await db.execute(
                select(func.count())
                .select_from(Incident)
                .where(
                    Incident.primary_service_id == s.id,
                    Incident.status.in_(["open", "acknowledged", "investigating"]),
                )
            )
            active_count = inc_res.scalar_one()

            # Dynamic telemetry indicators
            meta = s.metadata_json or {}
            responses.append(
                ServiceResponse(
                    id=s.id,
                    name=s.name,
                    environment=s.environment,
                    namespace=s.namespace,
                    health_status=s.health_status,
                    first_seen_at=s.first_seen_at,
                    last_seen_at=s.last_seen_at,
                    metadata_json=meta,
                    active_incidents_count=active_count,
                    request_rate=meta.get("request_rate", 85.0),
                    error_rate=meta.get("error_rate", 0.005),
                    p95_latency_ms=meta.get("p95_latency_ms", 45.0),
                )
            )

        return responses, total

    async def get_service(self, db: AsyncSession, service_id: str) -> ServiceResponse:
        result = await db.execute(select(Service).where(Service.id == service_id))
        s = result.scalar_one_or_none()
        if not s:
            raise NotFoundError("Service", service_id)

        inc_res = await db.execute(
            select(func.count())
            .select_from(Incident)
            .where(
                Incident.primary_service_id == s.id,
                Incident.status.in_(["open", "acknowledged", "investigating"]),
            )
        )
        active_count = inc_res.scalar_one()
        meta = s.metadata_json or {}

        return ServiceResponse(
            id=s.id,
            name=s.name,
            environment=s.environment,
            namespace=s.namespace,
            health_status=s.health_status,
            first_seen_at=s.first_seen_at,
            last_seen_at=s.last_seen_at,
            metadata_json=meta,
            active_incidents_count=active_count,
            request_rate=meta.get("request_rate", 85.0),
            error_rate=meta.get("error_rate", 0.005),
            p95_latency_ms=meta.get("p95_latency_ms", 45.0),
        )

    async def create_service(self, db: AsyncSession, data: ServiceCreate) -> Service:
        service = Service(
            name=data.name,
            environment=data.environment,
            namespace=data.namespace,
            health_status=data.health_status,
            metadata_json=data.metadata_json,
        )
        db.add(service)
        await db.commit()
        await db.refresh(service)
        return service


services_service = ServicesService()
