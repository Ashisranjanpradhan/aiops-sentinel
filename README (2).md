# AIOps Sentinel

**An intelligent observability and incident-investigation platform for microservice systems.**

> Project specification and implementation contract. This README is the source of truth for the CLI coding agent and for human contributors. It describes the target product and the work to be built; it does not claim that the software has already been implemented.

---

## 1. Project overview

AIOps Sentinel is an end-to-end software reliability platform that collects and correlates metrics, logs, traces, service topology, and deployment context to:

1. Monitor a microservice application.
2. Detect abnormal system behaviour.
3. Create and manage incidents.
4. Rank likely root-cause services and indicators.
5. Explain each finding with observable evidence.
6. Measure the quality, latency, and resource cost of its ML models.
7. Present the results in a complete, production-style web application.

The first release focuses on **AIOps Sentinel: anomaly detection and root-cause analysis (RCA)**. Predictive deployment-risk analysis (DeployGuard) and deeper architecture intelligence (ArchMind) are later extensions. Do not expand the initial release into three separate products.

### 1.1 Product statement

> Help an engineering team move from “something is wrong” to “these are the most likely causes, this is the evidence, and these are the safest next steps” with less manual investigation.

### 1.2 Research statement

Investigate whether combining temporal telemetry patterns with microservice dependency information and cross-modal evidence can improve anomaly detection and root-cause localization compared with independent metric, log, and trace analysis.

The research hypothesis must be tested. Do not present it as a proven result before experiments have been completed.

### 1.3 Target users

- Site reliability engineers (SREs).
- DevOps and platform engineers.
- Backend and microservice developers.
- Engineering leads investigating production incidents.
- Researchers studying anomaly detection, AIOps, causal analysis, graph learning, and observability.

### 1.4 Project principles

- **Evidence before explanation:** Every detected anomaly and RCA result must link to the underlying time range, service, metric, log query, trace, or dataset case.
- **Human control:** The initial release recommends investigation steps; it does not autonomously alter production systems.
- **Reproducibility:** Dataset versions, preprocessing, splits, model versions, configurations, and random seeds must be recorded.
- **Honest UI:** Never display fabricated live telemetry, fake model scores, or made-up success metrics. Seeded examples must be clearly labelled as demo/synthetic data.
- **Testability:** Every route, form, action, API, data pipeline, and model component must have appropriate automated tests.
- **Useful failure states:** Loading, empty, stale, partial, unavailable, and error states are first-class UI states.
- **Security by default:** Never run untrusted commands or code on the host or against a production environment.

---

## 2. Scope and release strategy

Build this project in small, verifiable milestones. A working and tested vertical slice is more valuable than a large collection of unfinished pages.

### 2.1 Release 1 — AIOps Sentinel MVP

The MVP is complete only when all of the following work end to end:

- Local developer environment starts through documented commands.
- A demo microservice workload produces telemetry.
- Metrics, logs, and traces are accessible through their respective observability backends.
- The backend discovers and stores service inventory and relationships.
- At least one deterministic baseline anomaly detector is implemented and evaluated.
- The platform can create an incident from a detected anomaly or an explicitly initiated analysis.
- The investigation view displays ranked candidate root causes with supporting evidence.
- Users can acknowledge, assign, annotate, and resolve incidents.
- Model and dataset experiments can be listed and inspected.
- All visible pages and controls are connected to working routes and backend behaviour.
- Automated backend, frontend, integration, and browser tests pass.
- A clean Docker Compose setup and complete documentation are provided.

### 2.2 Release 2 — Research-grade intelligence

- Compare statistical, tree-based, and deep temporal anomaly detectors.
- Add dependency-aware root-cause ranking.
- Evaluate multi-source fusion of metrics, logs, and traces.
- Add confidence calibration and an explicit abstention/insufficient-evidence outcome.
- Add ablation studies, cross-system evaluation, and reproducible experiment reports.
- Evaluate a graph-learning model only after simpler graph and non-graph baselines are established.

### 2.3 Release 3 — AURA extensions

The eventual AURA reliability platform may incorporate:

- **DeployGuard:** estimate the risk associated with an upcoming deployment using change and historical deployment evidence.
- **ArchMind:** richer architecture and dependency intelligence from source repositories, service catalogs, and traces.
- **Controlled remediation:** approved runbook execution in an isolated environment, with explicit authorization and rollback controls.

These are roadmap items, not MVP requirements. Do not create non-functional navigation links for future features. A future feature must either have a working page or remain absent from the navigation.

### 2.4 Explicit non-goals for the MVP

- No autonomous production deployment, rollback, restart, scaling, or configuration changes.
- No arbitrary shell access exposed through the web application.
- No execution of untrusted repository code on the host machine.
- No dependence on a paid LLM API for core anomaly detection or RCA.
- No claim that correlation proves causation.
- No attempt to support every telemetry backend in the first release.
- No decorative chatbot, AI assistant avatar, or generic AI-themed landing page.

---

## 3. Proposed research direction

### 3.1 Main research question

**Can a temporal and dependency-aware multi-source analysis method improve anomaly detection and root-cause localization in microservice systems compared with independent single-source baselines?**

### 3.2 Supporting questions

1. Does temporal context improve detection compared with point-wise or window-statistical baselines?
2. Does a service dependency graph improve root-cause ranking compared with metric correlation alone?
3. Does combining metrics, logs, and traces improve localization when some telemetry sources are missing or noisy?
4. Can confidence calibration identify cases where the system should abstain instead of presenting an unreliable root cause?
5. What are the trade-offs between accuracy, detection delay, inference latency, memory use, and operational complexity?

### 3.3 Candidate model progression

Do not begin with a large complex model. Establish the baselines first.

| Stage | Candidate method | Purpose |
|---|---|---|
| Baseline A | Rolling robust z-score / median absolute deviation | Transparent metric anomaly baseline |
| Baseline B | EWMA or CUSUM | Detect shifts in streaming metrics |
| Baseline C | Isolation Forest | Unsupervised multivariate anomaly baseline |
| Baseline D | Metric-correlation and topology heuristics | Transparent RCA baseline |
| Research 1 | Temporal Convolutional Network (TCN) or LSTM autoencoder | Learn temporal patterns |
| Research 2 | GraphSAGE or GAT over service dependencies | Model dependency-aware context |
| Research 3 | Feature-level or score-level fusion of metrics, logs, and traces | Combine telemetry modalities |
| Research 4 | Calibration plus abstention threshold | Communicate uncertainty safely |

The research model may change after a literature review and baseline analysis. Record the reason for every significant change. Use PyTorch for custom neural models and PyTorch Geometric only when a graph-learning experiment is justified.

### 3.4 Candidate end-to-end method

A candidate research pipeline is:

1. Convert raw telemetry into aligned time windows.
2. Extract metric features such as level, slope, variance, rate of change, and missingness.
3. Parse and aggregate logs into event/template counts and error indicators.
4. Derive trace features such as latency distributions, error rates, span counts, and parent-child relationships.
5. Construct a directed service graph from service inventory and trace relationships.
6. Encode temporal evidence for each service.
7. Propagate or aggregate evidence over the dependency graph.
8. Fuse available modalities and rank candidate root causes.
9. Calibrate confidence and abstain when evidence is insufficient.
10. Return ranked services and indicators with references to source evidence.

This pipeline is a research proposal. Implement and measure each stage independently before claiming it improves the system.

### 3.5 Important scientific cautions

- A high correlation between a service metric and an incident does not prove that the service caused the incident.
- Root-cause labels in public benchmarks may describe injected faults, not every plausible operational explanation.
- Window-level random splits can leak information from the same failure case into training and test sets. Split by case, time, or system as appropriate.
- Fit scalers, feature selectors, and preprocessing transformations on training data only.
- Do not tune thresholds on the final test set.
- Report per-system and per-fault-type performance, not only a single aggregate score.
- Include confidence intervals or repeated-seed variation where feasible.
- Do not compare published numbers unless dataset versions, splits, metrics, and evaluation protocols are compatible.

---

## 4. Data and benchmark strategy

Use more than one source so the project is not evaluated on a single convenient dataset. Begin with small, documented subsets and scale up after the pipeline works.

### 4.1 Primary RCA benchmark — RCAEval

- Repository: <https://github.com/phamquiluan/RCAEval>
- Hugging Face dataset: <https://huggingface.co/datasets/phamquiluan/RCAEval>
- Zenodo record: <https://zenodo.org/records/15117188>
- Paper: <https://arxiv.org/abs/2412.17015>

RCAEval describes 735 failure cases across Online Boutique, Sock Shop, and Train Ticket, covering 11 fault types. The benchmark is organized into RE1, RE2, and RE3 suites. The suites differ in telemetry availability; RE2 and RE3 include multi-source telemetry, and RE3 includes code-level fault scenarios. Inspect the dataset card and individual suite contents before choosing an experiment.

Recommended usage:

- Start with a small RE1 subset for metric preprocessing and baseline RCA.
- Use RE2/RE3 for multi-source experiments after metric-only processing is reliable.
- Keep benchmark case identifiers and annotations in the experiment manifest.
- Do not put large raw dataset files into Git.
- Store download instructions, source URL, version/commit, checksum, license/terms, and preprocessing version in the dataset registry.

