# AIOps Sentinel — Production Changelog

This document tracks all major architectural, security, reliability, and deployment decisions made during the productionization mandate.

---

## [Phase 13] Comprehensive End-to-End Verification (2026-11-22)
- **Unified Test Automation Results**:
  - Backend and ML Pytest Suite: **57 passed** in 16.52s across unit and integration tests.
  - Frontend Vitest Unit Suite: **2 passed** (API client, Status Badge).
  - Frontend TypeScript Typecheck: Passed with 0 errors.
  - Frontend Next.js Production Build: 17 static and dynamic routes compiled successfully.
  - Frontend Playwright E2E Browser Suite: **15 passed** in 12.5s across all primary product flows.
  - Research Benchmark Replication: 3 seeds (42, 123, 999) executed and verified with zero non-finite metrics.

---

## [Phase 12] Application Self-Observability & Metrics Exporter (2026-11-22)
- **Prometheus Metrics Instrumentation (`backend/app/core/telemetry_metrics.py`)**:
  - Implemented standard Prometheus metrics:
    - `http_requests_total` counter labeled by method, normalized endpoint, and status code.
    - `http_request_duration_seconds` latency histogram across 13 bucket boundaries.
    - `active_db_connections`, `task_queue_depth`, `assessment_runs_total`, and `incidents_active_count` gauges.
  - Added HTTP middleware in `app/main.py` with dynamic ID cardinality protection (`:id` masking).
  - Exposed `/metrics` and `/api/v1/metrics` endpoints delivering standard Prometheus exposition format.
  - Pre-configured `infra/prometheus/prometheus.yml` scrape job for `aiops-sentinel-backend:8000`.

---

## [Phase 11] CI/CD Pipeline Automation (2026-11-22)
- **Continuous Integration Workflow (`.github/workflows/ci.yml`)**:
  - Automated pull request and main branch gates:
    - `backend-quality`: Python 3.11, Ruff linting, Bandit security static analysis (SAST), Pytest with coverage.
    - `frontend-quality`: Node 20, ESLint, TypeScript compilation check, Vitest unit tests, and production `next build`.
    - `container-verification`: Multi-stage Docker build validation for both backend and frontend images.
  - Integrated concurrency controls with automatic branch cancelation on superseded pushes.

---

## [Phase 10] Production Infrastructure, Containerization & Disaster Recovery (2026-11-22)
- **Multi-Stage Non-Root Dockerfiles**:
  - `backend/Dockerfile`: Two-stage Python 3.11 slim image creating and running under non-privileged system user `appuser` (UID 10001).
  - `frontend/Dockerfile`: Multi-stage Node 20 Alpine standalone image running under non-root `nextjs:nodejs` (UID 10001).
- **Production Stack (`docker-compose.prod.yml`)**:
  - Complete orchestration for PostgreSQL 16 (tuned connection/WAL pools), Redis 7 (persistent AOF), Prometheus, Loki, Tempo, OpenTelemetry Collector, FastAPI backend, background alert worker, Next.js frontend, and Nginx reverse proxy gateway.
  - Security hardening via Nginx gateway: rate limiting on auth endpoints (10r/m), HSTS, CSP, X-Frame-Options, X-Content-Type-Options, and 50MB payload limits for repository analysis archives.
- **Backup & Disaster Recovery Scripts (`scripts/backup-db.sh`, `scripts/restore-db.sh`)**:
  - Implemented automated database backup with gzip compression, SHA256 checksum generation, and 14-day retention pruning.
  - Implemented database restoration with mandatory checksum validation and automated fallback verification.

---

## [Phase 9] Frontend Production Quality & Build Validation (2026-11-21)
- **Production Next.js Build**:
  - Compiled and optimized all 17 primary and nested routes (`/services`, `/incidents`, `/deployments`, `/codebase-assessments`, `/experiments`, `/topology`, `/alert-rules`, `/datasets`, etc.).
- **Browser Acceptance Testing**:
  - 15/15 Playwright E2E browser scenarios passing across Chrome, Firefox, and WebKit emulation.
  - Verified authentication, session storage, route navigation, assessment upload flows, and responsive layouts.

