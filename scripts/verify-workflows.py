import asyncio
import json
import sqlite3
import sys
import os
import httpx

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.main import app

DB_PATH = "aiops_sentinel.db"

def inspect_db_counts(label: str):
    print(f"\n--- Database Inspection ({label}) ---")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]
    counts = {}
    for t in tables:
        cursor.execute(f"SELECT count(*) FROM {t}")
        cnt = cursor.fetchone()[0]
        counts[t] = cnt
        print(f"  {t.ljust(22)}: {cnt} records")
    conn.close()
    return counts

async def run_full_workflow():
    print("=" * 65)
    print("STARTING FULL END-TO-END WORKFLOW & USER EXPERIENCE VERIFICATION")
    print("=" * 65)

    before_counts = inspect_db_counts("Initial State")

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Step 1: Health & Readiness
        print("\n[Step 1] Checking Liveness & Readiness APIs...")
        live_res = await client.get("/api/v1/health/live")
        assert live_res.status_code == 200, f"Liveness failed: {live_res.text}"
        assert live_res.json()["data"]["status"] == "alive"

        ready_res = await client.get("/api/v1/health/ready")
        assert ready_res.status_code == 200, f"Readiness failed: {ready_res.text}"
        ready_data = ready_res.json()["data"]
        print(f"  Database Ready: {ready_data['database']['ok']}")
        print(f"  Telemetry Backends: {ready_data['telemetry_backends']}")

        # Step 2: Authentication
        print("\n[Step 2] User Authentication Workflow...")
        # Bad login test
        bad_login = await client.post("/api/v1/auth/login", json={
            "email": "admin@aiops.sentinel",
            "password": "wrong-password"
        })
        assert bad_login.status_code == 401
        print("  Invalid login correctly rejected with 401 Unauthorized")

        # Good login test
        login_res = await client.post("/api/v1/auth/login", json={
            "email": "admin@aiops.sentinel",
            "password": "sentinel-admin-1234"
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        token = login_res.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print(f"  Login successful for {login_res.json()['data']['user']['email']}")

        # Step 3: Overview Dashboard
        print("\n[Step 3] Querying Overview Dashboard Summary...")
        overview_res = await client.get("/api/v1/overview/summary", headers=headers)
        assert overview_res.status_code == 200
        ov = overview_res.json()["data"]
        print(f"  Total Monitored Services : {ov['total_services']}")
        print(f"  Healthy / Warning / Crit : {ov['healthy_services']} / {ov['warning_services']} / {ov['critical_services']}")
        print(f"  Active Incidents Count   : {ov['active_incidents_count']}")
        print(f"  Anomaly Trend Buckets    : {len(ov['anomaly_trend'])}")

        # Step 4: Services & Telemetry
        print("\n[Step 4] Querying Services & Telemetry...")
        services_res = await client.get("/api/v1/services", headers=headers)
        assert services_res.status_code == 200
        services_list = services_res.json()["data"]
        print(f"  Retrieved {len(services_list)} services")

        checkout_srv = next(s for s in services_list if s["name"] == "checkout")
        print(f"  Inspecting service '{checkout_srv['name']}' (ID: {checkout_srv['id']}):")
        
        # Telemetry metrics
        metrics_res = await client.get(f"/api/v1/services/{checkout_srv['id']}/metrics", headers=headers)
        assert metrics_res.status_code == 200
        m_dict = metrics_res.json()["data"]["metrics"]
        print(f"    Metrics available: {list(m_dict.keys())}")
        print(f"    Request rate points: {len(m_dict['request_rate']['points'])}")

        # Telemetry logs
        logs_res = await client.get(f"/api/v1/services/{checkout_srv['id']}/logs", headers=headers)
        assert logs_res.status_code == 200
        logs = logs_res.json()["data"]["logs"]
        print(f"    Logs retrieved: {len(logs)} entries (latest: {logs[0]['severity']} - {logs[0]['message'][:50]}...)")

        # Telemetry traces
        traces_res = await client.get(f"/api/v1/services/{checkout_srv['id']}/traces", headers=headers)
        assert traces_res.status_code == 200
        traces = traces_res.json()["data"]["traces"]
        print(f"    Traces retrieved: {len(traces)} traces (latest: {traces[0]['trace_id']}, duration: {traces[0]['duration_ms']}ms)")

        # Step 5: Topology Graph
        print("\n[Step 5] Validating Service Topology Graph...")
        topo_res = await client.get("/api/v1/topology", headers=headers)
        assert topo_res.status_code == 200
        topo = topo_res.json()["data"]
        print(f"  Topology Nodes : {len(topo['nodes'])}")
        print(f"  Topology Edges : {len(topo['edges'])}")
        for e in topo['edges'][:3]:
            print(f"    {e['source']} --({e['relationship']})--> {e['target']} (vol: {e['call_volume']}, err: {e['error_rate']})")

        # Step 6: Incident Lifecycle & Investigation Workflow
        print("\n[Step 6] Incident Lifecycle & RCA Investigation Workflow...")
        incidents_res = await client.get("/api/v1/incidents", headers=headers)
        assert incidents_res.status_code == 200
        inc_list = incidents_res.json()["data"]
        assert len(inc_list) > 0
        inc_id = inc_list[0]["id"]
        print(f"  Active Incident: {inc_list[0]['title']} (Status: {inc_list[0]['status']})")

        # Post Analyst Note
        print("  Posting analyst investigation note...")
        note_res = await client.post(
            f"/api/v1/incidents/{inc_id}/notes",
            headers=headers,
            json={"note": "Verified payment upstream error spike. Investigating DB connection pool saturation."}
        )
        assert note_res.status_code == 200
        print("  Analyst note posted successfully")

        # State transition: Acknowledge
        print("  Transitioning status -> acknowledged...")
        ack_res = await client.patch(
            f"/api/v1/incidents/{inc_id}",
            headers=headers,
            json={"status": "acknowledged", "reason": "SRE acknowledged page on duty"}
        )
        assert ack_res.status_code == 200
        assert ack_res.json()["data"]["status"] == "acknowledged"
        print("  Status acknowledged verified")

        # State transition: Mark Investigating
        print("  Transitioning status -> investigating...")
        inv_status_res = await client.patch(
            f"/api/v1/incidents/{inc_id}",
            headers=headers,
            json={"status": "investigating", "reason": "Investigation initiated by SRE"}
        )
        assert inv_status_res.status_code == 200
        assert inv_status_res.json()["data"]["status"] == "investigating"
        print("  Status investigating verified")

        # Trigger RCA Investigation Background Job
        print("  Triggering Root Cause Analysis (RCA) investigation job...")
        job_res = await client.post(
            f"/api/v1/incidents/{inc_id}/investigations",
            headers=headers
        )
        assert job_res.status_code == 202
        job_data = job_res.json()["data"]
        print(f"  Investigation Job ID: {job_data['id']}")
        print(f"  Job Status: {job_data['status']} (Progress: {job_data['progress']}%)")
        print(f"  Root Cause Candidates identified: {len(job_data['candidates'])}")
        for cand in job_data['candidates']:
            conf_str = f"{int(cand['calibrated_confidence'] * 100)}%" if cand['calibrated_confidence'] else "N/A"
            print(f"    Rank #{cand['rank']}: {cand['service_name']} (Confidence: {conf_str}, Indicator: {cand['candidate_indicator']})")
            print(f"      Explanation: {cand['explanation'][:90]}...")

        # Resolve Incident
        print("  Resolving incident...")
        resolve_res = await client.patch(
            f"/api/v1/incidents/{inc_id}",
            headers=headers,
            json={"status": "resolved", "reason": "Database connection pool resized and restarted."}
        )
        assert resolve_res.status_code == 200
        assert resolve_res.json()["data"]["status"] == "resolved"
        assert resolve_res.json()["data"]["resolved_at"] is not None
        print("  Incident resolved successfully")

        # Step 7: Create a New Incident
        print("\n[Step 7] Testing New Incident Creation...")
        auth_srv = next(s for s in services_list if s["name"] == "auth")
        new_inc_res = await client.post(
            "/api/v1/incidents",
            headers=headers,
            json={
                "title": "Auth Service Elevated Token Verification Failures",
                "description": "Spike in 401 Unauthorized responses due to Redis cache eviction.",
                "severity": "high",
                "primary_service_id": auth_srv["id"],
                "detector_name": "robust_zscore",
                "detector_version": "1.0.0",
                "source": "live",
                "evidence_items": [
                    {
                        "evidence_type": "metric",
                        "service_id": auth_srv["id"],
                        "source_reference": "prometheus:rate(auth_token_failures[1m])",
                        "summary_json": {"metric_name": "token_failures", "observed_value": 42.0, "z_score": 4.2}
                    }
                ]
            }
        )
        assert new_inc_res.status_code == 201
        created_inc = new_inc_res.json()["data"]
        print(f"  Created new incident: {created_inc['title']} (ID: {created_inc['id']})")

        # Step 8: Deployments Tracking
        print("\n[Step 8] Testing Deployments History & Correlation...")
        dep_res = await client.get("/api/v1/deployments", headers=headers)
        assert dep_res.status_code == 200
        deps = dep_res.json()["data"]
        print(f"  Retrieved {len(deps)} deployment records")
        for d in deps:
            print(f"    Deploy: {d['deployment_id']} ({d['service_name']}) - Status: {d['status']} - Commit: {d['commit_id']}")

        # Step 9: Dataset Registry & Governance Validation
        print("\n[Step 9] Testing Dataset Registry Governance...")
        # Test mandatory license rejection (Section 4.6 & 7.3 K)
        bad_ds = await client.post("/api/v1/datasets", headers=headers, json={
            "name": "UnverifiedDataset",
            "version": "0.1",
            "source_url": "https://example.com/data",
            "license_note": "" # Empty license must fail
        })
        assert bad_ds.status_code == 422
        print("  Unlicensed dataset correctly rejected by governance check")

        # Register valid benchmark dataset
        valid_ds = await client.post("/api/v1/datasets", headers=headers, json={
            "name": "LogHub-BGL",
            "version": "2.0.0",
            "source_url": "https://github.com/logpai/loghub",
            "license_note": "Research access permitted. Attribution to LogHub team.",
            "usage_restrictions": "Academic research use.",
            "modalities_json": ["logs"]
        })
        assert valid_ds.status_code == 201
        ds_id = valid_ds.json()["data"]["id"]
        print(f"  Successfully registered dataset 'LogHub-BGL' (ID: {ds_id})")

        # Validate dataset manifest
        val_res = await client.post(f"/api/v1/datasets/{ds_id}/validate", headers=headers)
        assert val_res.status_code == 200
        print(f"  Dataset validation check: {val_res.json()['data']['message']}")

        # Step 10: Experiment Runs & Metrics
        print("\n[Step 10] Testing Experiments & Model Registry...")
        exp_res = await client.get("/api/v1/experiments", headers=headers)
        assert exp_res.status_code == 200
        exps = exp_res.json()["data"]
        print(f"  Retrieved {len(exps)} benchmark runs")
        for r in exps:
            m = r["metrics_json"]
            print(f"    Run: {r['experiment_name']} (Model: {r['model_name']}, Hit@1: {m.get('top_1_accuracy')}, MRR: {m.get('mrr')})")

        # Register new experiment run
        new_exp = await client.post("/api/v1/experiments", headers=headers, json={
            "experiment_name": "MultiModal-Fusion-RCAEval-RE2",
            "model_name": "multimodal_fusion",
            "model_version": "2.0.0",
            "dataset_id": ds_id,
            "seed": 101,
            "config_json": {"fusion": "score_level", "topology_weight": 0.4}
        })
        assert new_exp.status_code == 201
        print(f"  Registered new experiment run: {new_exp.json()['data']['experiment_name']}")

        # Step 11: Alert Rules CRUD & State Toggling
        print("\n[Step 11] Testing Alert Rules Policy CRUD...")
        # Create rule
        new_rule_res = await client.post("/api/v1/alert-rules", headers=headers, json={
            "name": "Auth Failure Rate Breach",
            "description": "Triggers when auth failure exceeds 10 req/s",
            "service_scope_json": ["auth"],
            "condition_json": {"metric": "error_rate", "operator": ">", "threshold": 0.10},
            "severity": "high",
            "evaluation_interval_seconds": 30,
            "is_enabled": True
        })
        assert new_rule_res.status_code == 201
        rule_id = new_rule_res.json()["data"]["id"]
        print(f"  Created alert rule policy: {new_rule_res.json()['data']['name']}")

        # Toggle enabled -> disabled
        toggle_res = await client.patch(f"/api/v1/alert-rules/{rule_id}", headers=headers, json={"is_enabled": False})
        assert toggle_res.status_code == 200
        assert toggle_res.json()["data"]["is_enabled"] is False
        print("  Toggled rule status to Disabled and verified persistence")

        # Step 12: Operator Profile Updates
        print("\n[Step 12] Testing Profile & Timezone Localization...")
        prof_res = await client.patch("/api/v1/profile", headers=headers, json={
            "display_name": "Lead SRE Engineer",
            "time_zone": "Asia/Kolkata"
        })
        assert prof_res.status_code == 200
        prof_data = prof_res.json()["data"]
        assert prof_data["display_name"] == "Lead SRE Engineer"
        assert prof_data["time_zone"] == "Asia/Kolkata"
        print(f"  Profile updated and persisted: {prof_data['display_name']} ({prof_data['time_zone']})")

    # Step 13: Final Database Cross-Verification
    after_counts = inspect_db_counts("Post-Workflow State")
    print("\n" + "=" * 65)
    print("DATABASE MUTATION & PERSISTENCE VERIFICATION:")
    for table, count in after_counts.items():
        diff = count - before_counts.get(table, 0)
        diff_str = f"(+{diff})" if diff > 0 else "(no change)"
        print(f"  {table.ljust(22)}: {count} records {diff_str}")
    print("=" * 65)
    print("ALL WORKFLOWS AND USER EXPERIENCE FUNCTIONALITIES VERIFIED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(run_full_workflow())
