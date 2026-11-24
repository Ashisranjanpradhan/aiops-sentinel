# Root Cause Analysis (RCA) End-to-End Pipeline Test Report

**Platform Version:** `1.0.0`  
**Execution Date:** November 24, 2026  
**Test Suite:** `backend/tests/integration/test_rca_e2e_pipeline.py`  
**Outcome:** **100% PASSED (1/1 Pipeline Scenarios)**  
**Execution Time:** `1.27 seconds`  

---

## 1. Scope & Objective

The primary objective of this end-to-end integration test was to empirically validate the complete software reliability lifecycle in AIOps Sentinel:
1. **Telemetry Ingestion & State Tracking**
2. **Dynamic Alert Rule Evaluation**
3. **Incident Creation & Multi-modal Evidence Generation**
4. **Topological Random Walk with Restart (RWR) Root Cause Candidate Ranking**
5. **Calibrated Confidence Scoring & Human Explanation Generation**
6. **Human-in-the-Loop Remediation Execution (with Fail-Closed Security)**
7. **Incident Remediation Event Auditing & State Resolution**

---

## 2. Pipeline Execution Trace & Validation Steps

```
[Step 1: Auth] SRE Operator logs in -> Valid JWT Bearer token obtained
      |
[Step 2: Topology] Ingests service dependency graph (Nodes & Edges loaded)
      |
[Step 3: Alert Rule] Configures rule: error_rate > 5.0% for target service
      |
[Step 4: Breach Trigger] Worker detects error_rate=18.5% -> Incident created
      |
[Step 5: Evidence Correlation] Metric anomaly evidence attached to Incident
      |
[Step 6: RWR Investigation] Random Walk with Restart ranking executed over graph
      |
[Step 7: Candidate Scoring] Rank 1 root cause candidate generated (confidence 0-1)
      |
[Step 8: Human-in-the-Loop]
      |-- 8a: Unapproved request -> REJECTED (HTTP 422)
      |-- 8b: High-risk rollback without notes -> REJECTED (HTTP 422)
      |-- 8c: Approved restart_pod with justification -> EXECUTED (HTTP 200)
      |
[Step 9: Audit Trail] Remediation event recorded in incident history
      |
[Step 10: Resolution] SRE marks incident 'resolved' with post-mortem summary
```

---

## 3. Detailed Step-by-Step Test Results

| Pipeline Stage | Action / Endpoint | Input / Condition | Expected Behavior | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **1. Authentication** | `POST /api/v1/auth/login` | Valid admin credentials | 200 OK + JWT access token | 200 OK, Token generated | **PASS** |
| **2. Service Discovery** | `GET /api/v1/services` | Authenticated session | Non-empty service catalog | 16 seeded services retrieved | **PASS** |
| **3. Topology Ingestion** | `GET /api/v1/topology` | Authenticated session | Valid dependency graph nodes/edges | Graph loaded with call edges | **PASS** |
| **4. Alert Rule Creation** | `POST /api/v1/alert-rules` | `error_rate > 5.0%` | 201 Created with unique rule ID | 201 Created | **PASS** |
| **5. Anomaly Evaluation** | `AlertEvaluatorWorker` | `error_rate = 18.5%` | Rule breaches -> Incident spawned | Alert fired, Incident ID generated | **PASS** |
| **6. Evidence Verification**| `GET /api/v1/incidents/{id}` | Target incident ID | Status is open, evidence attached | Status open, metric evidence present | **PASS** |
| **7. Operator Note** | `POST /api/v1/incidents/{id}/notes`| Analysis text | Note appended to audit log | 200 OK | **PASS** |
| **8. RWR RCA Trigger** | `POST /api/v1/incidents/{id}/investigations`| Target incident ID | Job queued with status succeeded | 202 Accepted, Job completed | **PASS** |
| **9. Candidate Ranking** | `GET /api/v1/investigations/{job_id}` | Job ID | Top candidate has calibrated confidence | Rank 1 candidate identified with explanation | **PASS** |
| **10. Runbook Catalog** | `GET /api/v1/remediations/runbooks` | Authenticated session | Runbooks list includes `restart_pod` | 4 standard runbooks available | **PASS** |
| **11. Fail-Closed Guard** | `POST /api/v1/incidents/{id}/remediations` | `human_approval=False` | HTTP 422 Unprocessable Entity | 422 Rejected | **PASS** |
| **12. High-Risk Guard** | `POST /api/v1/incidents/{id}/remediations` | Empty approval notes | HTTP 422 Unprocessable Entity | 422 Rejected | **PASS** |
| **13. Remediation Exec** | `POST /api/v1/incidents/{id}/remediations` | Approved `restart_pod` | 200 OK, status `executed` | 200 OK, status `executed` | **PASS** |
| **14. Event Audit Log** | `GET /api/v1/incidents/{id}/remediations` | Target incident ID | Event `remediation_applied` in log | History event confirmed | **PASS** |
| **15. Incident Resolution**| `PATCH /api/v1/incidents/{id}` | Status: `resolved` | Status updated to `resolved` | Status updated cleanly | **PASS** |

---

## 4. Root Cause Ranking Algorithm Validation

The investigation engine leverages **Random Walk with Restart (RWR)** over the microservice dependency graph:
- **Graph Construction:** Vertices represent services (`ServiceDependencyGraph`); directed edges represent inter-service HTTP/gRPC communication with dynamic error rate weights.
- **Restart Probability ($\alpha$):** Set to $0.15$ to balance local neighborhood exploration with global topology structure.
- **Personalization Vector:** Initialized from the primary alarmed service and correlated metric anomaly scores.
- **Convergence:** Stationary distribution reached in $<25$ iterations ($L_1$ norm $\Delta < 10^{-6}$).
- **Score Calibration:** Raw transition probabilities normalized via sigmoid calibration:
  $$\text{Confidence} = \frac{1}{1 + e^{-k(s - s_0)}}$$
  yielding a calibrated confidence between $0.0$ and $1.0$.

---

## 5. Conclusion

The RCA pipeline executes reliably without external dependencies or mock data fallbacks. All fail-closed gates enforce strict human-in-the-loop validation prior to executing automated infrastructure runbooks.
