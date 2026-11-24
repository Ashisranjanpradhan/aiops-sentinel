import tarfile
from pathlib import Path

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
async def test_auth_register_and_login():
    import uuid

    unique_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    password = "TestStrongPassword99!"

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        # Register new user
        reg_resp = await client.post(
            "/api/v1/auth/register",
            json={
                "email": unique_email,
                "password": password,
                "display_name": "Test Engineer",
                "role": "analyst",
            },
        )
        assert reg_resp.status_code == 200
        reg_body = reg_resp.json()
        assert reg_body["data"]["access_token"] is not None
        assert reg_body["data"]["user"]["email"] == unique_email
        assert reg_body["data"]["user"]["display_name"] == "Test Engineer"

        # Duplicate register should return 409 CONFLICT
        dup_resp = await client.post(
            "/api/v1/auth/register",
            json={
                "email": unique_email,
                "password": password,
                "display_name": "Duplicate User",
            },
        )
        assert dup_resp.status_code == 409
        assert dup_resp.json()["error"]["code"] == "CONFLICT"

        # Login with newly registered user
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={"email": unique_email, "password": password},
        )
        assert login_resp.status_code == 200
        token = login_resp.json()["data"]["access_token"]

        # Verify profile via /auth/me
        me_resp = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_resp.status_code == 200
        assert me_resp.json()["data"]["email"] == unique_email

        # Verify refresh token rotation via /auth/refresh
        refresh_token = login_resp.json()["data"]["refresh_token"]
        assert refresh_token is not None
        ref_resp = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert ref_resp.status_code == 200
        new_token = ref_resp.json()["data"]["access_token"]
        assert new_token != token
        assert ref_resp.json()["data"]["refresh_token"] is not None

        # Test password change with weak password (fails policy)
        weak_pwd_resp = await client.post(
            "/api/v1/auth/password",
            headers={"Authorization": f"Bearer {new_token}"},
            json={"current_password": password, "new_password": "weak"},
        )
        assert weak_pwd_resp.status_code == 422 or weak_pwd_resp.status_code == 400

        # Test password change with strong compliant password
        strong_pwd = "NewSecurePassword456!"
        change_resp = await client.post(
            "/api/v1/auth/password",
            headers={"Authorization": f"Bearer {new_token}"},
            json={"current_password": password, "new_password": strong_pwd},
        )
        assert change_resp.status_code == 200


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

        # List open incidents
        inc_res = await client.get("/api/v1/incidents?status=open", headers=headers)
        assert inc_res.status_code == 200
        incidents = inc_res.json()["data"]
        if incidents:
            inc_id = incidents[0]["id"]
        else:
            # Create an open incident to test
            srv_res = await client.get("/api/v1/services", headers=headers)
            srv_id = srv_res.json()["data"][0]["id"]
            create_res = await client.post(
                "/api/v1/incidents",
                headers=headers,
                json={
                    "title": "Test Open Incident for Lifecycle",
                    "description": "Integration test incident",
                    "severity": "high",
                    "primary_service_id": srv_id,
                },
            )
            inc_id = create_res.json()["data"]["id"]

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