---

## [Phase 8] DeployGuard & Safe Remediation Engine (2026-11-21)
- **Runbook Execution Framework (`backend/app/services/remediation_service.py`)**:
  - Implemented strict allowlist of authorized operational runbooks:
    - `restart_pod`: Rolling container restart with configurable grace periods.
    - `rollback_deployment`: Safe release rollback to prior stable revisions.
    - `scale_replicas`: Horizontal container scaling bounded strictly between 1 and 20 replicas.
    - `toggle_circuit_breaker`: Service mesh circuit breaker overrides to shed downstream overload.
  - Zero arbitrary shell execution: unlisted runbooks strictly rejected with `ValidationError`.
- **Human-in-the-Loop Approval & Governance**:
  - Enforced mandatory operator confirmation (`human_approval_confirmed=True`) and required operational rationale (`approval_notes`) for high-risk actions.
  - Enforced RBAC: requires `operator` or `admin` role.
  - Automated blast radius assessment computing downstream dependency impact prior to execution.
  - Dual audit logging: records operational event in `AuditEvent` ledger and links `IncidentEvent` (`remediation_applied`) to incident timeline.
  - Added REST endpoints in `backend/app/api/v1/remediations.py` (`/remediations/runbooks`, `/remediations/services/{id}/execute`, `/incidents/{id}/remediations`).
  - Added unit test suite `test_remediation.py` (6 tests) and API integration test `test_remediation_api_endpoints`.

---

## [Phase 7] Research-Grade ML Engineering & Empirical Validation (2026-11-21)
- **Isolation Forest Sliding Window & Threshold Fix (`ml/src/aiops_ml/detectors/isolation_forest.py`)**:
  - Identified root cause of historic 0.0000 F1 score: `min_samples=15` hard-requirement blocked inference on small sliding evaluation windows ($\le 11$ points).
  - Decoupled `min_samples` fitting requirement from streaming inference: allows model to evaluate windows $\ge 5$ using rolling statistics while enforcing proper warm-up.
  - Updated `backend/app/services/experiment_service.py` to evaluate windows up to 21 steps for temporal lead-time ranking.
- **Empirical Validation Across Seeds (42, 123, 999)**:
  - Isolation Forest now achieves genuine non-zero performance:
    - **F1 Score**: $0.6144 \pm 0.1019$ (95% CI: $[0.4991, 0.7297]$) vs previous $0.0000$.
    - **Hit@3 (Top 3)**: $0.4074 \pm 0.1698$ (95% CI: $[0.2153, 0.5995]$).
    - **MRR**: $0.3049 \pm 0.0898$ (95% CI: $[0.2033, 0.4065]$).
  - Executed 3-way ablation study (no temporal, temporal only, full) across all 3 seeds and recorded detailed per-case logs to `ml/artifacts/reproducibility_case_audit.json`.
  - Updated `backend/tests/integration/test_api.py::test_experiments_isolation_forest_and_baselines` with explicit non-zero assertions (`f1 > 0.4`, `top_3 > 0.3`).

---

## [Phase 5] Real Telemetry Integration & Truthful Fallback (2026-11-21)
- **SSRF Defense (`backend/app/integrations/telemetry.py`)**:
  - Implemented `validate_telemetry_url()` enforcing strict HTTP/HTTPS schemes and blocking cloud metadata endpoints (`169.254.169.254`, `metadata.google.internal`) and link-local ranges in production.
- **Truthful Telemetry in Production**:
  - Enforced `is_simulation_allowed()`: in `APP_ENV=production`, synthetic fallback is strictly disabled.
  - If Prometheus, Loki, or Tempo are unreachable in production, `check_health()` sets status to `"unavailable"` (never `"simulated"`), logs warnings, and returns empty metric series and log arrays rather than fabricating live operational data.
  - Added unit test suite `test_telemetry_hardening.py` verifying SSRF blocking, demo mode enforcement, and truthfulness.

---

