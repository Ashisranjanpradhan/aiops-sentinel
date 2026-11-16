import httpx
import pytest

from app.core.config import settings
from app.main import app


@pytest.mark.asyncio
async def test_health_endpoints():
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        # Liveness
        resp_live = await client.get("/api/v1/health/live")
        assert resp_live.status_code == 200
        data_live = resp_live.json()
        assert data_live["data"]["status"] == "alive"
        assert data_live["meta"]["request_id"] is not None

        # Readiness
        resp_ready = await client.get("/api/v1/health/ready")
        assert resp_ready.status_code == 200
        data_ready = resp_ready.json()
        assert data_ready["data"]["status"] in ["ready", "degraded"]
        assert data_ready["data"]["database"]["ok"] is True


@pytest.mark.asyncio
async def test_meta_endpoint():
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/api/v1/meta")
        assert resp.status_code == 200
        data = resp.json()
        assert data["data"]["app_name"] == settings.APP_NAME
        assert "anomaly_detection" in data["data"]["supported_features"]


@pytest.mark.asyncio
async def test_auth_login_and_me():
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        # Invalid login
        resp_bad = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@aiops.sentinel", "password": "wrong-password-here"},
        )
        assert resp_bad.status_code == 401
        assert resp_bad.json()["error"]["code"] == "UNAUTHORIZED"

        # Valid login
        resp_good = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@aiops.sentinel", "password": "sentinel-admin-1234"},
        )
        assert resp_good.status_code == 200
        body = resp_good.json()
        token = body["data"]["access_token"]
        assert token is not None

        # Access /auth/me with Bearer token
        resp_me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert resp_me.status_code == 200
        me_data = resp_me.json()
        assert me_data["data"]["email"] == "admin@aiops.sentinel"
        assert me_data["data"]["role"] == "admin"


@pytest.mark.asyncio
async def test_services_and_topology_api():
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        # Login
        auth = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@aiops.sentinel", "password": "sentinel-admin-1234"},
        )
        token = auth.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # List services
        resp = await client.get("/api/v1/services", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["data"]) > 0
        service_id = data["data"][0]["id"]

        # Detail
        s_detail = await client.get(f"/api/v1/services/{service_id}", headers=headers)
        assert s_detail.status_code == 200

        # Metrics
        s_metrics = await client.get(f"/api/v1/services/{service_id}/metrics", headers=headers)
        assert s_metrics.status_code == 200
        assert "metrics" in s_metrics.json()["data"]

        # Topology
        top_resp = await client.get("/api/v1/topology", headers=headers)
        assert top_resp.status_code == 200
        top_data = top_resp.json()["data"]
        assert len(top_data["nodes"]) > 0
        assert len(top_data["edges"]) > 0


@pytest.mark.asyncio
async def test_incidents_lifecycle_and_investigation():
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        auth = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@aiops.sentinel", "password": "sentinel-admin-1234"},
        )
        token = auth.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # List incidents
        inc_res = await client.get("/api/v1/incidents", headers=headers)
        assert inc_res.status_code == 200
        incidents = inc_res.json()["data"]
        assert len(incidents) > 0
        inc_id = incidents[0]["id"]

        # Incident detail
        detail_res = await client.get(f"/api/v1/incidents/{inc_id}", headers=headers)
        assert detail_res.status_code == 200
        detail = detail_res.json()["data"]
        assert detail["id"] == inc_id

        # Add analyst note
        note_res = await client.post(
            f"/api/v1/incidents/{inc_id}/notes",
            headers=headers,
            json={"note": "Investigating payment latency spike in upstream checkout worker."},
        )
        assert note_res.status_code == 200

        # Acknowledge incident
        patch_res = await client.patch(
            f"/api/v1/incidents/{inc_id}",
            headers=headers,
            json={"status": "acknowledged", "reason": "SRE acknowledged page"},
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["data"]["status"] == "acknowledged"

        # Invalid transition: closed without resolving should be rejected if prohibited
        bad_trans = await client.patch(
            f"/api/v1/incidents/{inc_id}", headers=headers, json={"status": "invalid_status_xyz"}
        )
        assert bad_trans.status_code == 409

        # Trigger RCA investigation
        inv_res = await client.post(f"/api/v1/incidents/{inc_id}/investigations", headers=headers)
        assert inv_res.status_code == 202
        inv_data = inv_res.json()["data"]
        assert inv_data["incident_id"] == inc_id
        assert inv_data["status"] in ["queued", "running", "succeeded"]
        assert len(inv_data["candidates"]) > 0


@pytest.mark.asyncio
async def test_alert_rules_crud():
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        auth = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@aiops.sentinel", "password": "sentinel-admin-1234"},
        )
        token = auth.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create rule
        rule_name = "Test Unique Memory Alert Rule"
        create_res = await client.post(
            "/api/v1/alert-rules",
            headers=headers,
            json={
                "name": rule_name,
                "description": "Trigger when memory exceeds 90%",
                "service_scope_json": ["payment"],
                "condition_json": {
                    "metric": "memory_utilization",
                    "operator": ">",
                    "threshold": 90.0,
                },
                "severity": "high",
                "evaluation_interval_seconds": 60,
                "is_enabled": True,
            },
        )
        assert create_res.status_code == 201
        rule_id = create_res.json()["data"]["id"]

        # Duplicate rule name rejection (Section 7.3 L)
        dup_res = await client.post(
            "/api/v1/alert-rules",
            headers=headers,
            json={"name": rule_name, "condition_json": {}, "severity": "high"},
        )
        assert dup_res.status_code == 409

        # Update rule
        update_res = await client.patch(
            f"/api/v1/alert-rules/{rule_id}", headers=headers, json={"is_enabled": False}
        )
        assert update_res.status_code == 200
        assert update_res.json()["data"]["is_enabled"] is False

        # Delete rule
        del_res = await client.delete(f"/api/v1/alert-rules/{rule_id}", headers=headers)
        assert del_res.status_code == 200

        # Verify not found after delete
        not_found_res = await client.get(f"/api/v1/alert-rules/{rule_id}", headers=headers)
        assert not_found_res.status_code == 404