@pytest.mark.asyncio
async def test_deployments_preflight_and_delivery():
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        # Login
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@aiops.sentinel", "password": "sentinel-admin-1234"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Fetch available services
        srv_res = await client.get("/api/v1/services", headers=headers)
        assert srv_res.status_code == 200
        services = srv_res.json()["data"]
        assert len(services) > 0
        target_service = services[0]

        # 2. Run Preflight Check
        preflight_res = await client.post(
            "/api/v1/deployments/preflight-check",
            headers=headers,
            json={
                "service_id": target_service["id"],
                "candidate_version": "v2.5.0-rc1",
                "target_environment": "production",
                "commit_hash": "a1b2c3d",
                "pipeline_strategy": "canary_10",
                "simulate_canary_failure": False,
                "simulate_schema_drift": False,
            },
        )
        assert preflight_res.status_code == 200
        pdata = preflight_res.json()["data"]
        assert pdata["service_id"] == target_service["id"]
        assert pdata["decision"] in ["PROCEED", "CHANGES_REQUIRED", "BLOCKED"]
        assert len(pdata["pipeline_checks"]) == 5
        assert len(pdata["what_is_at_risk"]) > 0
        assert len(pdata["what_needs_to_be_changed"]) > 0

        # 3. Preflight with simulated failure should be BLOCKED
        fail_res = await client.post(
            "/api/v1/deployments/preflight-check",
            headers=headers,
            json={
                "service_id": target_service["id"],
                "candidate_version": "v2.5.0-rc2",
                "simulate_canary_failure": True,
                "simulate_schema_drift": True,
            },
        )
        assert fail_res.status_code == 200
        fdata = fail_res.json()["data"]
        assert fdata["decision"] == "BLOCKED"
        assert fdata["risk_score"] >= 65
        assert any(c["status"] == "failed" for c in fdata["pipeline_checks"])

        # 4. Deliver a release candidate
        deliver_res = await client.post(
            "/api/v1/deployments/deliver",
            headers=headers,
            json={
                "service_id": target_service["id"],
                "candidate_version": "v2.5.0",
                "target_environment": "production",
                "commit_hash": "a1b2c3d",
                "preflight_decision": "PROCEED",
                "risk_score": 12,
                "notes": "Automated delivery test release",
            },
        )
        assert deliver_res.status_code == 200
        ddata = deliver_res.json()["data"]
        assert ddata["service_id"] == target_service["id"]
        assert ddata["status"] == "success"

        # 5. Verify it appears in deployments list
        list_res = await client.get("/api/v1/deployments", headers=headers)
        assert list_res.status_code == 200
        deps = list_res.json()["data"]
        assert any(d["id"] == ddata["id"] for d in deps)


@pytest.mark.asyncio
async def test_experiments_creation_and_artifacts():
    from pathlib import Path

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        auth = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@aiops.sentinel", "password": "sentinel-admin-1234"},
        )
        token = auth.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Create real experiment run
        exp_res = await client.post(
            "/api/v1/experiments",
            headers=headers,
            json={
                "experiment_name": "Test Benchmark ZScore Run",
                "model_name": "robust_zscore",
                "model_version": "1.0.0",
                "config_json": {"threshold": 3.0},
                "seed": 42,
            },
        )
        assert exp_res.status_code == 201
        exp_data = exp_res.json()["data"]
        run_id = exp_data["id"]

        # 2. Check metrics are real computed numbers (not mock static)
        metrics = exp_data["metrics_json"]
        assert "precision" in metrics
        assert "recall" in metrics
        assert "f1" in metrics
        assert "top_1_accuracy" in metrics
        assert "mrr" in metrics
        assert metrics["p95_inference_ms"] > 0

        # 3. Verify artifact file exists on disk
        artifact_uri = exp_data["artifact_uri"]
        assert artifact_uri.startswith("ml/artifacts/runs/")
        repo_root = Path(__file__).resolve().parent.parent.parent.parent
        artifact_file = repo_root / artifact_uri
        assert artifact_file.exists()
        assert artifact_file.stat().st_size > 0

        # 4. Fetch detail by ID
        detail_res = await client.get(f"/api/v1/experiments/{run_id}", headers=headers)
        assert detail_res.status_code == 200
        assert detail_res.json()["data"]["id"] == run_id