**License and terms:** Verify the current license and usage conditions for the exact dataset files and code before redistribution or commercial use. This README does not grant dataset rights.

### 4.2 Live telemetry — OpenTelemetry Demo

- Documentation: <https://opentelemetry.io/docs/demo/>
- Docker deployment: <https://opentelemetry.io/docs/demo/docker-deployment/>
- Source repository: <https://github.com/open-telemetry/opentelemetry-demo>

Use the OpenTelemetry Demo as the initial local microservice workload. It provides an instrumented application and telemetry examples. Use the deployment mode documented by the upstream project; a bare Compose file may not start all observability services. The upstream documentation currently notes that the full demo can require substantial local disk and memory, so offer a reduced/minimal setup for limited machines.

The live demo serves three purposes:

1. Verify the application can ingest real telemetry through standard interfaces.
2. Run controlled, repeatable fault scenarios in a local environment.
3. Demonstrate the product in a realistic, interactive setting.

### 4.3 Additional log benchmark — LogHub

- Repository: <https://github.com/logpai/loghub>
- Paper/project information: <https://github.com/logpai/loghub>

LogHub provides system log datasets such as HDFS and BGL. Use it for log parsing, event representation, and log anomaly experiments. It is not a substitute for a multi-source microservice benchmark. Check the individual dataset's usage terms and avoid redistributing raw logs unless permitted.

### 4.4 Additional AIOps benchmark — AIOps Challenge 2020

- Dataset repository: <https://github.com/AIOps-Lab-NKU/AIOps-Challenge-2020-Data>

The published dataset includes infrastructure/business metrics and trace data. Its repository describes non-commercial research/classroom usage conditions unless otherwise agreed with the organizers. Review the original terms before using it, and do not assume it is available for unrestricted commercial redistribution.

### 4.5 Optional agent benchmark — AIOpsLab

- Project page: <https://microsoft.github.io/AIOpsLab/>
- Repository: <https://github.com/microsoft/AIOpsLab>

AIOpsLab is a framework for deploying microservice environments, injecting faults, generating workloads, collecting telemetry, and evaluating AIOps agents. Consider it as a later reproducibility or agent-evaluation extension. Do not make it a hard dependency for the first local end-to-end release.

### 4.6 Dataset governance

For every imported dataset, record:

- Dataset name and version.
- Source URL and download date.
- License and permitted use.
- File checksums.
- Number of cases, records, services, and available modalities.
- Label definitions and known limitations.
- Preprocessing code version.
- Train/validation/test split manifest.
- Missing data and filtering decisions.

Never silently discard cases or labels. Every exclusion must have a documented reason.

---

## 5. System architecture

### 5.1 High-level component view

```mermaid
flowchart TB
    U[Engineer / SRE] --> FE[Next.js Web Application]
    FE --> API[FastAPI Backend]
    API --> DB[(PostgreSQL)]
    API --> RQ[Redis Job Queue]
    RQ --> WORK[Background Workers]
    WORK --> ML[Detection and RCA Engine]
    ML --> DB
    ML --> PROM[Prometheus]
    ML --> LOKI[Loki]
    ML --> TEMPO[Tempo]
    DEMO[Demo Microservices] --> OTEL[OpenTelemetry Collector]
    OTEL --> PROM
    OTEL --> LOKI
    OTEL --> TEMPO
    API --> PROM
    API --> LOKI
    API --> TEMPO
    DEMO -->|OTLP metrics, logs, traces| OTEL
```

### 5.2 Technology choices

Keep the first version intentionally understandable. Prefer a small number of reliable technologies over a large collection of fashionable dependencies.

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | Next.js App Router, React, TypeScript | Routes, screens, interactions |
| Styling | Tailwind CSS plus a documented design-token layer | Consistent layout and styling |
| UI primitives | Accessible headless primitives where useful; Lucide icons for functional icons only | Forms, dialogs, menus, iconography |
| Forms and validation | React Hook Form + Zod | Client-side form validation and typed schemas |
| Server state | TanStack Query or an equivalent consistent data-fetching layer | Caching, refetching, mutation state |
| Charts | Recharts or another lightweight chart library | Telemetry and experiment visualizations |
| Backend | Python + FastAPI | REST API and application services |
| API schemas | Pydantic | Request/response validation |
| ORM and migrations | SQLAlchemy 2.x + Alembic | Persistence and schema evolution |
| Primary database | PostgreSQL | Users, services, incidents, topology metadata, jobs, experiments |
| Background jobs | Redis + Celery (or one clearly justified task-queue alternative) | Long-running analyses and ingestion jobs |
| Metrics backend | Prometheus | Scraping, storage, and querying numeric time series |
| Logs backend | Grafana Loki | Log storage and LogQL queries |
| Traces backend | Grafana Tempo | Distributed trace storage and retrieval |
| Telemetry transport | OpenTelemetry Collector / OTLP | Vendor-neutral telemetry ingestion and routing |
| ML | pandas, NumPy, scikit-learn, PyTorch | Preprocessing, baselines, neural models |
| Graph learning | PyTorch Geometric, only if needed | Graph neural-network experiments |
| Experiment tracking | MLflow or a simple database-backed experiment registry | Run metadata, metrics, artifacts |
| Packaging | Docker and Docker Compose | Reproducible local services |
| Testing | Pytest, Vitest/React Testing Library, Playwright | Unit, integration, and end-to-end testing |
| Code quality | Ruff, Mypy, ESLint, Prettier | Linting, formatting, type checks |

Pin dependency versions in lockfiles. Do not blindly install `latest` in repeatable environments. Use supported versions compatible with the development machine and document the chosen versions in the repository.

### 5.3 Data ownership

- Prometheus owns raw and downsampled metric time series.
- Loki owns log records and log queries.
- Tempo owns distributed traces and trace retrieval.
- PostgreSQL owns application metadata, users, service inventory, service relationships, alert rules, incidents, investigation jobs, model runs, and dataset manifests.
- Redis owns transient queues, locks, and cache entries; it is not the source of truth.
- ML artifact storage owns versioned model files and preprocessing artifacts. Use a local Docker volume for development and an object store in a later production deployment.

Do not copy every raw telemetry point into PostgreSQL. Store stable references, identifiers, query metadata, and compact aggregates where useful.

### 5.4 Service boundaries

Use a modular monolith for the application backend initially. Keep domain modules separated, but do not split into many deployable microservices without a demonstrated scaling or ownership need.

Suggested backend modules:

- `auth`: login, logout, session, user identity.
- `services`: service inventory and metadata.
- `topology`: dependency graph construction and retrieval.
- `telemetry`: Prometheus, Loki, and Tempo clients.
- `ingestion`: polling, normalization, and source health.
- `detection`: feature extraction and anomaly detectors.
- `incidents`: incident lifecycle and state transitions.
- `investigations`: RCA orchestration and evidence generation.
- `datasets`: manifests, imports, versions, and splits.
- `experiments`: training/evaluation runs and comparisons.
- `alerts`: alert policy CRUD and evaluation.
- `audit`: security-relevant user actions.

### 5.5 Reliability of integrations

- Use bounded timeouts for external backend requests.
- Retry only transient failures, using bounded exponential backoff and jitter.
- Avoid retry storms; cap concurrent calls.
- Return a clear partial-data state when one telemetry backend is unavailable.
- Cache service inventory and topology with a documented TTL.
- Use idempotency keys for job creation and any retryable write that could create duplicates.
- Include correlation IDs in API logs and background-job logs.
- Do not expose Prometheus/Loki/Tempo administrative endpoints directly to untrusted browsers.

---

## 6. User interface and product design requirements

The interface must look and behave like a carefully designed enterprise software product. It must **not** look like an AI-generated template, a chatbot landing page, or a futuristic concept mock-up.

### 6.1 Visual direction

Use a simple, restrained, precise visual language similar to a mature observability or infrastructure-management product.

- Light theme by default.
- Neutral page background, white or near-white surfaces, restrained borders, and clear typography.
- One restrained primary accent colour for selected navigation, links, and primary actions.
- Semantic colours only for status: green for healthy/resolved, amber for warning/acknowledged, red for critical/error, and neutral grey for unknown/inactive.
- Use consistent spacing, a readable type scale, compact tables, and clear section hierarchy.
- Use real charts and tables built from actual API data.
- Use a restrained icon set such as Lucide for functional navigation and actions only.
- Use text labels with icons when an icon alone could be ambiguous.
- Prefer practical data density over large decorative hero areas.
- Design for desktop first because incident investigation and observability require information density, then make every page responsive for tablets and phones.

### 6.2 Prohibited visual treatment

Do not use:

- Emojis anywhere in the application interface.
- Sparkles, stars, magic-wand, robot, brain, circuit-board, or AI-chip symbols as branding or decoration.
- “AI magic”, “AI-powered magic”, “supercharged”, or similar promotional copy.
- Glowing gradients, neon borders, glassmorphism, excessive blur, floating blobs, or animated backgrounds.
- Random decorative illustrations or AI-generated-looking dashboard mockups.
- A chatbot-first layout when the product is an observability platform.
- Fake terminal output, fake live metrics, fabricated benchmark scores, or random activity feeds.
- Icons used only to fill whitespace.

