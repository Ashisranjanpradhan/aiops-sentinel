import asyncio
import os
import sys
from datetime import UTC, datetime, timedelta

# Add backend directory to sys.path
sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
)

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import AsyncSessionLocal, init_db
from app.models.entities import (
    AlertRule,
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
from sqlalchemy import select


async def seed():
    env = getattr(settings, "APP_ENV", getattr(settings, "ENVIRONMENT", "development"))
    if env.lower() in ("production", "staging"):
        print(
            "SECURITY ABORT: Refusing to seed default development accounts in production or staging environment."
        )
        sys.exit(1)

    print("Initializing database tables...")
    await init_db()

    async with AsyncSessionLocal() as db:
        # 1. Seed default user
        user_res = await db.execute(
            select(User).where(User.email == "admin@aiops.sentinel")
        )
        admin_user = user_res.scalar_one_or_none()
        if not admin_user:
            print("Creating default admin user: admin@aiops.sentinel")
            admin_user = User(
                email="admin@aiops.sentinel",
                display_name="Site Reliability Lead",
                password_hash=hash_password("sentinel-admin-1234"),
                role="admin",
                is_active=True,
            )
            db.add(admin_user)
            await db.flush()
        else:
            print("Updating admin user password...")
            admin_user.password_hash = hash_password("sentinel-admin-1234")
            await db.flush()

        # Seed read-only demo reviewer user
        demo_res = await db.execute(
            select(User).where(User.email == "demo@aiops.sentinel")
        )
        demo_user = demo_res.scalar_one_or_none()
        if not demo_user:
            print("Creating read-only demo user: demo@aiops.sentinel")
            demo_user = User(
                email="demo@aiops.sentinel",
                display_name="Demo Reviewer",
                password_hash=hash_password("SentinelDemo1234!"),
                role="viewer",
                is_active=True,
            )
            db.add(demo_user)
            await db.flush()
        else:
            demo_user.password_hash = hash_password("SentinelDemo1234!")
            await db.flush()

        # 2. Seed microservices
        services_data = [
            ("frontend", "production", "healthy", 240.5, 0.002, 38.0),
            ("checkout", "production", "critical", 185.0, 0.125, 450.0),
            ("payment", "production", "critical", 145.0, 0.182, 620.0),
            ("shipping", "production", "warning", 90.0, 0.040, 180.0),
            ("auth", "production", "healthy", 110.0, 0.001, 24.0),
            ("cart", "production", "healthy", 130.0, 0.003, 31.0),
            ("recommendation", "production", "healthy", 85.0, 0.001, 45.0),
            ("email", "production", "healthy", 40.0, 0.000, 15.0),
            ("ad", "production", "healthy", 95.0, 0.001, 18.0),
            ("currency", "production", "healthy", 60.0, 0.000, 12.0),
        ]

        services_map = {}
        for name, env, health, req_rate, err_rate, p95 in services_data:
            s_res = await db.execute(select(Service).where(Service.name == name))
            srv = s_res.scalar_one_or_none()
            if not srv:
                srv = Service(
                    name=name,
                    environment=env,
                    namespace="demo",
                    health_status=health,
                    metadata_json={
                        "request_rate": req_rate,
                        "error_rate": err_rate,
                        "p95_latency_ms": p95,
                        "language": "Go"
                        if name in ["frontend", "checkout", "payment"]
                        else "Python",
                        "framework": "gRPC / HTTP",
                    },
                )
                db.add(srv)
                await db.flush()
            services_map[name] = srv

        # 3. Seed topology edges
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

        # 4. Seed an active incident on checkout/payment
        checkout_srv = services_map.get("checkout")
        payment_srv = services_map.get("payment")
        now = datetime.now(UTC)

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
                detected_at=now - timedelta(minutes=45),
                last_seen_at=now,
                detector_name="robust_zscore",
                detector_version="1.0.0",
                confidence=0.88,
                assigned_to_user_id=admin_user.id,
                source="demo",
            )
            db.add(incident)
            await db.flush()

            # Add creation and initial events
            db.add(
                IncidentEvent(
                    incident_id=incident.id,
                    actor_user_id=admin_user.id,
                    event_type="created",
                    new_value_json={"status": "open", "severity": "critical"},
                    reason="Anomaly threshold breached in checkout error rate",
                )
            )

            # Add evidence items
            ev_metric = IncidentEvidence(
                incident_id=incident.id,
                evidence_type="metric",
                service_id=checkout_srv.id,
                source_reference="prometheus:rate(http_requests_total{status=~'5..'}[5m])",
                time_start=now - timedelta(minutes=45),
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
                    time_start=now - timedelta(minutes=40),
                    time_end=now,
                    summary_json={
                        "severity": "CRITICAL",
                        "message": "Downstream connection timed out to postgres-primary:5432 after 5000ms",
                        "error_count": 48,
                    },
                )
                db.add(ev_log)

                ev_trace = IncidentEvidence(
                    incident_id=incident.id,
                    evidence_type="trace",
                    service_id=payment_srv.id,
                    source_reference="tempo:trace_d9b40001",
                    time_start=now - timedelta(minutes=35),
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

            # Seed an investigation job with candidates
            job = InvestigationJob(
                incident_id=incident.id,
                status="succeeded",
                progress=100,
                model_version="rca-baseline-v1",
                started_at=now - timedelta(minutes=30),
                completed_at=now - timedelta(minutes=29),
                result_reference="candidates_3",
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

        # 5. Seed deployment events
        if payment_srv:
            dep_res = await db.execute(
                select(DeploymentEvent).where(
                    DeploymentEvent.deployment_id == "deploy-v2.1.4"
                )
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
                        details_json={"deployed_by": "ci-runner", "version": "v2.1.4"},
                    )
                )

        # 6. Seed RCAEval dataset
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

        # 7. Seed Experiment run
        exp_res = await db.execute(
            select(ExperimentRun).where(
                ExperimentRun.experiment_name == "Robust-ZScore-RCAEval-RE1"
            )
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
                        "top_1_accuracy": 0.612,
                        "top_3_accuracy": 0.785,
                        "top_5_accuracy": 0.871,
                        "mrr": 0.694,
                        "precision": 0.745,
                        "recall": 0.780,
                        "f1": 0.762,
                    },
                    artifact_uri="artifacts/runs/robust_zscore_seed42.tar.gz",
                    status="completed",
                    seed=42,
                    started_at=now - timedelta(days=1),
                    completed_at=now - timedelta(days=1) + timedelta(minutes=12),
                )
            )

        # 8. Seed Alert Rules
        alert_res = await db.execute(
            select(AlertRule).where(
                AlertRule.name == "Checkout Service Error Rate High"
            )
        )
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

        await db.commit()
        print("Demo database seeding completed successfully.")


if __name__ == "__main__":
    asyncio.run(seed())
