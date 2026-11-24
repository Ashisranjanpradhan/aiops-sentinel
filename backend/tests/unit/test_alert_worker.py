import pytest

from app.db.session import AsyncSessionLocal
from app.models.entities import AlertRule, Incident, Service, gen_uuid
from app.services.alert_worker import (
    AlertEvaluatorWorker,
    DistributedAdvisoryLock,
    evaluate_condition,
)


def test_evaluate_condition():
    assert evaluate_condition(0.08, ">", 0.05) is True
    assert evaluate_condition(0.02, ">", 0.05) is False
    assert evaluate_condition(0.05, ">=", 0.05) is True
    assert evaluate_condition(10.0, "<", 20.0) is True
    assert evaluate_condition(30.0, "<", 20.0) is False
    assert evaluate_condition(42.0, "==", 42.0) is True
    assert evaluate_condition(42.0, "!=", 40.0) is True


@pytest.mark.asyncio
async def test_alert_worker_single_cycle():
    worker = AlertEvaluatorWorker()

    async with AsyncSessionLocal() as db_session:
        # 1. Create a service with high error rate
        service_id = gen_uuid()
        service = Service(
            id=service_id,
            name=f"test-worker-service-{service_id[:6]}",
            environment="production",
            health_status="healthy",
            metadata_json={"error_rate": 0.15, "p95_latency_ms": 120.0},
        )
        db_session.add(service)

        # 2. Create an enabled alert rule
        rule_id = gen_uuid()
        rule = AlertRule(
            id=rule_id,
            name=f"High Error Rate Breached {rule_id[:6]}",
            description="Trigger when error rate exceeds 5%",
            service_scope_json=[service.name],
            condition_json={"metric": "error_rate", "operator": ">", "threshold": 0.05},
            severity="critical",
            is_enabled=True,
        )
        db_session.add(rule)
        await db_session.commit()

        # 3. Evaluate once -> should trigger and create incident
        results = await worker.evaluate_once(db_session)
        matching = [r for r in results if r["rule_id"] == rule_id and r["service_id"] == service_id]
        assert len(matching) == 1
        assert matching[0]["status"] == "firing"
        incident_id = matching[0]["incident_id"]
        assert incident_id is not None

        # Verify incident in DB
        inc = await db_session.get(Incident, incident_id)
        assert inc is not None
        assert inc.severity == "critical"
        assert inc.status == "open"
        assert rule.name in inc.title

        # 4. Evaluate again without changes -> should NOT create duplicate incident
        results_2 = await worker.evaluate_once(db_session)
        matching_2 = [r for r in results_2 if r["rule_id"] == rule_id and r["service_id"] == service_id]
        assert len(matching_2) == 1
        assert matching_2[0]["incident_id"] == incident_id

        # 5. Update service error rate to healthy (< threshold)
        service.metadata_json = {"error_rate": 0.01, "p95_latency_ms": 120.0}
        await db_session.commit()

        # 6. Evaluate again -> should recover and auto-resolve
        results_3 = await worker.evaluate_once(db_session)
        matching_3 = [r for r in results_3 if r["rule_id"] == rule_id and r["service_id"] == service_id]
        assert len(matching_3) == 1
        assert matching_3[0]["status"] == "resolved"

        # Verify incident is marked resolved in DB
        await db_session.refresh(inc)
        assert inc.status == "resolved"
        assert inc.resolved_at is not None


@pytest.mark.asyncio
async def test_distributed_advisory_lock(tmp_path):
    lock_file = str(tmp_path / "test_worker.lock")
    lock1 = DistributedAdvisoryLock(lock_id=999888, lock_path=lock_file)
    lock2 = DistributedAdvisoryLock(lock_id=999888, lock_path=lock_file)

    # First lock acquires successfully
    acquired1 = await lock1.acquire()
    assert acquired1 is True

    # Second concurrent lock attempt must be rejected (preventing duplicate worker)
    acquired2 = await lock2.acquire()
    assert acquired2 is False

    # After first lock releases, second lock can acquire
    await lock1.release()
    acquired2_retry = await lock2.acquire()
    assert acquired2_retry is True

    # Clean up
    await lock2.release()