The product identity should be typographic: **AIOps Sentinel**. If a logo is needed, use a clean wordmark or a simple geometric mark designed from basic shapes, not an AI-themed symbol.

### 6.3 Layout system

Authenticated pages should share one consistent application shell:

- Left sidebar with product wordmark and primary navigation.
- Top header with current page title/breadcrumb, global time-range selector where relevant, data-source status, and user menu.
- Main content area with consistent maximum width and responsive padding.
- Contextual action area for page-level actions.
- Toasts for brief success/error feedback; inline messages for validation and persistent errors.
- Tables with stable column widths, clear empty states, sort/filter controls, and pagination.
- Charts with labelled axes, units, tooltips, and a visible time range/time zone.

Do not place every feature inside a rounded card. Use cards only when they group related information. Use tables for records and charts for time-series data.

### 6.4 Accessibility and usability

- Aim for WCAG 2.2 AA practices.
- Keyboard-operable navigation, forms, menus, and dialogs.
- Visible focus states.
- Labels associated with every form field.
- Do not communicate status by colour alone; include text.
- Sufficient contrast in all text and control states.
- Accessible table headings and chart summaries.
- Respect reduced-motion preferences.
- Avoid hover-only actions.
- Every destructive action requires a confirmation step and clear description.

### 6.5 Global UI states

Every data-driven page must handle:

1. Initial loading state.
2. Refreshing state that does not unnecessarily erase existing data.
3. Empty state with a useful next action.
4. Filtered-empty state with a clear-filter action.
5. Partial-data state when one source is unavailable.
6. Stale-data state with the last successful update time.
7. Recoverable API error with retry.
8. Permission-denied state.
9. Not-found state for invalid resource IDs.
10. Offline/backend-unavailable state.

Never show a blank white screen, a permanent spinner, or an unhandled raw exception to the user.

---

## 7. Application routes and page specifications

Every route below must be implemented, linked, and tested. No visible navigation item or button may point to `#`, an unimplemented route, or a dead end.

### 7.1 Route map

| Route | Page | Access | Core purpose |
|---|---|---|---|
| `/login` | Sign in | Public | Authenticate user |
| `/overview` | Overview dashboard | Authenticated | Current platform health and incident summary |
| `/services` | Services | Authenticated | Browse monitored services |
| `/services/[serviceId]` | Service detail | Authenticated | Inspect a service's health and telemetry |
| `/incidents` | Incidents | Authenticated | Search and manage incidents |
| `/incidents/[incidentId]` | Incident detail | Authenticated | Investigate one incident and its evidence |
| `/topology` | Service topology | Authenticated | Explore service dependency graph |
| `/deployments` | Deployment history | Authenticated | View deployment events and incident correlation context |
| `/experiments` | Experiments | Authenticated | Inspect model experiments and evaluation runs |
| `/experiments/[runId]` | Experiment detail | Authenticated | Inspect a single run, configuration, metrics, and artifacts |
| `/datasets` | Dataset registry | Authenticated | Inspect registered datasets and import status |
| `/alert-rules` | Alert rules | Authenticated | Create and manage alert policies |
| `/settings` | Settings | Authenticated/admin where relevant | Configure data sources and application preferences |
| `/profile` | User profile | Authenticated | Manage account-level preferences |

`/` should redirect to `/overview` for an authenticated user and `/login` otherwise. Add a proper not-found page and error boundary. Do not expose internal stack traces in the UI.

### 7.2 Navigation requirements

Primary sidebar order:

1. Overview
2. Services
3. Incidents
4. Topology
5. Deployments
6. Experiments
7. Datasets
8. Alert rules

Settings and profile belong in the user/settings area of the header or a clearly labelled secondary navigation section.

Rules:

- Active route must be visibly highlighted.
- Sidebar items must use Next.js route links, not click handlers that simulate navigation.
- The product wordmark returns to Overview.
- Breadcrumbs must link to their parent pages.
- Browser back/forward navigation must work.
- Refreshing a deep link must load the correct page.
- Every detail page must handle an invalid or deleted resource ID.
- Do not add DeployGuard/ArchMind roadmap items to the live sidebar until implemented.

### 7.3 Page requirements

#### A. Login — `/login`

Components:

- Product wordmark and concise product description.
- Email field.
- Password field with show/hide control.
- Submit button with pending state.
- Inline validation and authentication error message.
- Link to an account recovery flow only if that flow is implemented; otherwise do not show a dead link.

Validation:

- Email must be syntactically valid.
- Password must not be empty.
- Do not reveal whether a particular email exists in error messages.
- Disable duplicate submission while a request is pending.
- Never log passwords or return them in API responses.

For local development, create a documented seed account using an environment-provided password or a one-time setup command. Never ship a known default production password.

#### B. Overview — `/overview`

Show a useful operational summary, not decorative KPI cards.

Sections:

- Overall monitored-service status.
- Active critical/high/medium incidents.
- Anomaly/event trend over the selected time range.
- Service health table.
- Recent incidents table.
- Telemetry source status: metrics, logs, traces, and backend connectivity.
- Last successful ingestion/query time.

Interactions:

- Global time-range selector updates all relevant widgets.
- Clicking a service opens its detail page.
- Clicking an incident opens its incident page.
- Clicking a status/source opens relevant configuration or service status.
- Refresh action refetches the summary.

No fabricated data. When a data source is not configured, show a setup state. Demo data must carry a visible `Demo data` label.

#### C. Services — `/services`

Show a searchable, filterable, paginated service table.

Suggested fields:

- Service name.
- Environment.
- Health status.
- Request rate.
- Error rate.
- p50/p95 latency.
- Active incident count.
- Last observed time.

Interactions:

- Search by service name.
- Filter by environment and health status.
- Sort supported columns.
- Pagination with stable query parameters.
- Row click opens `/services/[serviceId]`.
- Clear filters restores the default list.

Validation and behaviour:

- Query values must be encoded safely.
- Invalid sort fields must be rejected by the backend or reset to a safe default.
- Empty and unavailable states must be distinct.

#### D. Service detail — `/services/[serviceId]`

Sections:

- Service summary and current health.
- Request rate, error rate, and latency charts.
- CPU and memory charts when those metrics exist.
- Recent logs with severity and query context.
- Recent traces with trace ID, duration, and status.
- Upstream and downstream dependencies.
- Related incidents.
- Last telemetry timestamp and data-source availability.

Interactions:

- Time-range selection updates charts and related telemetry.
- Log row opens or copies a log/trace reference where appropriate.
- Trace row links to its trace detail or external trace backend through a safe server-created URL.
- Dependency node opens the connected service.
- Related incident opens the incident detail page.

Do not display a chart if the metric is unavailable without explaining why. Do not render zero as a substitute for missing telemetry.

#### E. Incidents — `/incidents`

Table columns:

- Incident ID.
- Title/summary.
- Severity.
- Status.
- Affected service(s).
- First detected time.
- Last updated time.
- Assigned user/team.
- Detection source/model version.

Features:

- Search by incident ID/title/service.
- Filter by severity, status, service, and time range.
- Sort and paginate.
- Bulk actions only when permission checks and confirmation flows are implemented.
- Export CSV only when export is implemented and access-controlled.

Incident statuses:

- `open`
- `acknowledged`
- `investigating`
- `resolved`
- `closed`

Allowed state transitions must be enforced by the backend, not only by hiding buttons in the UI.

#### F. Incident detail — `/incidents/[incidentId]`

This is the most important investigation screen.

Sections:

1. Incident summary: ID, title, severity, status, affected service, detected time, and updated time.
2. Timeline: anomaly detection, status changes, analyst notes, investigation events, and deployment events where available.
3. Anomaly evidence: metric name, service, observed value, baseline/range, time window, detector, score, and model version.
4. Root-cause candidates: ranked candidate services and indicators, each with confidence/calibrated score where available and a plain-language explanation tied to evidence IDs.
5. Metric evidence: relevant time series with anomaly window highlighted.
6. Log evidence: filtered log samples and a link/query to the source backend.
7. Trace evidence: trace IDs and service path/latency information where available.
8. Dependency context: relevant upstream/downstream services.
9. Recommended next investigation steps: read-only suggestions, never automatic execution.
10. Analyst actions: acknowledge, assign, add note, mark investigating, resolve, and reopen only when valid.

Interactions:

- `Run investigation` starts a background job and returns a job identifier.
- The UI shows queued/running/succeeded/failed job states and refreshes or subscribes to status updates.
- Analyst notes require non-empty text and have a configured maximum length.
- Status changes require confirmation when they are destructive or terminal.
- All actions record actor, timestamp, previous state, new state, and reason in an audit trail.
- A failed investigation must preserve the incident and show the error summary plus retry option.

Root-cause wording must say “candidate”, “likely”, or “evidence suggests” unless a controlled experiment provides direct ground truth. Include an “insufficient evidence” outcome.

#### G. Topology — `/topology`

Show an interactive directed graph of discovered services and observed communication relationships.

Requirements:

