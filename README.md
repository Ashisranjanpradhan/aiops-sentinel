# AIOps Sentinel

A Production-Grade Software Reliability and Engineering Intelligence Platform.

AIOps Sentinel is an autonomous operational reliability platform designed for microservice environments. It continuously correlates distributed telemetry, executes topological root cause analysis across service dependency graphs, enforces release safety gates prior to production deployment, and performs static code analysis to audit codebases for production readiness.

---

## 1. Live Cloud Deployments and Quick Access

| Resource | Live Production URL | Purpose and Architecture | Status |
| :--- | :--- | :--- | :--- |
| Hosted Webapp Console | https://aiops-sentinel-frontend.onrender.com | Dynamic Next.js 14 enterprise console (Overview, RCA, Topology, ArchMind, DeployGuard) | Live (HTTP 200) |
| Operator Login | https://aiops-sentinel-frontend.onrender.com/login | Authenticated entry point with secure credentials and RBAC session management | Live (HTTP 200) |
| Dedicated Signup | https://aiops-sentinel-frontend.onrender.com/signup | Public user registration view with client-side password policy validation | Live (HTTP 200) |
| Backend API Docs | https://aiops-sentinel-backend.onrender.com/docs | Interactive OpenAPI 3.0 Swagger UI documenting all Sentinel REST endpoints | Live (HTTP 200) |
| Readiness Health Check | https://aiops-sentinel-backend.onrender.com/api/v1/health/ready | Deep readiness probe verifying database pool connectivity | Live (HTTP 200) |
| Public Documentation Portal | https://ashisranjanpradhan.github.io/aiops-sentinel/ | Static marketing and technical documentation hosted on GitHub Pages | Live (HTTP 200) |
| Source Code Repository | https://github.com/Ashisranjanpradhan/aiops-sentinel | Public GitHub source with automated CI/CD deployment pipelines | Active |

### Cloud Infrastructure and Free-Tier Cold Starts

The live demonstration services are hosted on Render cloud infrastructure. On free tiers, Render automatically spins down web services after periods of inactivity. If accessing the console or API after an idle period, the initial container wake-up may take 30 to 60 seconds. Subsequent page navigation, API requests, and interactive features are fast and responsive.

---

## 2. Platform Authentication and Access

To maintain realistic security hygiene, production administrative credentials are not published in public documentation. Reviewers, operators, and evaluators can access the live application using the pre-seeded read-only demo account or by creating an account via self-service registration.

### Read-Only Evaluation Account

| Parameter | Value | Notes |
| :--- | :--- | :--- |
| Login Portal | https://aiops-sentinel-frontend.onrender.com/login | Available locally at http://localhost:3000/login |
| Email Address | demo@aiops.sentinel | Read-only demo account for reviewers and evaluators |
| Password | SentinelDemo1234! | Complies with enterprise password policy |
| Assigned Role | viewer | Read-only access across Overview, Services, Incidents, Topology, Deployments, and Settings |

### Self-Service Registration

Evaluators who prefer an independent account can register directly at `/signup` or `/register`.

- Password Requirements: Minimum 8 characters, containing at least one uppercase letter (A-Z), one lowercase letter (a-z), and one numerical digit (0-9).
- Assigned Role: Newly registered accounts receive the `analyst` role following the principle of least privilege.
- Duplicate Detection: Registrations with an existing email address return an HTTP 409 Conflict status code and display an inline error message.

### Administrative Access and Bootstrapping

