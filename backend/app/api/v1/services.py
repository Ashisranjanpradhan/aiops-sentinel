from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.response import make_response
from app.db.session import get_db
from app.integrations.telemetry import telemetry_client
from app.models.entities import User
from app.services.services_service import services_service

router = APIRouter(prefix="/services", tags=["Services"])


@router.get("")
async def list_services(
    search: str | None = Query(None),
    environment: str | None = Query(None),
    health_status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("name"),
    sort_order: str = Query("asc"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    services, total = await services_service.list_services(
        db=db,
        search=search,
        environment=environment,
        health_status=health_status,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return make_response(
        [s.model_dump() for s in services], page=page, page_size=page_size, total=total
    )


@router.get("/{service_id}")
async def get_service(
    service_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = await services_service.get_service(db, service_id)
    return make_response(service.model_dump())


@router.get("/{service_id}/metrics")
async def get_service_metrics(
    service_id: str,
    from_time: datetime | None = Query(None, alias="from"),
    to_time: datetime | None = Query(None, alias="to"),
    step: int = Query(60, ge=10, le=3600),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = await services_service.get_service(db, service_id)
    now = datetime.now(UTC)
    start = from_time or (now - timedelta(hours=3))
    end = to_time or now

    metrics = await telemetry_client.get_service_metrics(
        service_name=service.name, start_time=start, end_time=end, step_seconds=step
    )
    return make_response(
        {
            "service_id": service.id,
            "service_name": service.name,
            "metrics": {k: v.model_dump() for k, v in metrics.items()},
        }
    )


@router.get("/{service_id}/logs")
async def get_service_logs(
    service_id: str,
    limit: int = Query(50, ge=1, le=200),
    severity: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = await services_service.get_service(db, service_id)
    now = datetime.now(UTC)
    start = now - timedelta(hours=2)

    logs = await telemetry_client.get_service_logs(
        service_name=service.name,
        start_time=start,
        end_time=now,
        limit=limit,
        severity_filter=severity,
    )
    return make_response(
        {"service_id": service.id, "logs": [l.model_dump() for l in logs], "total_count": len(logs)}
    )


@router.get("/{service_id}/traces")
async def get_service_traces(
    service_id: str,
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = await services_service.get_service(db, service_id)
    now = datetime.now(UTC)
    start = now - timedelta(hours=2)

    traces = await telemetry_client.get_service_traces(
        service_name=service.name, start_time=start, end_time=now, limit=limit
    )
    return make_response(
        {
            "service_id": service.id,
            "traces": [t.model_dump() for t in traces],
            "total_count": len(traces),
        }
    )