- Nodes represent services.
- Edges represent observed calls/dependencies.
- Node status is labelled and not colour-only.
- Edge direction must be clear.
- Selecting a node opens a details panel with service name, health, request/error/latency summary, and related incidents.
- Selecting an edge shows call volume, error rate, and latency when available.
- Filters: environment, time range, and service search.
- Provide a keyboard-accessible service list alternative for users who cannot use the graph interaction.
- Show when topology is inferred from traces versus manually configured metadata.
- Handle isolated services, cycles, large graphs, and no topology data.

Do not invent graph edges. A graph derived from traces must include an observed time window and provenance.

#### H. Deployments — `/deployments`

MVP scope is deployment history and incident correlation context, not predictive deployment risk.

Sections:

- Deployment ID/version.
- Service and environment.
- Start/completion time.
- Status.
- Source/commit identifier when available.
- Incidents/anomalies observed near the deployment window.

The UI must clearly label correlation as temporal association, not proof that a deployment caused an incident. Include a filterable timeline and links to relevant service/incident pages.

Deployment events may be ingested from a documented demo event source or manually seeded as explicitly labelled demo events. Do not fabricate production deployment history.

#### I. Experiments — `/experiments`

Show reproducible model runs.

Fields:

- Run ID and experiment name.
- Model/algorithm and version.
- Dataset and split manifest.
- Configuration/seed.
- Start and end times.
- Primary evaluation metrics.
- Status.
- Artifact availability.

Features:

- Filter by model, dataset, status, and date.
- Compare selected compatible runs.
- Clearly state when two runs cannot be compared because their dataset, split, or metric protocol differs.
- Link each run to `/experiments/[runId]`.

#### J. Experiment detail — `/experiments/[runId]`

Display:

- Model card summary.
- Dataset source/version and split manifest.
- Preprocessing version.
- Hyperparameters and random seed.
- Evaluation protocol.
- Precision, recall, F1, PR-AUC/ROC-AUC where appropriate, event-level metrics, and confidence intervals where calculated.
- Detection delay and false alerts per service/time when available.
- RCA top-1/top-3 hit rate and MRR when ground-truth labels support them.
- Calibration metrics such as Brier score/ECE if implemented.
- Inference latency p50/p95 and memory use if measured.
- Confusion matrix and per-fault/per-system breakdown where applicable.
- Links to model and preprocessing artifacts.

Do not render missing metrics as zero. Label unmeasured values as unavailable.

#### K. Datasets — `/datasets`

Registry fields:

- Dataset name.
- Version.
- Source/provider.
- License/usage note.
- Modalities.
- Number of cases/records where known.
- Import status.
- Checksum.
- Last validation time.

Features:

- Register a dataset manifest.
- Validate required metadata before import.
- Start import/validation job.
- Show progress, warnings, and failures.
- View split manifests and preprocessing versions.

Do not permit an import until source and usage terms have been recorded. Do not upload restricted dataset files into the public repository.

#### L. Alert rules — `/alert-rules`

Create and manage threshold or detector-based rules.

Fields:

- Name.
- Description.
- Service scope.
- Metric/detector.
- Condition and threshold/window.
- Severity.
- Evaluation interval.
- Enabled/disabled status.

Validation:

- Name required and unique within its scope.
- Threshold must be numeric and within a documented acceptable range.
- Window and evaluation interval must be positive and bounded.
- Service and metric identifiers must exist.
- Invalid combinations must return field-level validation messages.

Rules must be evaluated by a backend worker or detector service. A UI toggle must persist and change actual evaluation behaviour.

#### M. Settings — `/settings`

Tabs or sections:

- Application profile/preferences.
- Telemetry backend connection status and safe configuration fields.
- Data-source configuration instructions.
- Model/detection settings that are safe for an administrator to change.
- Retention settings where supported.
- System health and version information.

Secrets must never be returned after saving. Display masked values and an explicit “configured/not configured” state. Do not expose arbitrary backend URLs without validation and administrator authorization.

#### N. Profile — `/profile`

- Display name and email.
- Time zone preference.
- Table density preference if implemented.
- Password update only if correctly supported by the authentication design.
- Session/logout action.

Validate all inputs and confirm successful persistence after reload.

---

## 8. Backend API contract

Use a versioned REST API with a consistent response envelope, typed schemas, clear status codes, and generated OpenAPI documentation.

Base path: `/api/v1`

### 8.1 Health and metadata

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health/live` | Process liveness |
| GET | `/health/ready` | Database and required dependency readiness |
| GET | `/meta` | Application version and feature availability |

Readiness should report optional telemetry backend availability separately. A temporary Loki outage should not make the entire API appear dead if the application can still serve stored incidents.

### 8.2 Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/login` | Authenticate and establish session |
| POST | `/auth/logout` | Revoke current session |
| GET | `/auth/me` | Return current user's safe profile |
| POST | `/auth/password` | Change password, if enabled |

Use secure, HTTP-only cookies for browser sessions where feasible, with appropriate SameSite, Secure, expiry, CSRF protection, and refresh/session rotation. Hash passwords using a modern password-hashing algorithm such as Argon2id. Never store plaintext passwords. Never put secrets in localStorage.

### 8.3 Overview and services

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/overview/summary` | Health and incident summary for a time range |
| GET | `/services` | Search/filter/paginate services |
| GET | `/services/{service_id}` | Service metadata and health summary |
| GET | `/services/{service_id}/metrics` | Query metrics for service/time range |
| GET | `/services/{service_id}/logs` | Query logs for service/time range |
| GET | `/services/{service_id}/traces` | Query traces for service/time range |
| GET | `/topology` | Return topology nodes and edges |

### 8.4 Incidents and investigations

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/incidents` | Search/filter/paginate incidents |
| POST | `/incidents` | Create an incident from validated evidence or a supported manual workflow |
| GET | `/incidents/{incident_id}` | Incident detail and evidence references |
| PATCH | `/incidents/{incident_id}` | Update allowed status/assignment fields |
| POST | `/incidents/{incident_id}/notes` | Add analyst note |
| POST | `/incidents/{incident_id}/investigations` | Queue an RCA job; return `202 Accepted` and job ID |
| GET | `/investigations/{job_id}` | Job status and progress summary |
| GET | `/investigations/{job_id}/result` | Completed RCA result and evidence references |
| GET | `/incidents/{incident_id}/timeline` | Incident event timeline |

All state transitions must be validated in the backend. Return `409 Conflict` for invalid transitions, `404 Not Found` for unknown IDs, `422 Unprocessable Entity` for schema/business validation failures, and `403 Forbidden` for insufficient permissions.

