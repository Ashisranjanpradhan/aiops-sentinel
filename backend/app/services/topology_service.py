from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import Incident, Service, ServiceEdge
from app.schemas.domain import TopologyEdge, TopologyNode, TopologyResponse


class TopologyService:
    async def get_topology(
        self, db: AsyncSession, environment: str | None = None
    ) -> TopologyResponse:
        srv_query = select(Service)
        if environment:
            srv_query = srv_query.where(Service.environment == environment)
        srv_res = await db.execute(srv_query)
        services = srv_res.scalars().all()
        service_map = {s.id: s for s in services}

        # Count active incidents per service
        inc_counts: dict[str, int] = {}
        inc_res = await db.execute(
            select(Incident.primary_service_id, func.count())
            .where(Incident.status.in_(["open", "acknowledged", "investigating"]))
            .group_by(Incident.primary_service_id)
        )
        for s_id, count in inc_res.all():
            inc_counts[s_id] = count

        nodes: list[TopologyNode] = []
        for s in services:
            meta = s.metadata_json or {}
            nodes.append(
                TopologyNode(
                    id=s.id,
                    name=s.name,
                    environment=s.environment,
                    health_status=s.health_status,
                    request_rate=float(meta.get("request_rate", 90.0)),
                    error_rate=float(meta.get("error_rate", 0.005)),
                    p95_latency_ms=float(meta.get("p95_latency_ms", 45.0)),
                    active_incidents=inc_counts.get(s.id, 0),
                )
            )

        edge_query = select(ServiceEdge)
        edge_res = await db.execute(edge_query)
        edges_db = edge_res.scalars().all()

        edges: list[TopologyEdge] = []
        for e in edges_db:
            if e.source_service_id in service_map and e.target_service_id in service_map:
                edges.append(
                    TopologyEdge(
                        id=e.id,
                        source=service_map[e.source_service_id].name,
                        target=service_map[e.target_service_id].name,
                        relationship=e.relationship_type,
                        call_volume=e.observed_calls,
                        error_rate=e.error_rate,
                        latency_ms=float(e.latency_summary_json.get("p50", 18.0)),
                        provenance=e.provenance,
                    )
                )

        now = datetime.now(UTC)
        return TopologyResponse(
            nodes=nodes,
            edges=edges,
            observed_window={"from": now.isoformat(), "provenance": "trace-derived"},
        )


topology_service = TopologyService()