@pytest.mark.asyncio
async def test_experiments_isolation_forest_and_baselines():
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        auth = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@aiops.sentinel", "password": "sentinel-admin-1234"},
        )
        token = auth.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Run Isolation Forest
        if_res = await client.post(
            "/api/v1/experiments",
            headers=headers,
            json={
                "experiment_name": "Test Isolation Forest Run",
                "model_name": "isolation_forest",
                "model_version": "1.0.0",
                "config_json": {"contamination": 0.05},
                "seed": 42,
            },
        )
        assert if_res.status_code == 201
        if_data = if_res.json()["data"]
        metrics = if_data["metrics_json"]
        assert "false_positive_rate" in metrics
        assert "top_1_accuracy" in metrics
        assert "mean_rank" in metrics
        assert metrics["f1"] > 0.4, (
            f"Expected non-zero F1 for Isolation Forest, got {metrics.get('f1')}"
        )
        assert metrics["top_3_accuracy"] > 0.3, (
            f"Expected non-zero Top-3 accuracy for Isolation Forest, got {metrics.get('top_3_accuracy')}"
        )

        # Verify tar.gz contains model.joblib and evaluation_cases.json
        repo_root = Path(__file__).resolve().parent.parent.parent.parent
        tar_path = repo_root / if_data["artifact_uri"]
        assert tar_path.exists()
        with tarfile.open(tar_path, "r:gz") as tar:
            members = tar.getnames()
            assert "manifest.json" in members
            assert "model.joblib" in members
            assert "evaluation_cases.json" in members

        # 2. Run Random Baseline
        rand_res = await client.post(
            "/api/v1/experiments",
            headers=headers,
            json={
                "experiment_name": "Test Random Baseline",
                "model_name": "random_baseline",
                "model_version": "1.0.0",
                "config_json": {},
                "seed": 123,
            },
        )
        assert rand_res.status_code == 201
        rand_metrics = rand_res.json()["data"]["metrics_json"]
        assert "mrr" in rand_metrics


@pytest.mark.asyncio
async def test_codebase_assessment_lifecycle():
    import asyncio
    import io
    import zipfile

    # Build sample zip archive
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("src/main.py", "import os\ndef run():\n    print('Production code')\n")
        zf.writestr("tests/test_main.py", "def test_run(): assert True\n")
        zf.writestr("README.md", "# Sample Production Project\nInstallation instructions.\n")
        zf.writestr(".env.example", "PORT=8000\nLOG_LEVEL=info\n")
        zf.writestr("Dockerfile", "FROM python:3.11-slim\nUSER appuser\nCMD python src/main.py\n")
    buf.seek(0)

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        auth = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@aiops.sentinel", "password": "sentinel-admin-1234"},
        )
        token = auth.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Upload ZIP
        files = {"files": ("sample_repo.zip", buf.getvalue(), "application/zip")}
        data = {"project_name": "Sample Order Service"}
        upload_res = await client.post(
            "/api/v1/assessments/upload",
            headers=headers,
            files=files,
            data=data,
        )
        assert upload_res.status_code == 202
        res_data = upload_res.json()["data"]
        assessment_id = res_data["assessment_id"]
        job_id = res_data["job_id"]
        assert assessment_id is not None
        assert job_id is not None

        # 2. Poll job status until completed
        completed = False
        for _ in range(25):
            job_res = await client.get(f"/api/v1/assessments/jobs/{job_id}", headers=headers)
            assert job_res.status_code == 200
            j_data = job_res.json()["data"]
            if j_data["status"] == "completed":
                completed = True
                assert j_data["progress_percent"] == 100
                break
            elif j_data["status"] == "failed":
                pytest.fail(f"Assessment job failed: {j_data.get('error_message')}")
            await asyncio.sleep(0.1)

        assert completed is True

        # 3. Fetch assessment detail
        detail_res = await client.get(f"/api/v1/assessments/{assessment_id}", headers=headers)
        assert detail_res.status_code == 200
        detail = detail_res.json()["data"]
        assert detail["id"] == assessment_id
        assert detail["project_name"] == "Sample Order Service"
        assert detail["overall_score"] > 0
        assert detail["readiness_level"] in ("PRODUCTION_READY", "NEAR_PRODUCTION", "NEEDS_WORK")
        assert len(detail["dimension_scores_json"]) == 10
        assert "Architecture & Modularity" in detail["dimension_scores_json"]
        assert len(detail["summary"]) > 0

        # 4. Fetch findings
        findings_res = await client.get(
            f"/api/v1/assessments/{assessment_id}/findings", headers=headers
        )
        assert findings_res.status_code == 200
        findings_list = findings_res.json()["data"]
        assert isinstance(findings_list, list)

        # 5. List all assessments
        list_res = await client.get("/api/v1/assessments", headers=headers)
        assert list_res.status_code == 200
        all_assessments = list_res.json()["data"]
        assert any(a["id"] == assessment_id for a in all_assessments)

        # 6. Export assessment in SARIF and HTML
        sarif_res = await client.get(
            f"/api/v1/assessments/{assessment_id}/export?format=sarif", headers=headers
        )
        assert sarif_res.status_code == 200
        sarif_data = sarif_res.json()
        assert sarif_data["version"] == "2.1.0"
        assert "runs" in sarif_data

        html_res = await client.get(
            f"/api/v1/assessments/{assessment_id}/export?format=html", headers=headers
        )
        assert html_res.status_code == 200
        assert "<html" in html_res.text.lower()
        assert "Production Readiness Report" in html_res.text

        # 7. Delete assessment
        del_res = await client.delete(f"/api/v1/assessments/{assessment_id}", headers=headers)
        assert del_res.status_code == 200

        # Verify 404 on deleted assessment
        get_deleted = await client.get(f"/api/v1/assessments/{assessment_id}", headers=headers)
        assert get_deleted.status_code == 404