### 8.5 Deployments, experiments, datasets, and alerts

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/deployments` | Query deployment events |
| GET | `/deployments/{deployment_id}` | Deployment detail |
| GET | `/experiments` | List experiment runs |
| POST | `/experiments` | Register/start a supported experiment |
| GET | `/experiments/{run_id}` | Experiment metadata and metrics |
| GET | `/datasets` | List dataset manifests |
| POST | `/datasets` | Register a dataset manifest |
| POST | `/datasets/{dataset_id}/validate` | Queue dataset validation/import checks |
| GET | `/datasets/{dataset_id}` | Dataset details and validation state |
| GET | `/alert-rules` | List alert rules |
| POST | `/alert-rules` | Create a rule |
| PATCH | `/alert-rules/{rule_id}` | Update a rule |
| DELETE | `/alert-rules/{rule_id}` | Delete a rule with confirmation/audit |
| GET | `/settings/sources` | Safe source configuration/status |
| PATCH | `/settings/sources/{source_id}` | Update permitted source configuration |

### 8.6 Query conventions

Use consistent query parameters:

- `from`: ISO-8601 timestamp with explicit offset or UTC `Z`.
- `to`: ISO-8601 timestamp with explicit offset or UTC `Z`.
- `step`: bounded metric query step.
- `service_id`: service identifier.
- `environment`: environment filter.
- `status`, `severity`: enum filters.
- `page`: 1-based page number.
- `page_size`: bounded page size, with a conservative default and maximum.
- `sort_by`, `sort_order`: whitelisted sort fields and `asc`/`desc` only.

Validate `from < to`, enforce a maximum time span for expensive queries, and reject unbounded backend queries. Use UTC internally and convert to the user's selected time zone only for display.

### 8.7 Response envelope

Use a consistent shape. Example only:

```json
{
  "data": {
    "id": "incident_123",
    "status": "open"
  },
  "meta": {
    "request_id": "req_abc123"
  },
  "error": null
}
```

For errors, return a stable machine-readable code, safe human-readable message, optional field errors, and request ID. Do not return stack traces, SQL messages, secrets, or internal file paths.

### 8.8 API quality requirements

- Generate OpenAPI from FastAPI schemas.
- Add request IDs and structured logs.
- Validate all user-supplied identifiers and query values.
- Use pagination for list endpoints.
- Avoid N+1 database query patterns.
- Use async I/O for network-bound requests where appropriate.
- Set timeouts and bounded concurrency for Prometheus/Loki/Tempo calls.
- Test authorization for every protected route.
- Add API contract tests for success and failure responses.

---

## 9. Data model

Use UUIDs or another non-guessable identifier strategy for primary resources. Add `created_at` and `updated_at` fields where appropriate. Use UTC timestamps.

Suggested core entities:

### `users`

- `id`
- `email` (unique, normalized)
- `display_name`
- `password_hash` or external identity reference
- `role`
- `is_active`
- `created_at`, `updated_at`

### `services`

- `id`
- `name`
- `environment`
- `namespace`
- `health_status`
- `first_seen_at`, `last_seen_at`
- `metadata_json`

### `service_edges`

- `id`
- `source_service_id`
- `target_service_id`
- `relationship_type`
- `observed_calls`
- `error_rate`
- `latency_summary_json`
- `observed_from`, `observed_to`
- `provenance` (trace-derived, configured, imported)

### `incidents`

- `id`
- `title`, `description`
- `severity`, `status`
- `primary_service_id`
- `detected_at`, `last_seen_at`, `resolved_at`
- `detector_name`, `detector_version`
- `model_run_id`
- `confidence` (nullable; document semantics)
- `assigned_to_user_id`
- `source` (live, benchmark, demo/manual)
- `created_at`, `updated_at`

### `incident_evidence`

- `id`
- `incident_id`
- `evidence_type` (metric, log, trace, topology, deployment, note)
- `service_id`
- `source_reference`
- `time_start`, `time_end`
- `summary_json`
- `created_at`

### `incident_events`

- `id`
- `incident_id`
- `actor_user_id` (nullable for system event)
- `event_type`
- `previous_value_json`, `new_value_json`
- `reason`
- `created_at`

### `investigation_jobs`

- `id`
- `incident_id`
- `status` (queued, running, succeeded, failed, cancelled)
- `progress` (bounded 0–100 where meaningful)
- `model_version`
- `started_at`, `completed_at`
- `error_code`, `safe_error_summary`
- `result_reference`

### `root_cause_candidates`

- `id`
- `investigation_job_id`
- `service_id`
- `rank`
- `score`
- `calibrated_confidence` (nullable)
- `candidate_indicator`
- `explanation`
- `evidence_ids`

### `datasets`

- `id`
- `name`, `version`, `source_url`
- `license_note`, `usage_restrictions`
- `modalities_json`
- `checksum_manifest`
- `status`
- `manifest_path`
- `created_at`, `validated_at`

### `experiment_runs`

- `id`
- `experiment_name`
- `model_name`, `model_version`
- `dataset_id`
- `split_manifest_path`
- `config_json`
- `metrics_json`
- `artifact_uri`
- `status`
- `seed`
- `started_at`, `completed_at`

### `alert_rules`

- `id`
- `name`, `description`
- `service_scope_json`
- `condition_json`
- `severity`
- `evaluation_interval_seconds`
- `is_enabled`
- `created_by_user_id`
- `created_at`, `updated_at`

### `audit_events`

- `id`
- `actor_user_id`
- `action`
- `resource_type`, `resource_id`
- `request_id`
- `details_json` (redacted)
- `created_at`

Use foreign keys, unique constraints, indexes, and deletion rules intentionally. Avoid storing secrets or raw high-volume telemetry in these tables.

---

## 10. Telemetry ingestion and normalization

### 10.1 Telemetry path

1. The demo application emits OpenTelemetry data.
2. OpenTelemetry Collector receives OTLP.
3. Collector routes metrics, logs, and traces to their configured backends.
4. Backend integration clients query those backends using their supported APIs.
5. Ingestion/normalization jobs map data to consistent service names, environment labels, and UTC timestamps.
6. Detection jobs consume aligned feature windows.
7. Investigation jobs gather additional evidence and topology context.
8. Results and references are persisted in PostgreSQL.

### 10.2 Backend interfaces

- Prometheus HTTP API: <https://prometheus.io/docs/prometheus/latest/querying/api/>
- Loki HTTP API: <https://grafana.com/docs/loki/latest/reference/loki-http-api/>
- Tempo HTTP API: <https://grafana.com/docs/tempo/latest/api_docs/>
- OpenTelemetry Demo: <https://opentelemetry.io/docs/demo/>

Use official APIs rather than scraping a Grafana dashboard. Keep backend-specific query syntax inside adapter modules so the domain logic is not coupled to a vendor API.

### 10.3 Canonical telemetry schema

Normalize telemetry into a documented internal representation.

Metric sample fields:

- `timestamp` (UTC)
- `service_name`
- `environment`
- `metric_name`
- `value`
- `unit`
- `attributes`
- `source_backend`

Log event fields:

- `timestamp` (UTC)
- `service_name`
- `severity`
- `body` or safe message representation
- `trace_id` / `span_id` when present
- `attributes`
- `source_reference`

Trace/span fields:

- `trace_id`
- `span_id`
- `parent_span_id`
- `service_name`
- `operation_name`
- `start_time`, `end_time`, `duration`
- `status`
- `attributes`

Never assume every field is present. Preserve missingness explicitly.

### 10.4 Topology extraction

Build the service graph primarily from trace parent/child and service-to-service relationships, supplemented by service inventory metadata. Store provenance and the time window used to infer each edge. Use a directed graph; do not silently convert it to an undirected graph if direction matters to the RCA algorithm.

### 10.5 Time alignment

- Convert all timestamps to UTC.
- Define a configurable window size and step.
- Avoid joining telemetry only by nearest timestamp if that can mix unrelated requests or services.
- Preserve trace IDs when correlating logs and traces.
- Record interpolation, aggregation, and missing-value policies.
- Do not forward-fill every missing metric without measuring the effect.

---

## 11. ML implementation and evaluation

### 11.1 First working detector

Implement a transparent baseline before neural models:

- Rolling median and median absolute deviation (MAD), or a robust z-score.
- Configurable window and threshold.
- Minimum data-point count before scoring.
- Missing-data checks.
- Cooldown or event grouping to prevent incident spam.
- Per-service/per-metric baseline where appropriate.
- A deterministic unit-test fixture with known normal and anomalous segments.

The detector output should include:

- Detector name/version.
- Service and metric.
- Window start/end.
- Raw statistic and threshold.
- Anomaly score.
- Severity mapping and reason.
- Source evidence reference.

### 11.2 Model interfaces

Define interfaces rather than hard-coding the application to one model:

- `FeatureExtractor`: raw telemetry window → typed feature representation.
- `AnomalyDetector`: feature window → anomaly score and evidence.
- `TopologyProvider`: service metadata/trace data → graph snapshot.
- `RootCauseRanker`: incident evidence + topology → ranked candidates.
- `ConfidenceCalibrator`: raw score → calibrated confidence/abstention decision.
- `EvaluationRunner`: predictions + labels → metrics and report.

All implementations must be versioned and testable without a live UI.

### 11.3 Evaluation metrics

Anomaly detection:

- Precision, recall, and F1.
- PR-AUC for imbalanced labels; ROC-AUC as a supplementary metric where relevant.
- Event-level precision/recall.
- False alerts per service per hour/day.
- Detection delay from fault injection/labelled onset.
- Per-fault-type and per-system performance.

Root-cause localization:

- Top-1 accuracy / hit rate.
- Top-3 accuracy / hit rate.
- Mean reciprocal rank (MRR).
- Root-cause indicator hit rate where the benchmark provides indicator labels.
- Per-system/per-fault-type performance.

Confidence and operations:

- Brier score and expected calibration error (ECE), if confidence is calibrated.
- Coverage versus accuracy under abstention.
- Inference latency p50/p95.
- CPU/GPU memory and peak memory.
- Throughput and cost per analysis where measurable.

Do not report a metric unless its exact computation is documented and reproducible.

### 11.4 Evaluation protocol

- Maintain immutable split manifests.
- Group splits by failure case or scenario to prevent related windows leaking across splits.
- Add cross-system or leave-one-system-out evaluation where feasible.
- Keep a validation set for threshold/model selection.
- Evaluate the final test set only after decisions are frozen.
- Use at least three random seeds for stochastic experiments where compute permits.
- Report mean and variability or confidence intervals.
- Compare against transparent baselines before claiming a research improvement.
- Record failed runs; do not delete them merely because results are poor.

### 11.5 Ablation plan

Run controlled experiments removing one component at a time:

1. Metrics only.
2. Logs only, where labels/data support it.
3. Traces only, where labels/data support it.
4. Metrics + logs.
5. Metrics + traces.
6. Metrics + logs + traces.
7. Multi-source without topology.
8. Multi-source with topology.
9. With versus without temporal context.
10. With versus without confidence calibration/abstention.

Not every dataset supports every ablation. Mark unsupported combinations as not applicable rather than manufacturing results.

### 11.6 Model cards and experiment reports

Every model version must document:

- Intended use and excluded use.
- Training/evaluation datasets and versions.
- Split strategy.
- Features and preprocessing.
- Architecture and hyperparameters.
- Metrics and per-slice performance.
- Calibration method.
- Known failure modes and limitations.
- Hardware/software environment.
- Model artifact checksum.

---

## 12. Security, privacy, and safe operation

This product handles operational telemetry, which may contain service names, identifiers, request metadata, or accidentally logged sensitive values.

### 12.1 Mandatory controls

- Require authentication for all non-public application routes.
- Enforce authorization on the backend for every protected action.
- Store passwords using a modern password hash; never store plaintext passwords.
- Use secure cookies and CSRF protection for browser sessions.
- Keep secrets in environment variables or a secret manager, never in source control.
- Validate and normalize all input.
- Apply rate limits to authentication and expensive analysis endpoints.
- Set maximum query windows, payload sizes, and upload sizes.
- Redact sensitive values from application logs.
- Do not expose raw stack traces to end users.
- Restrict CORS to known application origins.
- Use TLS in non-local environments.
- Pin and scan dependencies as part of CI.
- Keep audit events for sensitive user actions.

### 12.2 Safe execution boundary

The MVP does not execute remediation commands. If a future feature executes a runbook:

- Execute only allow-listed operations.
- Use a dedicated isolated worker/container with least privilege.
- Never mount the host Docker socket into an untrusted execution container.
- Never run user-supplied shell strings.
- Require explicit human approval for any state-changing action.
- Record the proposed action, approver, target, execution result, and rollback information.
- Apply timeouts, resource limits, network restrictions, and audit logging.

### 12.3 Telemetry privacy

- Avoid collecting payload bodies when not required.
- Support redaction of configured sensitive attributes.
- Do not display secrets/tokens in log samples.
- Document retention periods.
- Use only data permitted by the source dataset terms.

---

## 13. Repository structure

Use a monorepo so the frontend, backend, ML code, infrastructure, and tests can evolve together.

Suggested target structure:

```text
aiops-sentinel/
├── README.md
├── LICENSE                         # Add only after selecting a project license
├── .gitignore
├── .editorconfig
├── .env.example
├── Makefile
├── compose.yaml
├── compose.observability.yaml      # Optional compose override
├── docs/
│   ├── architecture.md
│   ├── api-contract.md
│   ├── data-governance.md
│   ├── research-plan.md
│   ├── evaluation-protocol.md
│   ├── threat-model.md
│   ├── runbooks/
│   └── decisions/                  # Architecture Decision Records (ADRs)
├── frontend/
│   ├── package.json
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/login/
│   │   │   ├── (app)/overview/
│   │   │   ├── (app)/services/
│   │   │   ├── (app)/incidents/
│   │   │   ├── (app)/topology/
│   │   │   ├── (app)/deployments/
│   │   │   ├── (app)/experiments/
│   │   │   ├── (app)/datasets/
│   │   │   ├── (app)/alert-rules/
│   │   │   ├── (app)/settings/
│   │   │   ├── (app)/profile/
│   │   │   ├── layout.tsx
│   │   │   ├── error.tsx
│   │   │   └── not-found.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   ├── navigation/
│   │   │   ├── tables/
│   │   │   ├── charts/
│   │   │   ├── forms/
│   │   │   └── feedback/
│   │   ├── features/
│   │   │   ├── overview/
│   │   │   ├── services/
│   │   │   ├── incidents/
│   │   │   ├── topology/
│   │   │   ├── deployments/
│   │   │   ├── experiments/
│   │   │   ├── datasets/
│   │   │   └── alert-rules/
│   │   ├── lib/
│   │   │   ├── api-client.ts
│   │   │   ├── auth.ts
│   │   │   ├── schemas/
│   │   │   └── utils/
│   │   └── styles/
│   ├── public/
│   └── tests/
│       ├── unit/
│       └── e2e/
├── backend/
│   ├── pyproject.toml
│   ├── alembic.ini
│   ├── alembic/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/v1/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── repositories/
│   │   ├── services/
│   │   ├── integrations/
│   │   │   ├── prometheus/
│   │   │   ├── loki/
│   │   │   ├── tempo/
│   │   │   └── opentelemetry/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── services/
│   │   │   ├── topology/
│   │   │   ├── incidents/
│   │   │   ├── investigations/
│   │   │   ├── datasets/
│   │   │   ├── experiments/
│   │   │   ├── alerts/
│   │   │   └── audit/
│   │   └── workers/
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── contract/
├── ml/
│   ├── pyproject.toml              # Or share backend's Python environment intentionally
│   ├── configs/
│   ├── data/                       # Git-ignored; manifests may be committed
│   ├── manifests/
│   ├── notebooks/                  # Exploratory only; production logic belongs in modules
│   ├── src/aiops_ml/
│   │   ├── data/
│   │   ├── features/
│   │   ├── detectors/
│   │   ├── topology/
│   │   ├── localization/
│   │   ├── calibration/
│   │   ├── evaluation/
│   │   └── registry/
│   ├── scripts/
│   ├── reports/
│   └── tests/
├── infra/
│   ├── otel-collector/
│   ├── prometheus/
│   ├── loki/
│   ├── tempo/
│   ├── grafana/                    # Optional internal debugging dashboards
│   └── demo-workload/
├── scripts/
│   ├── bootstrap.sh
│   ├── check-env.sh
│   ├── seed-dev-user.py
│   └── smoke-test.sh
└── .github/
    └── workflows/
        ├── ci.yml
        ├── backend.yml
        ├── frontend.yml
        └── security.yml