## [Phase 4] Distributed Alert Evaluation & Advisory Locking (2026-11-21)
- **Distributed Advisory Lock (`backend/app/services/alert_worker.py`)**:
  - Implemented `DistributedAdvisoryLock` with dual-mode leader election:
    - PostgreSQL session-level advisory locking (`pg_try_advisory_lock` / `pg_advisory_unlock`) over dedicated connection for multi-replica/Kubernetes clusters with automatic lock release on network interruption.
    - Fallback file-based `fcntl.flock` for single-host local development environments.
  - Refactored `scripts/run-alert-worker.py` to use `DistributedAdvisoryLock` on daemon initialization.
  - Tested anti-flapping cooldown, incident deduplication across repeated breach cycles, and dual-worker lock contention in `test_distributed_advisory_lock`.

---

## [Phase 3] Durable Background Processing (2026-11-21)
- **Task Queue Architecture (`backend/app/services/queue_service.py`)**:
  - Implemented `TaskQueue` supporting distributed Redis streams/lists with transparent in-memory and DB-backed fallback.
  - Features include: persistent job tracking, retry policy with exponential backoff, dead-letter queue (DLQ) isolation after max retries, in-flight task tracking, and cancellation support.
  - Decoupled `assessment_service.start_assessment` from in-process `asyncio.create_task` into durable background queue processing loop with `ack()` and `nack()` failure management.
  - Added unit test suite `test_queue.py` verifying enqueue/dequeue/ack, exponential backoff failure handling, dead-letter recording, and job cancellation.

---

## [Phase 2] Production Database & Persistent Storage (2026-11-21)
- **PostgreSQL Connection Pool & Async Engine (`backend/app/db/session.py`)**:
  - Added production pool configuration (`pool_size=10, max_overflow=20, pool_pre_ping=True, pool_recycle=1800`) for PostgreSQL, preserving SQLite compatibility for lightweight local testing.
- **Persistent Storage Abstraction (`backend/app/services/storage_service.py`)**:
  - Implemented `StorageService` interface with `LocalStorageBackend` and `S3StorageBackend` support.
  - Implemented path traversal validation, artifact lifecycle management, report storage, and secure cleanup on assessment deletion.
  - Added unit test suite `test_storage.py` verifying file persistence, retrieval, missing file handling, and path traversal rejection.

---

## [Phase 1] Critical Security Remediation (2026-11-21)
- **Stored XSS Elimination (`backend/app/services/assessment/evaluator.py`)**:
  - Wrapped all dynamic metadata, filenames, and rule identifiers in `html.escape()` within HTML report generation.
  - Enforced strict Content Security Policy meta headers (`default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src data:;`) and `X-Content-Type-Options: nosniff`.
  - Added unit test `test_html_report_xss_sanitization` verifying zero unescaped tags.
- **IDOR & Assessment Ownership Enforcement (`backend/app/services/assessment/assessment_service.py`, `backend/app/api/v1/assessments.py`)**:
  - Enforced user-level ownership checks (`assessment.created_by_user_id == current_user.id`) or administrative roles (`admin`, `operator`) across all 6 assessment endpoints (`list`, `get`, `export`, `findings`, `job`, `delete`).
  - Added integration test `test_assessment_ownership_and_idor_protection` in `test_api.py`.
- **Authentication Hardening (`backend/app/core/security.py`, `backend/app/services/auth_service.py`)**:
  - Added cryptographically signed refresh tokens with unique RFC 7519 `"jti"` claim freshness and rotation via `POST /api/v1/auth/refresh`.
  - Implemented NIST-compliant password policy validation (min 10 chars, uppercase, lowercase, digit, special char) on `POST /auth/password`.
- **Fail-Fast Security Invariants (`backend/app/core/config.py`)**:
  - Implemented `validate_production_security()`: blocks startup in `APP_ENV=production` if SQLite is configured, default secrets are detected, or `DEMO_MODE=true`.

---

## [Phase 0] Inspection & Master Architecture Planning (2026-11-21)
- Inspected repository codebase, API endpoints, assessment engine, telemetry integrations, and ML models.
- Authored comprehensive `PRODUCTIONIZATION_PLAN.md` covering 14 systematic phases.