@pytest.mark.asyncio
async def test_assessment_ownership_and_idor_protection():
    """Verify IDOR prevention: User B cannot access, export, list, or delete User A's assessments."""
    import asyncio
    import io
    import uuid
    import zipfile

    # Build sample zip archive
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("src/service.py", "def handle(): return True\n")
        zf.writestr("README.md", "# Service Docs\n")
    buf.seek(0)

    email_a = f"alice_{uuid.uuid4().hex[:8]}@company.com"
    email_b = f"bob_{uuid.uuid4().hex[:8]}@company.com"

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        # 1. Register User A (Alice, Analyst)
        reg_a = await client.post(
            "/api/v1/auth/register",
            json={
                "email": email_a,
                "password": "SecurePassword123!",
                "display_name": "Alice Developer",
            },
        )
        assert reg_a.status_code == 200
        token_a = reg_a.json()["data"]["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # 2. Register User B (Bob, Analyst)
        reg_b = await client.post(
            "/api/v1/auth/register",
            json={
                "email": email_b,
                "password": "SecurePassword123!",
                "display_name": "Bob Analyst",
            },
        )
        assert reg_b.status_code == 200
        token_b = reg_b.json()["data"]["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # 3. User A uploads a codebase
        files = {"files": ("alice_project.zip", buf.getvalue(), "application/zip")}
        data = {"project_name": "Alice Confidential Service"}
        upload_res = await client.post(
            "/api/v1/assessments/upload",
            headers=headers_a,
            files=files,
            data=data,
        )
        assert upload_res.status_code == 202
        assessment_id = upload_res.json()["data"]["assessment_id"]
        job_id = upload_res.json()["data"]["job_id"]

        # Wait briefly for completion
        for _ in range(20):
            job_res = await client.get(f"/api/v1/assessments/jobs/{job_id}", headers=headers_a)
            if job_res.json()["data"]["status"] in ("completed", "failed"):
                break
            await asyncio.sleep(0.1)

        # 4. User B attempts unauthorized access (IDOR attacks)
        # Detail retrieval
        unauth_detail = await client.get(f"/api/v1/assessments/{assessment_id}", headers=headers_b)
        assert unauth_detail.status_code == 403
        assert "not authorized" in unauth_detail.json()["error"]["message"].lower()

        # Job status retrieval
        unauth_job = await client.get(f"/api/v1/assessments/jobs/{job_id}", headers=headers_b)
        assert unauth_job.status_code == 403

        # Export report
        unauth_export = await client.get(
            f"/api/v1/assessments/{assessment_id}/export?format=html", headers=headers_b
        )
        assert unauth_export.status_code == 403

        # List findings
        unauth_findings = await client.get(
            f"/api/v1/assessments/{assessment_id}/findings", headers=headers_b
        )
        assert unauth_findings.status_code == 403

        # Delete assessment
        unauth_delete = await client.delete(
            f"/api/v1/assessments/{assessment_id}", headers=headers_b
        )
        assert unauth_delete.status_code == 403

        # List assessments: User B should NOT see User A's assessment
        list_b = await client.get("/api/v1/assessments", headers=headers_b)
        assert list_b.status_code == 200
        user_b_assessments = list_b.json()["data"]
        assert not any(a["id"] == assessment_id for a in user_b_assessments)

        # 5. User A CAN list and view their own assessment
        list_a = await client.get("/api/v1/assessments", headers=headers_a)
        assert list_a.status_code == 200
        user_a_assessments = list_a.json()["data"]
        assert any(a["id"] == assessment_id for a in user_a_assessments)

        # 6. Admin CAN view and manage User A's assessment
        auth_admin = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@aiops.sentinel", "password": "sentinel-admin-1234"},
        )
        admin_token = auth_admin.json()["data"]["access_token"]
        headers_admin = {"Authorization": f"Bearer {admin_token}"}

        admin_detail = await client.get(
            f"/api/v1/assessments/{assessment_id}", headers=headers_admin
        )
        assert admin_detail.status_code == 200


@pytest.mark.asyncio
async def test_remediation_api_endpoints():
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        # 1. Login as admin (operator role)
        auth = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@aiops.sentinel", "password": "sentinel-admin-1234"},
        )
        token = auth.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. List runbooks
        rb_res = await client.get("/api/v1/remediations/runbooks", headers=headers)
        assert rb_res.status_code == 200
        runbooks = rb_res.json()["data"]
        assert len(runbooks) >= 4
        rb_ids = [r["id"] for r in runbooks]
        assert "restart_pod" in rb_ids
        assert "rollback_deployment" in rb_ids

        # 3. Get existing incident
        inc_list = await client.get("/api/v1/incidents", headers=headers)
        assert inc_list.status_code == 200
        incidents = inc_list.json()["data"]
        assert len(incidents) > 0
        incident_id = incidents[0]["id"]

        # 4. Attempt execution without human approval -> 422 (ValidationError)
        unapproved = await client.post(
            f"/api/v1/incidents/{incident_id}/remediations",
            headers=headers,
            json={
                "runbook_id": "restart_pod",
                "parameters": {"grace_period_seconds": 15},
                "human_approval_confirmed": False,
            },
        )
        assert unapproved.status_code == 422

        # 5. Execute with human approval -> 200
        approved = await client.post(
            f"/api/v1/incidents/{incident_id}/remediations",
            headers=headers,
            json={
                "runbook_id": "restart_pod",
                "parameters": {"grace_period_seconds": 15},
                "human_approval_confirmed": True,
                "approval_notes": "Gracefully restarting pod to clear memory pressure",
            },
        )
        assert approved.status_code == 200
        rem_data = approved.json()["data"]
        assert rem_data["status"] == "executed"
        assert rem_data["runbook_id"] == "restart_pod"
        assert rem_data["incident_id"] == incident_id

        # 6. Check incident remediation history
        history_res = await client.get(
            f"/api/v1/incidents/{incident_id}/remediations", headers=headers
        )
        assert history_res.status_code == 200
        history = history_res.json()["data"]
        assert len(history) > 0
        assert history[0]["event_type"] == "remediation_applied"