```

The exact structure can be refined during implementation, but keep clear separation between frontend, API/domain logic, telemetry integrations, ML research code, and infrastructure.

---

## 14. Local development environment

### 14.1 Prerequisites

Use supported versions of:

- Git.
- Docker Engine or Docker Desktop with Docker Compose v2.
- Python 3.11 or newer (select and pin one project version).
- Node.js LTS compatible with the chosen Next.js release.
- npm, pnpm, or another single package manager; do not mix package managers.
- At least 8 GB RAM recommended for the application plus core observability services; more may be needed for the full OpenTelemetry Demo.
- Sufficient free disk space for container images, logs, traces, and datasets.

The complete OpenTelemetry Demo can be resource intensive. Document a reduced profile and keep large benchmark downloads optional.

### 14.2 Environment file

Create `.env.example` and document every variable. Never commit `.env`.

Suggested variables:

```dotenv
APP_ENV=development
APP_NAME=AIOps Sentinel
APP_BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:8000
API_V1_PREFIX=/api/v1
LOG_LEVEL=INFO

POSTGRES_DB=aiops_sentinel
POSTGRES_USER=aiops
POSTGRES_PASSWORD=change-me-locally
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
DATABASE_URL=postgresql+asyncpg://aiops:change-me-locally@postgres:5432/aiops_sentinel

REDIS_URL=redis://redis:6379/0

PROMETHEUS_URL=http://prometheus:9090
LOKI_URL=http://loki:3100
TEMPO_URL=http://tempo:3200
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317

SESSION_SECRET=replace-with-a-long-random-local-secret
SESSION_COOKIE_SECURE=false
SESSION_COOKIE_SAMESITE=lax
CORS_ALLOWED_ORIGINS=http://localhost:3000

DEFAULT_TIMEZONE=Asia/Kolkata
DEMO_MODE=true
DATA_DIR=./ml/data
ARTIFACT_DIR=./ml/artifacts
```

Adjust names to the actual settings implementation. The example must be internally consistent with the Docker Compose service names and application configuration.

Security notes:

- The values above are local-development placeholders only.
- Generate strong random secrets for every environment.
- Do not use the sample database password or session secret outside local development.
- Validate required environment variables at startup and provide safe, actionable errors.
- Never print secret values in startup logs.

### 14.3 Expected developer commands

Provide a root `Makefile` or equivalent task runner with consistent commands. Suggested interface:

```bash
make setup              # Install frontend/backend dependencies
make env                # Copy .env.example to .env if absent; never overwrite
make infra-up           # Start database, Redis, and observability dependencies
make db-migrate         # Apply database migrations
make seed               # Seed clearly labelled local demo records/user
make dev                # Start frontend, backend, worker, and required services
make test               # Run all applicable test suites
make test-backend       # Backend unit/integration/contract tests
make test-frontend      # Frontend unit/component tests
make test-e2e            # Browser end-to-end tests
make lint                # Lint all code
make typecheck           # Run available type checkers
make format-check        # Verify formatting
make smoke               # Run documented local smoke checks
make infra-down          # Stop local services without deleting volumes
make clean-demo-data     # Remove only generated demo data with confirmation
```

Document the exact commands implemented. Do not leave Makefile targets as empty placeholders.

### 14.4 Initial bootstrap sequence

The final implementation should support this simple flow from a clean clone:

```bash
git clone <your-repository-url>
cd aiops-sentinel
cp .env.example .env
# Edit local secrets and ports in .env
make setup
make infra-up
make db-migrate
make seed
make dev
```

Then open:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:8000/health/ready`
- API documentation: `http://localhost:8000/docs` in development only
- Prometheus: `http://localhost:9090` if exposed locally
- Loki/Tempo: expose only when needed for development/debugging

Use exact ports from the final Compose file. Avoid exposing internal observability services to public interfaces by default.

---

## 15. Testing and quality gates

Testing is mandatory, not a final cleanup task. Add tests as each module is built.

### 15.1 Backend tests

- Unit tests for schemas, validation, domain services, state transitions, feature extraction, detectors, and RCA ranking.
- Repository tests against a disposable test database.
- API integration tests for each route, including authentication and authorization.
- Contract tests for Prometheus/Loki/Tempo adapters using recorded fixtures or test doubles.
- Worker tests for queued, running, succeeded, retryable failure, and terminal failure states.
- Migration tests from an empty database and from the previous schema version.
- Security tests for access control, input validation, rate limiting, and secret redaction.

