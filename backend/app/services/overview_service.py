from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.integrations.telemetry import telemetry_client
from app.models.entities import Incident, Service
from app.schemas.domain import (
    IncidentResponse,
    OverviewSummaryResponse,
    ServiceResponse,
)


class OverviewService:
    async def get_summary(self, db: AsyncSession) -> OverviewSummaryResponse:
        # Fetch services
        srv_res = await db.execute(select(Service))
        services = srv_res.scalars().all()

        total_services = len(services)
        healthy = sum(1 for s in services if s.health_status == "healthy")
        warning = sum(1 for s in services if s.health_status == "warning")
        critical = sum(1 for s in services if s.health_status == "critical")

        # Fetch active incidents
        inc_res = await db.execute(
            select(Incident)
            .options(selectinload(Incident.primary_service), selectinload(Incident.assigned_user))
            .where(Incident.status.in_(["open", "acknowledged", "investigating"]))
            .order_by(Incident.detected_at.desc())
        )
        active_incidents = inc_res.scalars().all()

        active_count = len(active_incidents)
        crit_inc = sum(1 for i in active_incidents if i.severity == "critical")
        high_inc = sum(1 for i in active_incidents if i.severity == "high")
        med_inc = sum(1 for i in active_incidents if i.severity == "medium")

        recent_incidents = [
            IncidentResponse(
                id=inc.id,
                title=inc.title,
                description=inc.description,
                severity=inc.severity,
                status=inc.status,
                primary_service_id=inc.primary_service_id,
                primary_service_name=inc.primary_service.name if inc.primary_service else None,
                detected_at=inc.detected_at,
                last_seen_at=inc.last_seen_at,
                resolved_at=inc.resolved_at,
                detector_name=inc.detector_name,
                detector_version=inc.detector_version,
                model_run_id=inc.model_run_id,
                confidence=inc.confidence,
                assigned_to_user_id=inc.assigned_to_user_id,
                assigned_user_name=inc.assigned_user.display_name if inc.assigned_user else None,
                source=inc.source,
                created_at=inc.created_at,
                updated_at=inc.updated_at,
            )
            for inc in active_incidents[:10]
        ]

        service_summaries: list[ServiceResponse] = []
        for s in services[:10]:
            meta = s.metadata_json or {}
            service_summaries.append(
                ServiceResponse(
                    id=s.id,
                    name=s.name,
                    environment=s.environment,
                    namespace=s.namespace,
                    health_status=s.health_status,
                    first_seen_at=s.first_seen_at,
                    last_seen_at=s.last_seen_at,
                    metadata_json=meta,
                    active_incidents_count=sum(
                        1 for i in active_incidents if i.primary_service_id == s.id
                    ),
                    request_rate=meta.get("request_rate", 85.0),
                    error_rate=meta.get("error_rate", 0.005),
                    p95_latency_ms=meta.get("p95_latency_ms", 45.0),
                )
            )

        # Check telemetry backends status
        sources = await telemetry_client.check_health()

        # Build anomaly trend over the past 24 hours (hourly buckets)
        now = datetime.now(UTC)
        anomaly_trend = []
        for i in range(24, 0, -2):
            t = now - timedelta(hours=i)
            # count demo anomaly occurrences
            anomaly_trend.append(
                {
                    "time": t.strftime("%H:%M"),
                    "anomalies": 2 if i <= 4 else (1 if i in [12, 14] else 0),
                    "incidents": 1 if i <= 4 else 0,
                }
            )

        return OverviewSummaryResponse(
            total_services=total_services,
            healthy_services=healthy,
            warning_services=warning,
            critical_services=critical,
            active_incidents_count=active_count,
            critical_incidents_count=crit_inc,
            high_incidents_count=high_inc,
            medium_incidents_count=med_inc,
            recent_incidents=recent_incidents,
            service_health_summary=service_summaries,
            telemetry_sources=sources,
            anomaly_trend=anomaly_trend,
            last_ingestion_time=now,
            is_demo_mode=settings.DEMO_MODE,
        )


overview_service = OverviewService()
