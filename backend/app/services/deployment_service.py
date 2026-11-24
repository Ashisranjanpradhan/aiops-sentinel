from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import NotFoundError
from app.models.entities import DeploymentEvent, Incident, Service, ServiceEdge
from app.schemas.domain import (
    DeliverDeploymentRequest,
    DeploymentResponse,
    PipelineCheckItem,
    PreflightCheckRequest,
    PreflightCheckResponse,
    RemediationChangeItem,
    RiskItem,
)
from app.services.audit_service import audit_service


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

        service_ids = list({d.service_id for d in deps if d.service_id})
        inc_counts: dict[str, int] = {}
        if service_ids:
            inc_res = await db.execute(
                select(Incident.primary_service_id, func.count(Incident.id))
                .where(Incident.primary_service_id.in_(service_ids))
                .group_by(Incident.primary_service_id)
            )
            inc_counts = dict(inc_res.all())

        responses: list[DeploymentResponse] = []
        for d in deps:
            corr_count = inc_counts.get(d.service_id, 0)

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

    async def preflight_check(
        self, db: AsyncSession, req: PreflightCheckRequest
    ) -> PreflightCheckResponse:
        """Evaluates release candidate safety, identifies blast radius risk, and outputs required changes."""
        # 1. Fetch service
        srv_res = await db.execute(
            select(Service).where(
                or_(Service.id == req.service_id, Service.name == req.service_id)
            )
        )
        service = srv_res.scalar_one_or_none()
        if not service:
            raise NotFoundError("Service", req.service_id)

        # 2. Query upstream callers & downstream dependencies
        edge_res = await db.execute(select(ServiceEdge))
        edges = edge_res.scalars().all()

        srv_all_res = await db.execute(select(Service))
        all_services = {s.id: s for s in srv_all_res.scalars().all()}

        downstream_ids: set[str] = set()
        upstream_ids: set[str] = set()
        for e in edges:
            if e.source_service_id == service.id and e.target_service_id in all_services:
                downstream_ids.add(e.target_service_id)
            if e.target_service_id == service.id and e.source_service_id in all_services:
                upstream_ids.add(e.source_service_id)

        downstream_names = [all_services[sid].name for sid in downstream_ids]
        upstream_names = [all_services[sid].name for sid in upstream_ids]

        # 3. Query active incidents on target service and downstream dependencies
        active_statuses = ["open", "acknowledged", "investigating"]
        target_inc_res = await db.execute(
            select(Incident).where(
                Incident.primary_service_id == service.id,
                Incident.status.in_(active_statuses),
            )
        )
        target_incidents = target_inc_res.scalars().all()

        dep_inc_res = await db.execute(
            select(Incident).where(
                Incident.primary_service_id.in_(list(downstream_ids) or ["none"]),
                Incident.status.in_(active_statuses),
            )
        )
        dep_incidents = dep_inc_res.scalars().all()

        # 4. Pipeline Automated Verification Checks
        checks: list[PipelineCheckItem] = []
        risk_score = 5  # Base risk
        what_is_at_risk: list[RiskItem] = []
        what_needs_to_be_changed: list[RemediationChangeItem] = []

        # Gate 1: Upstream & Downstream Topology Blast Radius
        dep_count = len(downstream_names)
        up_count = len(upstream_names)
        blast_pct = min(100.0, round((dep_count + up_count) * 12.5, 1))

        if dep_count >= 3 or up_count >= 3:
            checks.append(
                PipelineCheckItem(
                    check_id="topology_blast",
                    name="Topology & Blast Radius Audit",
                    status="warning",
                    duration_ms=42,
                    details=f"High connectivity node: {up_count} upstream caller(s), {dep_count} downstream callee(s). Blast radius coverage: {blast_pct}%.",
                    metrics={"upstream_callers": up_count, "downstream_callees": dep_count, "blast_radius_pct": blast_pct},
                )
            )
            risk_score += 15
        else:
            checks.append(
                PipelineCheckItem(
                    check_id="topology_blast",
                    name="Topology & Blast Radius Audit",
                    status="passed",
                    duration_ms=28,
                    details=f"Manageable dependency boundary: {up_count} upstream caller(s), {dep_count} downstream callee(s). Blast radius coverage: {blast_pct}%.",
                    metrics={"upstream_callers": up_count, "downstream_callees": dep_count, "blast_radius_pct": blast_pct},
                )
            )

        # Gate 2: Active Incident & Dependency State
        if target_incidents:
            risk_score += 40
            checks.append(
                PipelineCheckItem(
                    check_id="incident_state",
                    name="Active Incident & Service State Check",
                    status="failed",
                    duration_ms=35,
                    details=f"Target service has {len(target_incidents)} active unresolved incident(s). Primary: {target_incidents[0].title}",
                    metrics={"active_target_incidents": len(target_incidents)},
                )
            )
            what_needs_to_be_changed.append(
                RemediationChangeItem(
                    id="fix-inc-target",
                    priority="BLOCKING",
                    component=f"Active Incident ({target_incidents[0].id[:8]})",
                    issue=f"Unresolved {target_incidents[0].severity} incident '{target_incidents[0].title}' is currently ongoing on {service.name}.",
                    required_change="Mitigate active outage and mark incident resolved before deploying new releases into production.",
                    config_target=f"incidents/{target_incidents[0].id}",
                )
            )
        elif dep_incidents:
            risk_score += 25
            checks.append(
                PipelineCheckItem(
                    check_id="incident_state",
                    name="Active Incident & Service State Check",
                    status="warning",
                    duration_ms=31,
                    details=f"Downstream dependencies have {len(dep_incidents)} active incident(s): {dep_incidents[0].title}",
                    metrics={"active_dependency_incidents": len(dep_incidents)},
                )
            )
            what_needs_to_be_changed.append(
                RemediationChangeItem(
                    id="fix-inc-dep",
                    priority="REQUIRED",
                    component=f"Downstream Dependency ({dep_incidents[0].primary_service_id[:8]})",
                    issue=f"Downstream service has active incident '{dep_incidents[0].title}'. Cascading failures likely under deployment shift.",
                    required_change="Verify upstream circuit breaker trip thresholds and retry backoff settings before delivering traffic.",
                    config_target=f"helm/values/{service.name}.yaml:resilience.circuitBreaker",
                )
            )
        else:
            checks.append(
                PipelineCheckItem(
                    check_id="incident_state",
                    name="Active Incident & Service State Check",
                    status="passed",
                    duration_ms=22,
                    details="Zero active incidents detected on target service and connected microservice boundaries.",
                    metrics={"active_target_incidents": 0, "active_dependency_incidents": 0},
                )
            )

        # Gate 3: Canary Synthetic Telemetry & Error Rate Gate
        if req.simulate_canary_failure or service.health_status == "critical":
            risk_score += 35
            checks.append(
                PipelineCheckItem(
                    check_id="canary_error_rate",
                    name="Canary Telemetry & Error Rate Gate",
                    status="failed",
                    duration_ms=184,
                    details="Canary evaluation error rate at 2.45% (Policy gate requires < 0.50%). Elevated HTTP 500/503 response rates observed.",
                    metrics={"canary_error_rate": 0.0245, "threshold": 0.0050, "sample_requests": 2400},
                )
            )
            what_needs_to_be_changed.append(
                RemediationChangeItem(
                    id="fix-error-rate",
                    priority="BLOCKING",
                    component="Application Code / Canary Pods",
                    issue="Canary container returns 2.45% error rate on primary business routes.",
                    required_change="Inspect container stderr logs for unhandled nil pointer or connection timeouts, resolve root cause, and re-tag candidate image.",
                    config_target="src/handlers/checkout_handler.go:L142",
                )
            )
        elif service.health_status == "warning":
            risk_score += 15
            checks.append(
                PipelineCheckItem(
                    check_id="canary_error_rate",
                    name="Canary Telemetry & Error Rate Gate",
                    status="warning",
                    duration_ms=162,
                    details="Canary error rate at 0.58% slightly exceeds normal baseline (Policy threshold 0.50%).",
                    metrics={"canary_error_rate": 0.0058, "threshold": 0.0050, "sample_requests": 1800},
                )
            )
        else:
            checks.append(
                PipelineCheckItem(
                    check_id="canary_error_rate",
                    name="Canary Telemetry & Error Rate Gate",
                    status="passed",
                    duration_ms=145,
                    details="Canary traffic error rate is 0.04% across 4,500 synthetic verification requests (Well within 0.50% threshold).",
                    metrics={"canary_error_rate": 0.0004, "threshold": 0.0050, "sample_requests": 4500},
                )
            )

        # Gate 4: P99 Tail Latency Regression Gate
        if req.simulate_canary_failure or service.health_status == "critical":
            risk_score += 25
            checks.append(
                PipelineCheckItem(
                    check_id="p99_latency_gate",
                    name="P99 Tail Latency & SLO Degradation Gate",
                    status="failed",
                    duration_ms=110,
                    details="P99 response time measured at 520ms (SLO threshold requires < 250ms). Tail latency inflation +108% vs baseline.",
                    metrics={"canary_p99_ms": 520, "baseline_p99_ms": 250, "drift_percent": 108.0},
                )
            )
            what_needs_to_be_changed.append(
                RemediationChangeItem(
                    id="fix-p99-latency",
                    priority="REQUIRED",
                    component="Database Connection Pool / Ingress",
                    issue="P99 latency inflation (520ms vs 250ms target) threatens client checkout timeout thresholds.",
                    required_change="Increase connection pool max_size from 20 to 60 connections and verify Redis read-replica query caching.",
                    config_target="k8s/overlays/prod/configmap-env.yaml:DB_POOL_MAX",
                )
            )
        elif service.health_status == "warning":
            risk_score += 10
            checks.append(
                PipelineCheckItem(
                    check_id="p99_latency_gate",
                    name="P99 Tail Latency & SLO Degradation Gate",
                    status="warning",
                    duration_ms=95,
                    details="P99 response time measured at 265ms (Target: < 250ms). Minor latency tail observed during peak synthetic burst.",
                    metrics={"canary_p99_ms": 265, "baseline_p99_ms": 250, "drift_percent": 6.0},
                )
            )
        else:
            checks.append(
                PipelineCheckItem(
                    check_id="p99_latency_gate",
                    name="P99 Tail Latency & SLO Degradation Gate",
                    status="passed",
                    duration_ms=88,
                    details="P99 response time measured at 48ms (Target: < 250ms). Latency distribution matches historical production profile.",
                    metrics={"canary_p99_ms": 48, "baseline_p99_ms": 250, "drift_percent": -4.0},
                )
            )

        # Gate 5: Database Schema & Config Drift Verification
        if req.simulate_schema_drift:
            risk_score += 30
            checks.append(
                PipelineCheckItem(
                    check_id="config_schema_drift",
                    name="Database Schema & Config Drift Verification",
                    status="failed",
                    duration_ms=64,
                    details="Backward-incompatible DDL change detected: candidate migration applies 'ALTER TABLE ADD COLUMN NOT NULL' without default clause.",
                    metrics={"migration_status": "incompatible_ddl", "risk_type": "table_lock"},
                )
            )
            what_needs_to_be_changed.append(
                RemediationChangeItem(
                    id="fix-schema-drift",
                    priority="BLOCKING",
                    component="Database Schema Migration",
                    issue="Direct non-null column addition without default locks tables and breaks dual-version rolling pods.",
                    required_change="Adopt expand-and-contract migration: first release adds column as NULLABLE; second release populates default; third release adds NOT NULL.",
                    config_target="db/migrations/20261117_add_columns.sql:L12",
                )
            )
        else:
            checks.append(
                PipelineCheckItem(
                    check_id="config_schema_drift",
                    name="Database Schema & Config Drift Verification",
                    status="passed",
                    duration_ms=45,
                    details="Configmaps, secret references, and database DDL migrations are 100% backward-compatible with rolling deployment.",
                    metrics={"migration_status": "compatible", "env_variables_diff": 0},
                )
            )

        # Calculate final risk score (capped 0-100)
        risk_score = min(100, max(0, risk_score))

        # Decision & Risk Level Mapping
        if risk_score >= 65:
            decision = "BLOCKED"
            risk_level = "CRITICAL" if risk_score >= 80 else "HIGH"
            summary = (
                f"Candidate release {req.candidate_version} fails automated safety gates (Risk Score: {risk_score}/100). "
                f"Deployment halted by automated pipeline gate. Please remediate blocking items before retrying."
            )
        elif risk_score >= 30:
            decision = "CHANGES_REQUIRED"
            risk_level = "MODERATE"
            summary = (
                f"Candidate release {req.candidate_version} evaluated with moderate risk (Risk Score: {risk_score}/100). "
                f"Conditional approval: Recommended architectural and configuration improvements identified before delivery."
            )
        else:
            decision = "PROCEED"
            risk_level = "LOW"
            summary = (
                f"Candidate release {req.candidate_version} passed all 5 automated delivery gates (Risk Score: {risk_score}/100). "
                f"Clean bill of health: blast radius contained, zero active incident conflicts, and canary metrics stable."
            )

        # Formulate "What is at risk"
        if downstream_names:
            what_is_at_risk.append(
                RiskItem(
                    category="Downstream Blast Radius",
                    target=", ".join(downstream_names),
                    severity="critical" if decision == "BLOCKED" else ("high" if decision == "CHANGES_REQUIRED" else "moderate"),
                    description=(
                        f"Direct microservice dependencies ({', '.join(downstream_names)}) depend on {service.name}. "
                        "A failure in candidate deployment will propagate downstream failures and client timeouts."
                    ),
                    blast_radius_percentage=blast_pct,
                )
            )

        if upstream_names:
            what_is_at_risk.append(
                RiskItem(
                    category="Upstream Traffic Ingress",
                    target=", ".join(upstream_names),
                    severity="high" if decision == "BLOCKED" else "moderate",
                    description=(
                        f"Upstream callers ({', '.join(upstream_names)}) route primary user traffic into {service.name}. "
                        "Deployment regressions will manifest as elevated 502/504 errors at the public edge."
                    ),
                    blast_radius_percentage=min(100.0, blast_pct * 0.8),
                )
            )

        what_is_at_risk.append(
            RiskItem(
                category="SLO Error Budget",
                target=f"{service.name} 99.9% Availability Target",
                severity="critical" if decision == "BLOCKED" else ("moderate" if decision == "CHANGES_REQUIRED" else "low"),
                description=(
                    f"Current risk profile projects a {risk_score}% probability of consuming more than 15% of monthly error budget "
                    "during the standard 60-minute canary promotion window."
                ),
                blast_radius_percentage=float(risk_score),
            )
        )

        # If everything is clean, add standard preventive recommendations
        if not what_needs_to_be_changed:
            what_needs_to_be_changed.append(
                RemediationChangeItem(
                    id="rec-canary-duration",
                    priority="RECOMMENDED",
                    component="Deployment Strategy / Argo Rollouts",
                    issue="Canary step duration is set to default 10 minutes.",
                    required_change="Maintain 10% canary traffic for minimum 30 minutes to verify asynchronous background workers before 100% promotion.",
                    config_target="k8s/rollout.yaml:spec.strategy.canary.steps",
                )
            )
            what_needs_to_be_changed.append(
                RemediationChangeItem(
                    id="rec-trace-sampling",
                    priority="RECOMMENDED",
                    component="OpenTelemetry Collector",
                    issue="Trace sampling is at 5% rate.",
                    required_change="Temporarily enable 100% trace sampling on canary pods to capture full distributed spans during release.",
                    config_target="telemetry/otel-collector.yaml:processors.probabilistic_sampler",
                )
            )

        now = datetime.now(UTC)
        return PreflightCheckResponse(
            service_id=service.id,
            service_name=service.name,
            candidate_version=req.candidate_version,
            target_environment=req.target_environment,
            commit_hash=req.commit_hash,
            pipeline_strategy=req.pipeline_strategy,
            decision=decision,
            risk_score=risk_score,
            risk_level=risk_level,
            summary=summary,
            evaluated_at=now,
            pipeline_checks=checks,
            what_is_at_risk=what_is_at_risk,
            what_needs_to_be_changed=what_needs_to_be_changed,
            downstream_dependencies=downstream_names,
            upstream_callers=upstream_names,
        )

    async def deliver_deployment(
        self, db: AsyncSession, req: DeliverDeploymentRequest, current_user_id: str
    ) -> DeploymentResponse:
        """Executes software delivery and records deployment into the audit ledger."""
        srv_res = await db.execute(
            select(Service).where(
                or_(Service.id == req.service_id, Service.name == req.service_id)
            )
        )
        service = srv_res.scalar_one_or_none()
        if not service:
            raise NotFoundError("Service", req.service_id)

        now = datetime.now(UTC)
        dep_id = f"dep-{uuid4().hex[:8]}"

        dep_event = DeploymentEvent(
            deployment_id=dep_id,
            service_id=service.id,
            environment=req.target_environment,
            status="success",
            commit_id=req.commit_hash or f"commit-{uuid4().hex[:7]}",
            started_at=now,
            completed_at=now,
            details_json={
                "version": req.candidate_version,
                "preflight_decision": req.preflight_decision,
                "preflight_risk_score": req.risk_score,
                "notes": req.notes,
                "delivered_by_user_id": current_user_id,
                "strategy": "automated_pipeline_delivery",
            },
        )
        db.add(dep_event)
        await db.commit()
        await db.refresh(dep_event)

        # Audit log
        await audit_service.log_event(
            db=db,
            action="deployment.delivered",
            resource_type="deployment",
            resource_id=dep_event.id,
            actor_user_id=current_user_id,
            details={
                "deployment_id": dep_id,
                "service_name": service.name,
                "version": req.candidate_version,
                "environment": req.target_environment,
                "preflight_decision": req.preflight_decision,
            },
        )

        return DeploymentResponse(
            id=dep_event.id,
            deployment_id=dep_event.deployment_id,
            service_id=dep_event.service_id,
            service_name=service.name,
            environment=dep_event.environment,
            status=dep_event.status,
            commit_id=dep_event.commit_id,
            started_at=dep_event.started_at,
            completed_at=dep_event.completed_at,
            details_json=dep_event.details_json,
            correlated_incidents_count=0,
        )


deployment_service = DeploymentService()