### 15.2 Frontend tests

- Unit tests for formatters, query parsing, and validation schemas.
- Component tests for forms, tables, dialogs, filter controls, charts' accessible summaries, and status labels.
- Route tests for all listed pages.
- Tests for loading, empty, stale, partial-data, error, unauthorized, and not-found states.
- Tests that all visible controls trigger the intended API call or navigation.
- Tests that mutations display pending, success, and failure states.

### 15.3 End-to-end browser tests

Use Playwright or an equivalent browser testing framework. At minimum, automate these workflows:

1. Unauthenticated user is redirected to Login.
2. Valid login opens Overview.
3. Invalid login shows a safe error.
4. Sidebar links open the correct routes and show the correct active state.
5. Overview service row opens Service Detail.
6. Service filters/search work and reset correctly.
7. Incident list filters and pagination work.
8. Incident detail loads evidence and timeline.
9. Run Investigation creates a job and displays its status/result.
10. Acknowledge/assign/resolve actions persist after refresh.
11. Topology node selection opens the right service.
12. Deployment timeline filters and related incident links work.
13. Experiment list opens a run and renders available metrics accurately.
14. Dataset registration rejects invalid manifests and accepts valid metadata.
15. Alert Rule validation catches invalid fields and successful CRUD persists.
16. Settings never reveal stored secrets.
17. Profile changes persist after reload.
18. Invalid IDs show a proper not-found state.
19. Backend outage shows a recoverable error rather than a blank page.
20. Narrow viewport remains usable and has no horizontal overflow in the main layout.

### 15.4 Route and interaction audit

For every page, maintain a checklist with:

- Route loads directly.
- Route loads after refresh.
- Navigation path to page works.
- Breadcrumbs work.
- All buttons work.
- All links resolve.
- Inputs validate.
- Loading/empty/error states work.
- Permission restrictions work.
- Data is real or explicitly labelled demo data.
- Responsive layout checked.
- Keyboard interaction checked.
- Browser console has no uncaught errors.
- Network requests have no unexpected 4xx/5xx responses.

### 15.5 ML tests

- Deterministic unit fixtures for normal/anomalous windows.
- Tests for missing values, duplicate timestamps, out-of-order samples, flat lines, spikes, gradual drifts, and seasonal changes.
- Tests for time alignment and service graph edge direction.
- Tests that prevent train/test leakage in split generation.
- Metric implementation tests against small hand-calculated examples.
- Reproducibility tests for fixed seeds where deterministic execution is expected.
- Tests for abstention when data is missing or confidence is below threshold.
- Performance tests for representative inference batch sizes.

### 15.6 CI quality gate

A pull request must not merge if any required gate fails:

- Formatting.
- Linting.
- Type checks.
- Backend tests.
- Frontend tests.
- Migration check.
- Build check.
- Critical E2E smoke tests.
- Dependency/security scan.

Do not silence a failing test, weaken assertions, or add broad lint suppression simply to obtain a green pipeline. Fix the underlying defect or document a narrow, justified exception.

---

## 16. Performance and reliability requirements

Treat these as initial engineering targets to measure and revise, not as achieved performance claims.

- Paginated list pages should return promptly under the documented local workload.
- Backend endpoints must use explicit database and external-request timeouts.
- Large telemetry queries must be bounded by time range, step, and result limit.
- Long-running model training and incident investigations must run in background workers, not block HTTP requests.
- Job status must persist across API restarts.
- Duplicate job submission should be prevented or made idempotent.
- UI should avoid unnecessary full-page refreshes when a single query can be invalidated/refetched.
- Tables should handle loading and pagination without rendering thousands of rows at once.
- Charts should downsample or aggregate dense data for display.
- Add indexes based on observed query patterns and validate with query plans.
- Cache only data with a clear invalidation/TTL policy.
- Provide graceful degradation when one telemetry backend is unavailable.

Track:

- API p50/p95 latency.
- External telemetry backend latency/error rate.
- Worker queue depth and job duration.
- Ingestion lag.
- Detection execution time.
- RCA execution time.
- Database pool usage.
- Frontend page load and route-transition performance.

---

## 17. Observability of AIOps Sentinel itself

The platform must be observable too.

- Emit structured JSON logs with timestamp, severity, service, request ID, and safe context.
- Instrument backend requests and background jobs using OpenTelemetry.
- Export basic service metrics such as request count, latency, error count, queue depth, and task duration.
- Track telemetry source health and last successful query time.
- Add readiness and liveness endpoints.
- Use correlation IDs from frontend/API through background jobs where possible.
- Never log passwords, access tokens, session cookies, raw secrets, or unnecessary sensitive payloads.

A platform that monitors other services but cannot explain its own failures is not complete.

---

## 18. Documentation deliverables

Keep documentation synchronized with the actual implementation.

Required documents:

- `README.md`: product, quick start, architecture, tests, and project status.
- `docs/architecture.md`: components, boundaries, data flow, and deployment diagrams.
- `docs/api-contract.md`: route catalogue, schemas, auth, and error behaviour.
- `docs/data-governance.md`: dataset sources, license checks, manifests, and preprocessing.
- `docs/research-plan.md`: research questions, literature review, baselines, and proposed contributions.
- `docs/evaluation-protocol.md`: data splits, metrics, leakage prevention, and experiment procedures.
- `docs/threat-model.md`: assets, trust boundaries, threats, and mitigations.
- `docs/runbooks/`: local startup, telemetry backend troubleshooting, database reset, and incident demo instructions.
- `docs/decisions/`: Architecture Decision Records for major choices.

Every command in documentation must be tested. Do not document a feature or endpoint as available until it exists and passes its tests.

---

## 19. Suggested implementation milestones

The CLI agent must follow this order unless a real dependency requires a justified change.

### Milestone 0 — Repository inspection and implementation plan

- Inspect the existing repository before modifying it.
- Identify existing languages, frameworks, scripts, and uncommitted user work.
- Do not delete or overwrite working files without a reason and explicit report.
- Produce a concise implementation plan and proposed file tree.
- Identify unknowns and environmental constraints.
- Verify the Docker and language runtimes available.

**Exit criteria:** plan approved by repository owner or clearly presented for review before large-scale changes.

### Milestone 1 — Monorepo foundation

- Create frontend/backend/ML/infrastructure structure.
- Add formatting, linting, type-checking, and test frameworks.
- Add `.env.example`, `.gitignore`, and task runner.
- Add CI workflows.
- Add a basic application shell and backend health endpoints.

**Exit criteria:** clean install, frontend build, backend start, lint, type checks, and smoke tests work.

### Milestone 2 — Infrastructure and telemetry

- Add PostgreSQL, Redis, OpenTelemetry Collector, Prometheus, Loki, and Tempo to the local Compose environment.
- Add the OpenTelemetry Demo profile or a documented lightweight alternative.
- Verify metrics/logs/traces reach their backends.
- Add adapter health checks and telemetry source status.

**Exit criteria:** documented commands start the environment and at least one real metric, log, and trace can be queried through backend adapters.

### Milestone 3 — Backend domain and persistence

- Implement database schema and migrations.
- Implement authentication/session handling.
- Implement services, topology, incidents, events, investigations, datasets, experiments, and alert-rule domain models.
- Implement API contracts and authorization.

**Exit criteria:** API contract tests and migration tests pass; state transitions and audit events are correct.

### Milestone 4 — First functional frontend

- Implement the authenticated layout and all routes in Section 7.
- Connect pages to real backend endpoints.
- Implement responsive states, validation, error handling, and route navigation.
- Use actual telemetry and persisted records; demo fixtures must be labelled.

**Exit criteria:** route/interaction audit passes for every page; no dead links or inert buttons.

### Milestone 5 — Baseline anomaly detection

- Implement canonical telemetry windows and feature extraction.
- Implement rolling robust-statistic detector.
- Add alert grouping and incident creation.
- Store detector configuration, version, and evidence.

**Exit criteria:** unit tests pass and a controlled anomaly in the demo workload creates a traceable incident in the UI.

### Milestone 6 — Baseline root-cause investigation

- Implement metric and topology-based candidate ranking.
- Gather log and trace evidence where available.
- Display candidate ranking and evidence references on incident detail.
- Implement investigation background jobs and retry behaviour.

**Exit criteria:** a controlled fault scenario results in a reproducible investigation result with source evidence and an explicit uncertainty state.

### Milestone 7 — Benchmark pipeline and research baselines

- Add RCAEval manifest/download/preprocessing tools.
- Build immutable split manifests.
- Implement and test baseline evaluation metrics.
- Record experiment configurations and artifacts.
- Add experiment and dataset UI.

**Exit criteria:** one benchmark subset can be processed from documented instructions and a baseline report is reproducible.

### Milestone 8 — Research model and ablations

- Implement temporal model candidate.
- Add graph-aware model candidate only after graph baseline.
- Compare single-source and multi-source approaches.
- Add calibration/abstention experiments.
- Produce model cards and research reports.

**Exit criteria:** results are reproducible, baseline comparisons are fair, and all limitations are documented.

### Milestone 9 — Hardening and release