Production administrative credentials are provisioned securely via protected server-side environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD`). In local development, administrative accounts can be initialized using the local seeding script:

```bash
./.venv/bin/python scripts/seed-dev-user.py
```

### Security Safeguards

- Password Hashing: Argon2id (time_cost=2, memory_cost=19456, parallelism=1).
- Brute-Force Defense: Sliding-window login rate limiting locking client IP for 300 seconds after 5 consecutive failed attempts.
- Session Management: Secure HttpOnly session cookies (`aiops_session`) combined with standard `Authorization: Bearer <token>` support.
- Role Hierarchy: viewer < analyst < operator < admin.

---

## 3. System Architecture

AIOps Sentinel utilizes a decoupled, high-performance architecture separating static documentation from containerized dynamic cloud workloads:

```text
+-----------------------------------------------------------------------------------+
|               Tier 1: Static Edge & Public Documentation (GitHub Pages)           |
|                                                                                   |
|   ashisranjanpradhan.github.io/aiops-sentinel/ (Public Landing, Docs, Manifesto)  |
|         |                                                                         |
|         +---> Direct Link to Console: aiops-sentinel-frontend.onrender.com        |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                  Tier 2: Dynamic Cloud Workload (Render Platform)                 |
|                                                                                   |
|   +---------------------------------------------------------------------------+   |
|   | Frontend Container (Node.js 20 / Next.js 14 App Router)                   |   |
|   | - Server-Side Rendering (SSR) & Standalone Container Output               |   |
|   | - Dynamic Runtime BFF Proxy: /api/v1/[[...path]] (preserves cookies/auth) |   |
|   +---------------------------------------------------------------------------+   |
|                                         |                                         |
|                                         v (Internal HTTP Reverse Proxy)           |
|   +---------------------------------------------------------------------------+   |
|   | Backend Container (Python 3.11 / FastAPI Asynchronous Engine)             |   |
|   | - OpenAPI / REST Endpoints (/api/v1/*)                                    |   |
|   | - AsyncPG Connection Pool (PostgreSQL 16)                                 |   |
|   | - Background Alert Worker with PostgreSQL Advisory Locking                |   |
|   |                                                                           |   |
|   | Core Reliability Engines:                                                 |   |
|   | [1] Random Walk with Restart (RWR) Topological RCA Engine                 |   |
|   | [2] ArchMind Static AST 10-Dimension Codebase Scanner                     |   |
|   | [3] DeployGuard Preflight Release Safety Gate Engine                      |   |
|   | [4] Runbook Remediation Engine (Dry-Run & Execution History)              |   |
|   +---------------------------------------------------------------------------+   |
|                                         |                                         |
|                                         v                                         |
|   +---------------------------------------------------------------------------+   |
|   | Managed Storage: PostgreSQL 16 Database (aiops-sentinel-db)               |   |
|   | - Relational schema, Alembic migrations, session stores, audit logs       |   |
|   +---------------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------+
                                          |
                                          v (Optional Ingress Adapters)
+-----------------------------------------------------------------------------------+
|               Tier 3: Multi-Modal Telemetry Ingress (Self-Hosted / Managed)       |
|                                                                                   |
|   Prometheus (PromQL)      Loki (LogQL)               Tempo (TraceQL)             |
|   Metric Golden Signals    Structured Error Spans     Distributed Trace Spans     |
+-----------------------------------------------------------------------------------+
```

### Technology Stack Summary

| Layer | Technology | Primary Function |
| :--- | :--- | :--- |
| Frontend Framework | Next.js 14 (App Router) | Server-Side Rendering (SSR), standalone Docker container, responsive operator dashboards |
| API Gateway / Proxy | Next.js Dynamic Route Handler | Dynamic BFF runtime proxy forwarding `/api/v1/*` with full cookie and header preservation |
| Backend Framework | FastAPI + Pydantic v2 | High-performance asynchronous REST API with strict type validation and OpenAPI documentation |
| Database and ORM | PostgreSQL 16 + SQLAlchemy Async | AsyncPG connection pool (pool_size=10, max_overflow=20), Alembic database migrations |
| Authentication | PyJWT + Argon2id | Cryptographic JWT tokens, HttpOnly cookies, sliding-window lockout defense |
| Telemetry Ingress | Prometheus, Loki, Tempo | Multi-modal telemetry querying via native REST adapters with SSRF validation |
| Machine Learning | scikit-learn, NumPy, pandas | Isolation Forest, Robust Z-Score, EWMA shift detection, RCAEval benchmark runner |
| Static Documentation | GitHub Pages + GitHub Actions | Decoupled documentation website built automatically from `gh-pages/` branch |

---

## 4. Core Platform Capabilities

### Pillar 1: Runtime Reliability and Topological Root Cause Analysis (RCA)

- Topological Causal Ranking: Computes steady-state probability vectors over directed microservice dependency graphs using Random Walk with Restart (RWR) to isolate and rank root causes. Empirical evaluation over 60 curated RCAEval benchmark episodes demonstrates 0.784 Mean Reciprocal Rank (MRR), 68.3% Top-1 accuracy, 86.7% Top-3 accuracy, and 93.3% Top-5 accuracy.
- Multi-Modal Evidence Ingestion: Simultaneously correlates golden signals (latency, error rate, saturation) from Prometheus, error log spikes from Loki, and distributed trace error spans from Tempo.
- Human-in-the-Loop Remediation: Recommends verified operational runbooks (`restart_service`, `scale_deployment`, `clear_cache`, `rollback_release`) with interactive dry-run execution guards and full audit event history.
- Durable Alert Evaluator: Multi-replica worker daemon using PostgreSQL session-level advisory locks (`pg_try_advisory_lock(424242)`) to eliminate duplicate evaluations and prevent flapping incidents.

### Telemetry Provenance and Benchmark Separation

- Live Console Demonstration: Uses simulated incident scenarios with illustrative telemetry (e.g., payment gateway timeouts cascading to checkout service latency surges) to demonstrate interactive topology visualization, evidence cards, and runbook dry-runs.
- Algorithmic Benchmark Evaluation: Measured exclusively against the 60 curated RCAEval benchmark episodes derived from real-world microservice fault scenarios (Online Boutique, Sock Shop, Train Ticket) without synthetic blending.

### Pillar 2: ArchMind Codebase Production-Readiness

- Zero-Execution Code Sandbox: Evaluates codebases entirely through safe static AST analysis without executing untrusted user code.
- Archive Extraction Defenses: Hardened ZIP extraction rejecting Zip-Slip path traversals, Zip-Bomb compression ratios (>100:1), encrypted archives, and symbolic links.
- 10-Dimension Evaluation Rubric:
  1. Security Vulnerabilities: Hardcoded API keys, SQL injection vectors, SSRF patterns.
  2. Scalability: Blocking I/O inside async event loops, unbounded queries, connection pool exhaustion.
  3. Observability: Structured logging coverage, trace context propagation, metric counters.
  4. Resilience: Circuit breakers, retry backoff policies, fallback logic.
  5. Dependency Risk: Deprecated packages, high CVE exposure, single-maintainer risks.
  6. Performance: N+1 database queries, unindexed lookups, memory leak indicators.
  7. Maintainability: Cyclomatic complexity, code duplication, modularity depth.
  8. Compliance and Privacy: PII leakage patterns, GDPR/HIPAA compliance heuristics.
  9. API Design: RESTful standard adherence, OpenAPI schema completeness, status code hygiene.
  10. Reliability: Graceful shutdown handlers, health probe implementations, exception hygiene.
- Export Standards: Downloadable OASIS SARIF v2.1.0 and standalone sanitized HTML reports.

### Pillar 3: DeployGuard Release Preflight Verification Gates

- Downstream Blast-Radius Analysis: Evaluates dependency call graphs to project cascading failure impact before code promotion.
- Canary Error Budget Gating: Measures latency inflation and error drift against active SLO budgets during rollout windows.
- Database Schema Drift Detection: Verifies that pending DDL migrations and configuration changes remain backward-compatible.
- Automated Rollback Triggers: Instantly triggers rollback runbooks when canary health thresholds are violated.

### Pillar 4: Public Enterprise SaaS and Developer Portal

- Public Developer Portal: Unauthenticated landing page (`/`), architecture manifesto (`/about`), feature deep-dives (`/features`), and research foundations (`/research`).
- Contact Enquiry Triage Queue: Production contact form (`/contact`) with anti-bot honeypot fields, rate limiting, and an authenticated administrative management queue (`/settings/enquiries`).
- Universal Theme Engine: Seamless Light, Dark, and System theme synchronization persisted in `localStorage: aiops_theme` with anti-FOUC inline hydration.

---

## 5. Local Development Quick Start

### Prerequisites

- Python: 3.11 or higher
- Node.js: 20.x or higher
- Database: SQLite (built-in default) or PostgreSQL 16
- Docker: (Optional) Docker Compose 2.20+

### Option A: Local Process Development

```bash
# 1. Clone repository
git clone https://github.com/Ashisranjanpradhan/aiops-sentinel.git
cd aiops-sentinel

# 2. Setup Python environment and install dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

# 3. Seed initial database and admin user
python3 scripts/seed-dev-user.py

# 4. Start FastAPI backend (port 8000)
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
cd ..

# 5. Install frontend dependencies and start Next.js (port 3000)
cd frontend
npm ci
npm run dev
```

Open your browser at `http://localhost:3000` and log in with:
- Email: `admin@aiops.sentinel`
- Password: `SentinelAdmin1234!` (or `sentinel-admin-1234`)

### Option B: Docker Compose Full Stack

```bash
# Launch Next.js, FastAPI, PostgreSQL, Redis, Prometheus, and Grafana
docker compose -f docker-compose.yml up --build -d

# Verify all services are healthy
docker compose ps
```

---

## 6. Complete Application Route Matrix

The Next.js 14 frontend compiles 28 routes with zero type errors:

| Route | Rendering Type | Access Level | Purpose and Capabilities |
| :--- | :--- | :--- | :--- |
| `/` | Static (SSG) | Public | Marketing homepage with product overview, architecture summary, and console launcher |
| `/about` | Static (SSG) | Public | Architectural manifesto and engineering principles behind Sentinel |
| `/features` | Static (SSG) | Public | Deep-dive documentation on runtime reliability, ArchMind, and DeployGuard |
| `/research` | Static (SSG) | Public | Academic research foundations, RCAEval benchmarks, and RWR mathematics |
| `/docs` | Static (SSG) | Public | Platform documentation, configuration guides, and integration reference |
| `/contact` | Static (SSG) | Public | Enterprise pilot inquiry form protected by anti-bot honeypots |
| `/privacy` | Static (SSG) | Public | Privacy policy and data retention disclosures |
| `/terms` | Static (SSG) | Public | Terms of service and enterprise SLA terms |
| `/login` | Static (SSG) | Public / Auth | Authentication entry point with credentials and session handling |
| `/signup` | Static (SSG) | Public / Auth | Dedicated registration view with password policy checks |
| `/register` | Static (SSG) | Public / Auth | Route alias for account registration |
| `/overview` | Static (SSG) | Authenticated | System overview, active incident count, MTTD, MTTR, and service health |
| `/services` | Static (SSG) | Authenticated | Service registry with latency, error rate, and throughput metrics |
| `/services/[serviceId]` | Dynamic (SSR) | Authenticated | Service detail view with telemetry graphs, recent errors, and logs |
| `/incidents` | Static (SSG) | Authenticated | Incident triage queue with status, severity filters, and trigger buttons |
| `/incidents/[incidentId]` | Dynamic (SSR) | Authenticated | RCA investigation view, topology graph, evidence cards, and runbooks |
| `/topology` | Static (SSG) | Authenticated | Interactive service dependency topology graph |
| `/deployments` | Static (SSG) | Authenticated | DeployGuard release verification status and canary evaluation history |
| `/experiments` | Static (SSG) | Authenticated | Machine learning benchmark experiments and dataset runs |
| `/experiments/[runId]` | Dynamic (SSR) | Authenticated | Experiment detail view with precision, recall, and artifact downloads |
| `/datasets` | Static (SSG) | Authenticated | RCA benchmark dataset registry and manifest inspector |
| `/alert-rules` | Static (SSG) | Authenticated | Metric threshold alert rules manager and notification configuration |
| `/codebase-assessments` | Static (SSG) | Authenticated | ArchMind static codebase scan history and risk scores |
| `/codebase-assessments/new` | Static (SSG) | Authenticated | Codebase archive upload and scan initiation view |
| `/codebase-assessments/[assessmentId]` | Dynamic (SSR) | Authenticated | 10-dimension assessment scorecard, findings, and SARIF export |
| `/profile` | Static (SSG) | Authenticated | User profile management, timezone settings, and password updates |
| `/settings` | Static (SSG) | Authenticated | Telemetry data source connectivity (Prometheus, Loki, Tempo) |
| `/settings/enquiries` | Static (SSG) | Admin / Operator | Contact inquiry triage queue for enterprise requests |
| `/api/v1/[[...path]]` | Dynamic (BFF) | Proxy | Dynamic runtime reverse proxy forwarding requests to the FastAPI backend |

---

## 7. Backend REST API Specification

Interactive OpenAPI documentation is live at [`/docs`](https://aiops-sentinel-backend.onrender.com/docs) (Swagger UI) and [`/redoc`](https://aiops-sentinel-backend.onrender.com/redoc).

| Domain | Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| Health | GET | `/api/v1/health/live` | Liveness probe verifying process responsiveness | None |
| Health | GET | `/api/v1/health/ready` | Readiness probe checking database connectivity | None |
| Meta | GET | `/api/v1/meta` | System metadata, active features, and version | None |
| Auth | POST | `/api/v1/auth/register` | Self-service registration (enforces password complexity) | None |
| Auth | POST | `/api/v1/auth/login` | Authenticate user, issue JWT token and HttpOnly cookies | None |
| Auth | POST | `/api/v1/auth/refresh` | Rotate access token using active refresh token | Cookie / Bearer |
| Auth | POST | `/api/v1/auth/logout` | Revoke session cookies and active token | None |
| Auth | GET | `/api/v1/auth/me` | Fetch active authenticated user profile and role | Bearer / Cookie |
| Auth | POST | `/api/v1/auth/password` | Change user password verifying current credentials | Bearer / Cookie |
| Overview | GET | `/api/v1/overview/summary` | Executive reliability summary, MTTD, MTTR, incident count | Bearer / Cookie |
| Services | GET | `/api/v1/services` | List registered microservice workloads | Bearer / Cookie |
| Services | GET | `/api/v1/services/{id}` | Inspect service details and current health status | Bearer / Cookie |
| Incidents | GET | `/api/v1/incidents` | List operational incidents with severity/status filters | Bearer / Cookie |
| Incidents | GET | `/api/v1/incidents/{id}` | Detailed incident investigation with ranked root causes | Bearer / Cookie |
| Incidents | POST | `/api/v1/investigations/trigger` | Trigger on-demand Root Cause Analysis (RWR algorithm) | Operator+ |
| Remediation | GET | `/api/v1/remediations/runbooks` | List available operational runbooks | Operator+ |
| Remediation | POST | `/api/v1/remediations/runbooks/execute` | Execute or dry-run remediation runbook | Operator+ |
| Topology | GET | `/api/v1/topology` | Export microservice dependency call graph | Bearer / Cookie |
| Deployments | GET | `/api/v1/deployments` | List deployment events and preflight decisions | Bearer / Cookie |
| Deployments | POST | `/api/v1/deployments/preflight` | Evaluate preflight release risk and blast radius | Operator+ |
| Assessments | GET | `/api/v1/assessments` | List ArchMind codebase assessments | Bearer / Cookie |
| Assessments | POST | `/api/v1/assessments/upload` | Upload codebase archive for static AST analysis | Bearer / Cookie |
| Assessments | GET | `/api/v1/assessments/{id}/export` | Export assessment as OASIS SARIF v2.1.0 or HTML | Bearer / Cookie |
| Contact | POST | `/api/v1/contact/submit` | Submit enterprise sales/pilot enquiry (honeypot protected) | None |
| Contact | GET | `/api/v1/contact/enquiries` | Administrative enquiry triage queue | Admin / Operator |

---

## 8. Machine Learning and Benchmarking Methodology

AIOps Sentinel implements truthful, reproducible research evaluation using the RCAEval benchmark suite:

### Anomaly Detectors

- Robust Z-Score Detector: Computes Median Absolute Deviation (MAD) over rolling windows to detect sudden spikes while resisting extreme outlier corruption.
- EWMA Shift Detector: Tracks Exponentially Weighted Moving Average deviations to capture sustained level shifts and trend drift.
- Isolation Forest: Multi-variate tree-based unsupervised detector isolating anomalous multi-dimensional metric points.

### Topological Root Cause Localization (Random Walk with Restart)

Given an incident trigger, the system constructs a column-stochastic transition matrix P over the service dependency graph G = (V, E). The Random Walk with Restart algorithm iteratively computes the stationary distribution:

r_{t+1} = (1 - c) * P^T * r_t + c * v_0

where:
- c in (0, 1) represents the restart probability (typically set to 0.15).
- v_0 represents the personalization vector derived from multi-modal anomaly severity scores across metrics, logs, and distributed trace spans.
- The resulting steady-state probability vector ranks candidate microservice root causes with calibrated confidence scores.

### Empirical Benchmark Results (60 Curated RCAEval Episodes)

| Metric | Evaluated Score | Baseline Reference | Interpretation |
| :--- | :--- | :--- | :--- |
| Mean Reciprocal Rank (MRR) | 0.784 | 0.612 | Average reciprocal rank of the ground-truth root cause node |
| Top-1 Accuracy (A@1) | 68.3% | 45.0% | Ground-truth root cause identified as rank #1 |
| Top-3 Accuracy (A@3) | 86.7% | 68.3% | Ground-truth root cause identified within top 3 ranked candidates |
| Top-5 Accuracy (A@5) | 93.3% | 81.7% | Ground-truth root cause identified within top 5 ranked candidates |

---

## 9. Automated Quality Gates and Test Verification

The platform is validated by an automated test harness covering all application tiers:

### Playwright End-to-End Suite (69/69 Tests Passed)

Tested across Desktop Chrome (1440x900), Tablet iPad (768x1024), and Mobile Pixel (393x851):

- `dashboard-statistics.spec.ts`: Operational statistics verification across overview metrics, microservice golden signals, incident investigations, topological RCA ranking, dependency topology graphs, and ArchMind codebase scorecards (18 tests).
- `signup-flow.spec.ts`: Direct `/signup` navigation, password policy validation, successful registration, and duplicate email rejection (15 tests).
- `acceptance.spec.ts`: Session lifecycle, route navigation, codebase assessment, detail views, and admin runbook execution (18 tests).
- `public-saas.spec.ts`: Public homepage, navigation routing, theme toggle persistence, and contact enquiry submissions (18 tests).

Command to execute end-to-end tests:
```bash
cd frontend && PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000 npx playwright test
```

Execution Result: 69 passed in 44.7s.

### Backend Pytest Suite (64/64 Tests Passed)

- Full end-to-end RCA pipeline: alert evaluation -> incident generation -> RWR ranking -> runbook execution.
- JWT authentication, rate limiting, and RBAC authorization verification.
- ArchMind AST analyzer, multi-language scanners, and Zip-Slip/Zip-Bomb security boundaries.
- Contact enquiry rate limiting and honeypot spam defenses.
- Telemetry SSRF protection and non-fabrication truthfulness validation.

Command to execute backend tests:
```bash
source .venv/bin/activate && pytest backend/tests/ -v
```

Execution Result: 64 passed in 16.65s.

---

## 10. Technical Reports and Engineering Deliverables

Comprehensive engineering artifacts and audit reports are maintained in the repository root:

| Report | Path | Scope and Focus |
| :--- | :--- | :--- |
| Production Readiness Report | [PRODUCTION_READINESS_REPORT.md](./PRODUCTION_READINESS_REPORT.md) | Infrastructure, cloud deployment verification, and operational readiness |
| Deployment Runbook | [DEPLOYMENT_RUNBOOK.md](./DEPLOYMENT_RUNBOOK.md) | Step-by-step production deployment instructions for Render, Docker, and Kubernetes |
| Authentication Security Report | [AUTHENTICATION_SECURITY_REPORT.md](./AUTHENTICATION_SECURITY_REPORT.md) | Threat modeling, JWT security, password policies, and RBAC matrix |
| RCA End-to-End Test Report | [RCA_END_TO_END_TEST_REPORT.md](./RCA_END_TO_END_TEST_REPORT.md) | Topological causal ranking verification, RWR convergence, and runbook tests |
| Browser Acceptance Test Report | [BROWSER_ACCEPTANCE_TEST_REPORT.md](./BROWSER_ACCEPTANCE_TEST_REPORT.md) | Playwright test execution results across Desktop, Tablet, and Mobile viewports |
| ArchMind Acceptance Report | [ARCHMIND_ACCEPTANCE_TEST_REPORT.md](./ARCHMIND_ACCEPTANCE_TEST_REPORT.md) | 10-dimension static analysis engine and zero-execution sandbox isolation evidence |
| Production Environment Guide | [PRODUCTION_ENVIRONMENT_VARIABLES.md](./PRODUCTION_ENVIRONMENT_VARIABLES.md) | Exhaustive environment variable reference with default and production configurations |

---

## 11. License

Distributed under the MIT License. See [LICENSE](./LICENSE) for full licensing information.
