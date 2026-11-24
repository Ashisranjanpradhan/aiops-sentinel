from datetime import UTC, datetime

import httpx
import pytest
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.main import app
from app.models.entities import Service
from app.services.alert_worker import AlertEvaluatorWorker


@pytest.mark.asyncio
async def test_full_rca_e2e_pipeline():
    """
    Comprehensive End-to-End RCA Pipeline Test:
    1. Authenticate as SRE Operator.
    2. Provision / select target service & dependency topology.
    3. Configure dynamic alert rule with metric threshold.
    4. Trigger alert evaluation -> Incident creation & evidence generation.
    5. Trigger Topological Random Walk with Restart (RWR) Root Cause Ranking.
    6. Validate calibrated confidence scores & candidate explanations.
    7. Test Human-in-the-Loop Remediation Execution (verifying fail-closed approval).
    8. Verify incident event history & resolution audit trail.
    """
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        # Step 1: Authenticate as SRE Operator
        auth_resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@aiops.sentinel", "password": "sentinel-admin-1234"},
        )
        assert auth_resp.status_code == 200, f"Login failed: {auth_resp.text}"
        token = auth_resp.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Step 2: Fetch Services and Topology
        srv_resp = await client.get("/api/v1/services", headers=headers)
        assert srv_resp.status_code == 200
        services = srv_resp.json()["data"]
        assert len(services) > 0, "Expected at least one seeded service"
        target_service = services[0]
        target_service_id = target_service["id"]
        target_service_name = target_service["name"]

        top_resp = await client.get("/api/v1/topology", headers=headers)
        assert top_resp.status_code == 200
        top_data = top_resp.json()["data"]
        assert len(top_data["nodes"]) > 0

        # Step 3: Create Alert Rule for Target Service
        rule_name = f"E2E High Error Rate - {target_service_name} - {datetime.now(UTC).timestamp()}"
        rule_resp = await client.post(
            "/api/v1/alert-rules",
            headers=headers,
            json={
                "name": rule_name,
                "description": "Trigger critical incident when error rate exceeds 5%",
                "service_scope_json": [target_service_name],
                "condition_json": {
                    "metric": "error_rate",
                    "operator": ">",
                    "threshold": 5.0,
                },
                "severity": "critical",
                "evaluation_interval_seconds": 30,
                "is_enabled": True,
            },
        )
        assert rule_resp.status_code == 201
        created_rule = rule_resp.json()["data"]
        rule_id = created_rule["id"]

        # Step 4: Evaluate Rule using AlertEvaluatorWorker
        # Update service metadata to simulate high error rate
        async with AsyncSessionLocal() as db:
            s_res = await db.execute(select(Service).where(Service.id == target_service_id))
            srv = s_res.scalar_one()
            srv.metadata_json = {**(srv.metadata_json or {}), "error_rate": 18.5}
            await db.commit()

            worker = AlertEvaluatorWorker()
            eval_results = await worker.evaluate_once(db)

        # Verify alert fired and incident created
        firing = [r for r in eval_results if r["rule_id"] == rule_id and r["status"] == "firing"]
        assert len(firing) > 0, "Expected alert to fire for high error rate"
        incident_id = firing[0]["incident_id"]
        assert incident_id is not None

        # Step 5: Verify Incident and Evidence
        inc_resp = await client.get(f"/api/v1/incidents/{incident_id}", headers=headers)
        assert inc_resp.status_code == 200
        inc_data = inc_resp.json()["data"]
        assert inc_data["status"] in ("open", "investigating")
        assert inc_data["primary_service_id"] == target_service_id
        assert len(inc_data["evidence"]) > 0

        # Add SRE operator analysis note
        note_resp = await client.post(
            f"/api/v1/incidents/{incident_id}/notes",
            headers=headers,
            json={"note": "E2E automated test: Initiating topological root cause analysis."},
        )
        assert note_resp.status_code == 200

        # Step 6: Trigger Topological RWR Root Cause Analysis Investigation
        inv_resp = await client.post(
            f"/api/v1/incidents/{incident_id}/investigations",
            headers=headers,
        )
        assert inv_resp.status_code == 202
        inv_job = inv_resp.json()["data"]
        job_id = inv_job["id"]
        assert inv_job["status"] in ("queued", "running", "succeeded")

        # Step 7: Inspect Investigation Results
        job_detail_resp = await client.get(
            f"/api/v1/investigations/{job_id}",
            headers=headers,
        )
        assert job_detail_resp.status_code == 200
        job_detail = job_detail_resp.json()["data"]
        assert job_detail["status"] == "succeeded"
        assert job_detail["progress"] == 100
        assert len(job_detail["candidates"]) > 0

        # Verify candidate scoring and ranking properties
        top_cand = job_detail["candidates"][0]
        assert top_cand["rank"] == 1
        assert top_cand["score"] >= 0.0
        assert 0.0 <= top_cand["calibrated_confidence"] <= 1.0
        assert top_cand["candidate_indicator"] is not None
        assert len(top_cand["explanation"]) > 0

        # Step 8: Test Human-in-the-Loop Remediation Runbooks
        # 8a: Verify Runbook catalog
        rb_resp = await client.get("/api/v1/remediations/runbooks", headers=headers)
        assert rb_resp.status_code == 200
        runbooks = rb_resp.json()["data"]
        assert any(r["id"] == "restart_pod" for r in runbooks)

        # 8b: Fail-closed validation: unconfirmed execution must be rejected
        unapproved_resp = await client.post(
            f"/api/v1/incidents/{incident_id}/remediations",
            headers=headers,
            json={
                "runbook_id": "restart_pod",
                "parameters": {"grace_period_seconds": 10},
                "human_approval_confirmed": False,
            },
        )
        assert unapproved_resp.status_code == 422, "Unconfirmed remediation must be rejected"

        # 8c: High-risk runbook without justification note must be rejected
        rollback_no_notes = await client.post(
            f"/api/v1/incidents/{incident_id}/remediations",
            headers=headers,
            json={
                "runbook_id": "rollback_deployment",
                "parameters": {"target_revision": "v1.2.0"},
                "human_approval_confirmed": True,
                "approval_notes": "",
            },
        )
        assert rollback_no_notes.status_code == 422, "High-risk runbook must require approval notes"

        # 8d: Valid confirmed remediation execution
        approved_resp = await client.post(
            f"/api/v1/incidents/{incident_id}/remediations",
            headers=headers,
            json={
                "runbook_id": "restart_pod",
                "parameters": {"grace_period_seconds": 15},
                "human_approval_confirmed": True,
                "approval_notes": f"RWR recommended restart for {top_cand['service_name']} to eliminate memory leak.",
            },
        )
        assert approved_resp.status_code == 200
        rem_res = approved_resp.json()["data"]
        assert rem_res["status"] == "executed"
        assert rem_res["incident_id"] == incident_id

        # Step 9: Verify Remediation Audit History
        rem_hist_resp = await client.get(
            f"/api/v1/incidents/{incident_id}/remediations",
            headers=headers,
        )
        assert rem_hist_resp.status_code == 200
        rem_history = rem_hist_resp.json()["data"]
        assert len(rem_history) > 0
        assert any(e["event_type"] == "remediation_applied" for e in rem_history)

        # Step 10: Resolve Incident
        resolve_resp = await client.patch(
            f"/api/v1/incidents/{incident_id}",
            headers=headers,
            json={
                "status": "resolved",
                "reason": "Pod restarted, error rate returned below 0.1% baseline.",
            },
        )
        assert resolve_resp.status_code == 200
        assert resolve_resp.json()["data"]["status"] == "resolved"
