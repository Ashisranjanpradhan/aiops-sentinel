# AIOps Sentinel — SRE & Operations Runbook

## 1. Overview & Operational Responsibilities

This runbook establishes standard operating procedures (SOPs) for Site Reliability Engineers (SREs), system operators, and incident commanders managing production deployments of **AIOps Sentinel**.

---

## 2. Real-Time Telemetry & Health Monitoring

### Key Golden Signals & Metrics Endpoints
- **Prometheus Metrics**: `GET http://<backend-host>:8000/metrics`
- **Application Liveness**: `GET http://<backend-host>:8000/api/v1/health/live` (Checks process health, returns 200)
- **Application Readiness**: `GET http://<backend-host>:8000/api/v1/health/ready` (Checks PostgreSQL pool, Redis connection, and storage availability)

### Critical Alerting Thresholds
| Metric / Condition | Threshold | Severity | Immediate Action |
| :--- | :--- | :--- | :--- |
| `http_requests_total{status_code=~"5.."}` | > 1.0% of total over 5m | Critical | Inspect backend logs; check database pool |
| `http_request_duration_seconds{quantile="0.99"}` | > 500ms over 5m | High | Check database slow queries, scale backend |
| `task_queue_depth` | > 50 pending jobs for 10m | High | Scale background worker replicas |
| `active_db_connections` | > 85% of max pool size | High | Check connection leaks, increase PgBouncer limit |
| Alert Evaluator Missing Heartbeat | > 90s without evaluation | Critical | Inspect leader lock in PostgreSQL |

---

## 3. Incident Investigation & Triage Workflow (Pillar A)

When a runtime anomaly is detected in monitored microservices:
1. **Navigate to Incidents View** (`/incidents`): Filter by `severity="critical"` and `status="open"`.
2. **Acknowledge Incident**: Click **Acknowledge** to record ownership in the audit ledger and prevent duplicate paging.
3. **Trigger RCA Investigation**:
   - Click **Run Investigation**. The system executes the Root Cause Analysis engine across multivariate telemetry, topological dependencies, and error propagation graphs.
   - Inspect ranked candidate services with calibrated confidence scores and natural-language causal explanations.
4. **Inspect Correlated Evidence**:
   - Review correlated metric anomaly series (Z-score/EWMA deviations), error log spikes from Loki, and distributed trace spans from Tempo.
5. **Mitigation / Safe Remediation**:
   - See Section 4 below for authorized runbook execution.

---

## 4. Remediation Runbook Execution (Safe Operations)

AIOps Sentinel prohibits arbitrary shell command execution. All automated operations must execute through the safe, pre-approved runbook engine (`/api/v1/incidents/{id}/remediations`):

### Permitted Runbooks
1. **`restart_pod`** (Graceful Container Restart):
   - **Risk Level**: Moderate.
   - **Parameters**: `grace_period_seconds` (default: 30, max: 300).
   - **Action**: Issues rolling container restart to target service pod group.
2. **`rollback_deployment`** (Release Rollback):
   - **Risk Level**: High.
   - **Parameters**: `target_revision` (optional integer).
   - **Requirement**: Mandatory operator `approval_notes` describing rollback justification.
3. **`scale_replicas`** (Horizontal Pod Scaling):
   - **Risk Level**: Moderate.
   - **Parameters**: `replicas` (integer bounded strictly between 1 and 20).
   - **Action**: Adjusts replica count to absorb traffic burst or alleviate queue backlogs.
4. **`toggle_circuit_breaker`** (Circuit Breaker Override):
   - **Risk Level**: High.
   - **Parameters**: `state` (`"open"`, `"closed"`, or `"half-open"`).
   - **Action**: Forces circuit breaker trip to protect downstream database or callee from cascading collapse.

### Operator Execution Checklist
- [ ] Verify target service identity and environment.
- [ ] Review blast radius: inspect upstream ingress callers and downstream microservices.
- [ ] Set `human_approval_confirmed=true`.
- [ ] Provide clear operational rationale in `approval_notes`.
- [ ] Verify execution status in the Incident Timeline.

---

## 5. Background Worker & Distributed Advisory Lock

The Alert Evaluator daemon (`scripts/run-alert-worker.py`) evaluates active alert rules every 15–30 seconds. To prevent duplicate alert triggering or flapping incidents across multi-replica deployments, it uses PostgreSQL session advisory locking (`pg_try_advisory_lock(424242)`).

### Diagnosing Lock Contention
```sql
-- Check which PostgreSQL session currently holds the alert evaluator lock
SELECT pid, locktype, mode, granted 
FROM pg_locks 
WHERE objid = 424242;

-- View details of the active worker session
SELECT pid, usename, client_addr, application_name, state, query_start 
FROM pg_stat_activity 
WHERE pid = (SELECT pid FROM pg_locks WHERE objid = 424242 LIMIT 1);
```

If a worker pod crashes hard and the network socket lingers, PostgreSQL releases the lock automatically upon TCP keepalive expiration (~60s). To manually break a stale connection:
```sql
SELECT pg_terminate_backend(<pid>);
```

---

## 6. Durable Task Queue & Dead-Letter Queue (DLQ) Remediation

Codebase production-readiness assessments and asynchronous ML jobs execute via `TaskQueue` (`backend/app/services/queue_service.py`).

### Inspecting Queue Status
```bash
# Check Redis queue length
docker exec -it aiops-prod-redis redis-cli LLEN queue:assessment_jobs

# Check Dead-Letter Queue (DLQ) length
docker exec -it aiops-prod-redis redis-cli LLEN queue:assessment_jobs:dlq
```

### Reprocessing DLQ Items
If tasks fail after maximum retry attempts (exponential backoff: 3 retries), they are isolated into the DLQ. To inspect a failed task payload:
```bash
docker exec -it aiops-prod-redis redis-cli LINDEX queue:assessment_jobs:dlq -1
```

---

## 7. Telemetry Outage & Truthful Fallback Procedures

In production (`APP_ENV=production`), **simulated fallback is strictly disabled**. If Prometheus, Loki, or Tempo are unreachable:
1. The platform truthfully marks status as `"unavailable"`.
2. No fabricated synthetic metrics or hallucinated logs are generated.
3. System logs log warnings: `Prometheus connection error: ... Truthful fallback active`.

### Restoration Steps
```bash
# Test Prometheus reachability from backend container
docker compose -f docker-compose.prod.yml exec backend curl -s http://prometheus:9090/-/healthy

# Test Loki reachability
docker compose -f docker-compose.prod.yml exec backend curl -s http://loki:3100/ready

# Test Tempo reachability
docker compose -f docker-compose.prod.yml exec backend curl -s http://tempo:3200/ready
```

---

## 8. Secret Rotation Runbook

To rotate application JWT secrets or session secrets:
1. Generate new 32-byte secret: `openssl rand -hex 32`
2. Update `.env` (or Kubernetes Secret `aiops-production-secrets`).
3. Perform rolling restart of `backend` and `worker` pods.
4. Note: Existing user sessions will expire and require re-authentication; active refresh tokens using the old secret will gracefully reject and redirect users to `/login`.