- Run full browser, API, ML, and security suites.
- Test resource usage and recovery from backend interruption.
- Review access control and secrets handling.
- Test clean installation from a fresh clone.
- Complete screenshots and demo instructions using real application states.
- Tag a version only after all required acceptance criteria pass.

**Exit criteria:** Release checklist below is complete.

---

## 20. Definition of done

A feature is not complete merely because its code exists.

A feature is done only when:

1. Its acceptance criteria are written.
2. Its backend/API behaviour is implemented and validated.
3. Its frontend is connected to the real backend behaviour.
4. Loading, empty, stale, partial, error, and permission states are handled where relevant.
5. Form and query validation is present on both client and server where required.
6. Unit and integration tests are added.
7. Browser tests cover the important user flow.
8. Accessibility and responsive behaviour are checked.
9. Security implications are reviewed.
10. Documentation matches the actual implementation.
11. No known blocking defect remains.

### Release acceptance checklist

- [ ] Fresh-clone setup works from the README.
- [ ] Docker Compose services start and report health.
- [ ] Metrics, logs, and traces are queryable.
- [ ] Authentication and authorization work.
- [ ] Every documented route loads directly and through navigation.
- [ ] No dead links, placeholder routes, or inert controls remain.
- [ ] All forms have validation and useful error messages.
- [ ] Overview and service pages use real or explicitly labelled demo telemetry.
- [ ] Incident lifecycle persists and has an audit trail.
- [ ] Investigation jobs survive API process restarts.
- [ ] Root-cause candidates show evidence references and uncertainty.
- [ ] Dataset manifest and split tracking work.
- [ ] Experiment runs and metrics are reproducible.
- [ ] Backend, frontend, E2E, and ML tests pass.
- [ ] Lint, formatting, and type checks pass.
- [ ] No secrets or restricted raw datasets are committed.
- [ ] Security and dependency checks pass or have documented accepted exceptions.
- [ ] README commands and runbooks have been verified.

---

## 21. Git and collaboration conventions

Suggested branch naming:

- `main`: stable, tested branch.
- `feat/<short-name>`: feature implementation.
- `fix/<short-name>`: bug fix.
- `research/<short-name>`: experiment/model work.
- `docs/<short-name>`: documentation.

Commit style:

- `feat: add incident investigation workflow`
- `fix: handle missing metric windows`
- `test: cover invalid incident transitions`
- `research: add isolation forest baseline`
- `docs: document RCAEval preprocessing`

Pull requests must include:

- Problem and intended outcome.
- Summary of changes.
- Screenshots or short recording for UI changes.
- Tests added and exact test commands/results.
- Migration/configuration impact.
- Security and data implications.
- Known limitations.

Never commit `.env`, credentials, raw benchmark data, large model weights, cache files, local databases, or generated telemetry dumps. Use Git LFS or an artifact store for permitted large artifacts when needed.

---

## 22. CLI coding-agent execution brief

The following instructions are intended to be copied into a CLI coding agent along with this README. This README remains the project specification.

### 22.1 Role

Act as a senior full-stack engineer, ML engineer, test engineer, and pragmatic software architect working on AIOps Sentinel. Implement the product in the existing repository while preserving existing user work.

### 22.2 Mandatory working rules

1. Read this entire README before coding.
2. Inspect the existing repository and runtime before creating, deleting, or changing files.
3. Do not assume an empty repository.
4. Do not replace the architecture or stack without explaining the reason and updating the relevant documentation/ADR.
5. Work milestone by milestone in Section 19.
6. Before each milestone, state the scope, files/modules likely to change, acceptance criteria, and commands that will verify it.
7. Implement a complete vertical slice rather than scaffolding every feature with placeholder code.
8. Do not create fake buttons, fake links, hard-coded success messages, mock-only pages, or inert forms.
9. Do not fabricate telemetry, incidents, model metrics, or experiment results. Clearly label synthetic/demo fixtures.
10. Do not use AI-themed decorative symbols, emojis, robot/brain/sparkle/circuit icons, neon gradients, or chatbot-template styling in the UI. Follow Section 6 exactly.
11. Use typed schemas, explicit error handling, safe logging, and consistent API contracts.
12. Add tests with the implementation; do not postpone all tests until the end.
13. Run the relevant tests, build, lint, formatting, and type-check commands after meaningful changes.
14. Investigate and fix failures. Do not hide failures by disabling tests or weakening assertions.
15. Do not claim a command passed unless it was actually executed successfully.
16. Do not claim a feature is complete until its Definition of Done is satisfied.
17. Keep dependencies minimal and justify significant new dependencies.
18. Keep secrets out of source control and test output.
19. Do not run untrusted code or arbitrary shell commands outside a disposable sandbox.
20. Do not execute production remediation or state-changing infrastructure actions.
21. If a task is blocked by missing credentials, external services, resource limits, or incompatible tooling, implement the safe portion, report the blocker precisely, and provide the exact manual step needed.
22. Update README and supporting docs whenever actual commands, routes, configuration, or architecture change.

### 22.3 UI-specific coding rules

- Every page in Section 7 must be a real route with working navigation.
- Use a shared layout, design tokens, form components, table components, chart components, and feedback components.
- Keep page layouts consistent without making every page look like the same generic card grid.
- All forms require client-side usability validation and backend validation.
- All mutation buttons require pending, success, and failure behaviour.
- All data views require loading, empty, error, stale, and partial-data states as appropriate.
- Do not leave `href="#"`, `onClick={() => {}}`, TODO controls, or disabled actions presented as active functionality.
- If a feature is not implemented, do not show it as an active user action. Record it in the roadmap instead.
- Use real API responses. A demo-mode seed must be labelled in the UI.
- Check each route at desktop and narrow viewport sizes.
- Check keyboard navigation and visible focus states.
- Run Playwright E2E tests for the important workflows.

### 22.4 ML-specific coding rules

- Keep notebooks exploratory; move reusable code into importable modules.
- Provide deterministic configuration and seeds where practical.
- Store dataset and split manifests.
- Prevent leakage between train/validation/test sets.
- Establish baselines before complex models.
- Record every experiment, including failed experiments.
- Test metric calculations using hand-verified examples.
- Report uncertainty and data limitations.
- Never claim causal identification based only on correlation.
- Do not report unmeasured benchmark numbers.

### 22.5 Required response after each milestone

At the end of each milestone, report:

1. What was implemented.
2. Important files created or modified.
3. Commands actually executed.
4. Test/build/lint/type-check results, including failures.
5. Known bugs, limitations, and unresolved decisions.
6. How to run or verify the feature manually.
7. Whether the milestone acceptance criteria are met.
8. The next recommended milestone.

Do not silently continue through a failing milestone. Fix the failure or clearly identify the blocker before proceeding.

### 22.6 First task for the CLI agent

**Do not start by generating the entire application.** First perform Milestone 0:

- Inspect the repository tree and Git status.
- Inspect existing README, manifests, scripts, and environment files.
- Identify installed runtimes and Docker availability.
- Summarize what already exists and what must be preserved.
- Propose the implementation plan and target file tree.
- Identify any conflicts between the existing repository and this specification.

Then begin Milestone 1 with the smallest working vertical slice.

---

## 23. Reference documentation

Use official or primary project sources and re-check them when implementation begins because upstream commands and versions can change.

### Observability and AIOps

- OpenTelemetry Demo: <https://opentelemetry.io/docs/demo/>
- OpenTelemetry Demo Docker deployment: <https://opentelemetry.io/docs/demo/docker-deployment/>
- Prometheus HTTP API: <https://prometheus.io/docs/prometheus/latest/querying/api/>
- Loki HTTP API: <https://grafana.com/docs/loki/latest/reference/loki-http-api/>
- Tempo HTTP API: <https://grafana.com/docs/tempo/latest/api_docs/>
- Microsoft AIOpsLab: <https://microsoft.github.io/AIOpsLab/>

### Datasets and benchmarks

- RCAEval code: <https://github.com/phamquiluan/RCAEval>
- RCAEval dataset: <https://huggingface.co/datasets/phamquiluan/RCAEval>
- RCAEval paper: <https://arxiv.org/abs/2412.17015>
- LogHub: <https://github.com/logpai/loghub>
- AIOps Challenge 2020 dataset: <https://github.com/AIOps-Lab-NKU/AIOps-Challenge-2020-Data>

### Software and ML libraries

- Next.js App Router: <https://nextjs.org/docs/app>
- FastAPI: <https://fastapi.tiangolo.com/>
- Pydantic: <https://docs.pydantic.dev/>
- SQLAlchemy: <https://docs.sqlalchemy.org/>
- PyTorch: <https://pytorch.org/docs/stable/index.html>
- PyTorch Geometric: <https://pytorch-geometric.readthedocs.io/>
- scikit-learn: <https://scikit-learn.org/stable/>
- Playwright: <https://playwright.dev/docs/intro>

---

## 24. Final project objective

Deliver a reliable, well-tested, production-style AIOps application and a defensible research study. The strongest outcome is not the largest number of services or the most complicated model. It is a system whose data flow is traceable, whose model claims are measurable, whose UI is fully functional, whose failure modes are understood, and whose implementation can be explained and reproduced by its author.

**Build the smallest complete system first. Measure it honestly. Improve it scientifically. Keep every user-facing workflow dependable.**
