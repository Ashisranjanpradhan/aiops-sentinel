import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.entities import (
    AlertRule,
    AssessmentFinding,
    CodebaseAssessment,
    Dataset,
    DeploymentEvent,
    ExperimentRun,
    Incident,
    IncidentEvent,
    IncidentEvidence,
    InvestigationJob,
    RootCauseCandidate,
    Service,
    ServiceEdge,
    User,
)

logger = logging.getLogger(__name__)


async def seed_demo_data(db: AsyncSession, force: bool = False) -> dict[str, Any]:
    """Seed comprehensive demo microservices, topology, incidents, alerts, experiments,

    and codebase assessments to illuminate the dashboard with live feature statistics.
    """
    srv_count_res = await db.execute(select(func.count(Service.id)))
    srv_count = srv_count_res.scalar() or 0

    if srv_count > 0 and not force:
        logger.info(f"Database already contains {srv_count} services. Skipping seed.")
        return {"status": "skipped", "message": f"Database already has {srv_count} services"}

    now = datetime.now(UTC)

    # 1. Ensure Admin and Demo Users exist
    user_res = await db.execute(select(User).where(User.email == "admin@aiops.sentinel"))
    admin_user = user_res.scalar_one_or_none()
    if not admin_user:
        admin_user = User(
            email="admin@aiops.sentinel",
            display_name="Site Reliability Lead",
            password_hash=hash_password("SentinelAdmin1234!"),
            role="admin",
            is_active=True,
        )
        db.add(admin_user)
        await db.flush()

    demo_res = await db.execute(select(User).where(User.email == "demo@aiops.sentinel"))
    demo_user = demo_res.scalar_one_or_none()
    if not demo_user:
        demo_user = User(
            email="demo@aiops.sentinel",
            display_name="Demo Reviewer",
            password_hash=hash_password("SentinelDemo1234!"),
            role="viewer",
            is_active=True,
        )
        db.add(demo_user)
        await db.flush()

    # 2. Seed Microservices
    services_data = [
        ("frontend", "production", "healthy", 240.5, 0.002, 38.0, "Go", "HTTP / REST"),
        ("checkout", "production", "critical", 185.0, 0.125, 450.0, "Go", "gRPC / HTTP"),
        ("payment", "production", "critical", 145.0, 0.182, 620.0, "Go", "gRPC"),
        ("shipping", "production", "warning", 90.0, 0.040, 180.0, "Python", "FastAPI"),
        ("auth", "production", "healthy", 110.0, 0.001, 24.0, "Python", "FastAPI"),
        ("cart", "production", "healthy", 130.0, 0.003, 31.0, "Python", "FastAPI"),
        ("recommendation", "production", "healthy", 85.0, 0.001, 45.0, "Python", "FastAPI"),
        ("email", "production", "healthy", 40.0, 0.000, 15.0, "Python", "FastAPI"),
        ("ad", "production", "healthy", 95.0, 0.001, 18.0, "Go", "gRPC"),
        ("currency", "production", "healthy", 60.0, 0.000, 12.0, "Go", "gRPC"),
    ]

    services_map = {}
    for name, env, health, req_rate, err_rate, p95, lang, framework in services_data:
        s_res = await db.execute(select(Service).where(Service.name == name))
        srv = s_res.scalar_one_or_none()
        if not srv:
            srv = Service(
                name=name,
                environment=env,
                namespace="production-mesh",
                health_status=health,
                metadata_json={
                    "request_rate": req_rate,
                    "error_rate": err_rate,
                    "p95_latency_ms": p95,
                    "language": lang,
                    "framework": framework,
                    "version": "v2.1.4",
                    "replicas": 3,
                },
            )
            db.add(srv)
            await db.flush()
        services_map[name] = srv

    # 3. Seed Topology Edges
    edges_data = [
        ("frontend", "checkout", "calls", 18500, 0.08, 120.0),
        ("frontend", "recommendation", "calls", 14200, 0.001, 42.0),
        ("frontend", "ad", "calls", 12000, 0.001, 18.0),
        ("frontend", "cart", "calls", 16000, 0.002, 30.0),
        ("checkout", "payment", "calls", 14500, 0.18, 550.0),
        ("checkout", "shipping", "calls", 9000, 0.04, 180.0),
        ("checkout", "email", "calls", 8000, 0.000, 15.0),
        ("checkout", "currency", "calls", 12000, 0.000, 12.0),
        ("cart", "auth", "calls", 9500, 0.001, 22.0),
    ]

    for src, tgt, rel, calls, err, lat in edges_data:
        if src in services_map and tgt in services_map:
            src_id = services_map[src].id
            tgt_id = services_map[tgt].id
            edge_res = await db.execute(
                select(ServiceEdge).where(
                    ServiceEdge.source_service_id == src_id,
                    ServiceEdge.target_service_id == tgt_id,
                )
            )
            if not edge_res.scalar_one_or_none():
                edge = ServiceEdge(
                    source_service_id=src_id,
                    target_service_id=tgt_id,
                    relationship_type=rel,
                    observed_calls=calls,
                    error_rate=err,
                    latency_summary_json={
                        "p50": lat * 0.7,
                        "p95": lat,
                        "p99": lat * 1.4,
                    },
                    provenance="trace-derived",
                )
                db.add(edge)

    # 4. Seed Active Critical Incident with RWR Investigation
    checkout_srv = services_map.get("checkout")
    payment_srv = services_map.get("payment")

    inc_res = await db.execute(
        select(Incident).where(Incident.title.ilike("%Payment processing timeout%"))
    )
    incident = inc_res.scalar_one_or_none()
    if not incident and checkout_srv:
        incident = Incident(
            title="Payment processing timeout causing cascading checkout failures",
            description="Elevated error rates and p95 latency spike (>600ms) observed in checkout service following downstream payment timeouts.",
            severity="critical",
            status="open",
            primary_service_id=checkout_srv.id,
            detected_at=now - timedelta(minutes=35),
            last_seen_at=now,
            detector_name="robust_zscore",
            detector_version="1.0.0",
            confidence=0.89,
            assigned_to_user_id=admin_user.id,
            source="telemetry_alert",
        )
        db.add(incident)
        await db.flush()

        db.add(
            IncidentEvent(
                incident_id=incident.id,
                actor_user_id=admin_user.id,
                event_type="created",
                new_value_json={"status": "open", "severity": "critical"},
                reason="Anomaly threshold breached: checkout error rate > 5%",
            )
        )

        ev_metric = IncidentEvidence(
            incident_id=incident.id,
            evidence_type="metric",
            service_id=checkout_srv.id,
            source_reference="prometheus:rate(http_requests_total{status=~'5..'}[5m])",
            time_start=now - timedelta(minutes=35),
            time_end=now,
            summary_json={
                "metric_name": "error_rate",
                "observed_value": 0.125,
                "baseline_median": 0.005,
                "z_score": 4.8,
                "unit": "ratio",
            },
        )
        db.add(ev_metric)

        if payment_srv:
            ev_log = IncidentEvidence(
                incident_id=incident.id,
                evidence_type="log",
                service_id=payment_srv.id,
                source_reference="loki:{service='payment'} |= 'timeout'",
                time_start=now - timedelta(minutes=30),
                time_end=now,
                summary_json={
                    "severity": "CRITICAL",
                    "message": "Downstream connection timed out to postgres-primary:5432 after 5000ms",
                    "error_count": 52,
                },
            )
            db.add(ev_log)

            ev_trace = IncidentEvidence(
                incident_id=incident.id,
                evidence_type="trace",
                service_id=payment_srv.id,
                source_reference="tempo:trace_d9b40001",
                time_start=now - timedelta(minutes=25),
                time_end=now,
                summary_json={
                    "trace_id": "trace_d9b40001",
                    "status": "ERROR",
                    "duration_ms": 680.0,
                    "failing_span": "payment:charge",
                },
            )
            db.add(ev_trace)

        await db.flush()

        # Investigation Job with RWR candidates
        job = InvestigationJob(
            incident_id=incident.id,
            status="succeeded",
            progress=100,
            model_version="rca-rwr-v2.1",
            started_at=now - timedelta(minutes=20),
            completed_at=now - timedelta(minutes=19),
            result_reference="candidates_2",
        )
        db.add(job)
        await db.flush()

        if payment_srv:
            db.add(
                RootCauseCandidate(
                    investigation_job_id=job.id,
                    service_id=payment_srv.id,
                    rank=1,
                    score=0.94,
                    calibrated_confidence=0.89,
                    candidate_indicator="database_connection_timeout",
                    explanation="Payment service experienced persistent DB connection timeouts, propagating 504 errors up to Checkout.",
                    evidence_ids=[ev_metric.id],
                )
            )

        db.add(
            RootCauseCandidate(
                investigation_job_id=job.id,
                service_id=checkout_srv.id,
                rank=2,
                score=0.68,
                calibrated_confidence=0.62,
                candidate_indicator="downstream_call_backpressure",
                explanation="Checkout thread pool saturation due to unhandled retry storms.",
                evidence_ids=[ev_metric.id],
            )
        )

    # 5. Seed Historical Resolved Incident for MTTR statistics
    auth_srv = services_map.get("auth")
    inc_hist_res = await db.execute(
        select(Incident).where(Incident.title.ilike("%Token validation latency%"))
    )
    if not inc_hist_res.scalar_one_or_none() and auth_srv:
        resolved_inc = Incident(
            title="Token validation latency elevation on auth microservice",
            description="JWKS verification cache miss caused p95 latency to increase to 180ms.",
            severity="medium",
            status="resolved",
            primary_service_id=auth_srv.id,
            detected_at=now - timedelta(hours=3),
            last_seen_at=now - timedelta(hours=2, minutes=32),
            detector_name="ewma_shift",
            detector_version="1.0.0",
            confidence=0.92,
            assigned_to_user_id=admin_user.id,
            source="telemetry_alert",
        )
        db.add(resolved_inc)
        await db.flush()

        db.add(
            IncidentEvent(
                incident_id=resolved_inc.id,
                actor_user_id=admin_user.id,
                event_type="resolved",
                new_value_json={"status": "resolved"},
                reason="JWKS cache refreshed via clear_cache runbook (MTTR 28m)",
            )
        )

    # 6. Seed Deployments (DeployGuard)
    if payment_srv:
        dep_res = await db.execute(
            select(DeploymentEvent).where(DeploymentEvent.deployment_id == "deploy-v2.1.4")
        )
        if not dep_res.scalar_one_or_none():
            db.add(
                DeploymentEvent(
                    deployment_id="deploy-v2.1.4",
                    service_id=payment_srv.id,
                    environment="production",
                    status="success",
                    commit_id="git-8a12c3f",
                    started_at=now - timedelta(minutes=60),
                    completed_at=now - timedelta(minutes=55),
                    details_json={
                        "deployed_by": "github-actions-ci",
                        "version": "v2.1.4",
                        "canary_passed": True,
                        "error_budget_consumed_pct": 2.1,
                    },
                )
            )

    # 7. Seed Alert Rules
    alert_res = await db.execute(select(AlertRule).where(AlertRule.name == "Checkout Service Error Rate High"))
    if not alert_res.scalar_one_or_none():
        db.add(
            AlertRule(
                name="Checkout Service Error Rate High",
                description="Triggers when HTTP 5xx error rate exceeds 5% over 2 minutes.",
                service_scope_json=["checkout"],
                condition_json={
                    "metric": "error_rate",
                    "operator": ">",
                    "threshold": 0.05,
                    "window_seconds": 120,
                },
                severity="critical",
                evaluation_interval_seconds=60,
                is_enabled=True,
                created_by_user_id=admin_user.id,
            )
        )
        db.add(
            AlertRule(
                name="Payment Service Latency Spike",
                description="Triggers when p95 latency exceeds 500ms.",
                service_scope_json=["payment"],
                condition_json={
                    "metric": "p95_latency",
                    "operator": ">",
                    "threshold": 500.0,
                    "window_seconds": 180,
                },
                severity="high",
                evaluation_interval_seconds=60,
                is_enabled=True,
                created_by_user_id=admin_user.id,
            )
        )

    # 8. Seed Dataset (RCAEval)
    ds_res = await db.execute(select(Dataset).where(Dataset.name == "RCAEval"))
    if not ds_res.scalar_one_or_none():
        db.add(
            Dataset(
                name="RCAEval",
                version="1.0.0",
                source_url="https://github.com/phamquiluan/RCAEval",
                license_note="Research benchmark dataset. Attribution required.",
                usage_restrictions="Non-commercial research evaluation.",
                modalities_json=["metrics", "logs", "traces"],
                checksum_manifest="sha256:d8a2305e94b21008f1b6a21",
                status="ready",
                manifest_path="manifests/rcaeval_manifest.json",
                validated_at=now,
            )
        )

    # 9. Seed Machine Learning Benchmark Experiments
    exp_res = await db.execute(
        select(ExperimentRun).where(ExperimentRun.experiment_name == "Robust-ZScore-RCAEval-RE1")
    )
    if not exp_res.scalar_one_or_none():
        db.add(
            ExperimentRun(
                experiment_name="Robust-ZScore-RCAEval-RE1",
                model_name="robust_zscore",
                model_version="1.0.0",
                split_manifest_path="manifests/rcaeval_split_seed42.json",
                config_json={"threshold": 3.5, "window_size": 20},
                metrics_json={
                    "top_1_accuracy": 0.683,
                    "top_3_accuracy": 0.867,
                    "top_5_accuracy": 0.933,
                    "mrr": 0.784,
                    "precision": 0.782,
                    "recall": 0.814,
                    "f1": 0.798,
                },
                artifact_uri="artifacts/runs/robust_zscore_seed42.tar.gz",
                status="completed",
                seed=42,
                started_at=now - timedelta(days=1),
                completed_at=now - timedelta(days=1) + timedelta(minutes=14),
            )
        )
        db.add(
            ExperimentRun(
                experiment_name="Isolation-Forest-Multivariate",
                model_name="isolation_forest",
                model_version="1.2.0",
                split_manifest_path="manifests/rcaeval_split_seed42.json",
                config_json={"contamination": 0.05, "n_estimators": 100},
                metrics_json={
                    "top_1_accuracy": 0.625,
                    "top_3_accuracy": 0.812,
                    "top_5_accuracy": 0.894,
                    "mrr": 0.718,
                    "precision": 0.730,
                    "recall": 0.765,
                    "f1": 0.747,
                },
                artifact_uri="artifacts/runs/isolation_forest_seed42.tar.gz",
                status="completed",
                seed=42,
                started_at=now - timedelta(days=2),
                completed_at=now - timedelta(days=2) + timedelta(minutes=18),
            )
        )

    # 10. Seed ArchMind Codebase Assessment
    cb_res = await db.execute(
        select(CodebaseAssessment).where(CodebaseAssessment.project_name == "ecommerce-platform-core")
    )
    if not cb_res.scalar_one_or_none():
        assessment = CodebaseAssessment(
            project_name="ecommerce-platform-core",
            source_type="zip",
            source_size_bytes=1843200,
            file_count=142,
            primary_languages_json=[
                {"name": "Python", "percentage": 65.0, "lines": 8420},
                {"name": "TypeScript", "percentage": 25.0, "lines": 3240},
                {"name": "Go", "percentage": 10.0, "lines": 1300},
            ],
            frameworks_json=["FastAPI", "Next.js", "SQLAlchemy", "AsyncPG"],
            overall_score=84.5,
            readiness_level="ACCEPTABLE",
            dimension_scores_json={
                "security": 88.0,
                "scalability": 82.0,
                "observability": 85.0,
                "resilience": 79.0,
                "dependency_risk": 92.0,
                "performance": 84.0,
                "maintainability": 86.0,
                "compliance": 90.0,
                "api_design": 88.0,
                "reliability": 81.0,
            },
            summary="Production readiness evaluation for ecommerce-platform-core microservice stack. Demonstrates high standards for security boundaries and dependency hygiene. Resilience requires circuit breakers on checkout RPC calls.",
            recommendations_json=[
                {
                    "priority": "HIGH",
                    "title": "Implement circuit breaker on downstream payment gRPC calls",
                    "dimension": "resilience",
                },
                {
                    "priority": "MEDIUM",
                    "title": "Add pagination limits to audit event list queries",
                    "dimension": "performance",
                },
                {
                    "priority": "LOW",
                    "title": "Propagate W3C traceparent headers across background Celery tasks",
                    "dimension": "observability",
                },
            ],
            created_by_user_id=admin_user.id,
            created_at=now - timedelta(days=1),
        )
        db.add(assessment)
        await db.flush()

        # Seed sample findings
        db.add(
            AssessmentFinding(
                assessment_id=assessment.id,
                dimension="security",
                rule_id="SEC-004",
                title="Potential hardcoded secret fallback in config test harness",
                description="Default development secret key used when ENVIRONMENT is set to 'development'. Ensure production checks enforce secret presence.",
                severity="medium",
                file_path="app/core/config.py",
                line_number=42,
                evidence_snippet='SECRET_KEY = os.getenv("SECRET_KEY", "dev-insecure-key-1234")',
                remediation_advice="Enforce fail-fast configuration validation raising ValueError when SECRET_KEY is missing in non-dev environments.",
            )
        )
        db.add(
            AssessmentFinding(
                assessment_id=assessment.id,
                dimension="resilience",
                rule_id="RES-002",
                title="Missing circuit breaker on synchronous external payment gateway call",
                description="Direct network call to payment provider lacks timeout wrapping and exponential backoff retry.",
                severity="high",
                file_path="app/services/payment_client.py",
                line_number=88,
                evidence_snippet="response = requests.post(gateway_url, json=payload)",
                remediation_advice="Wrap downstream gateway calls with a circuit breaker pattern (e.g., Tenacity or PyBreaker) with maximum 3s timeout.",
            )
        )

    await db.commit()
    logger.info("Demo data seeding completed successfully.")
    return {
        "status": "success",
        "services_count": len(services_data),
        "edges_count": len(edges_data),
        "incidents_count": 2,
        "experiments_count": 2,
        "assessments_count": 1,
    }
