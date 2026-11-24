# AIOps Sentinel — Production Deployment Guide

## 1. System Architecture & Component Topology

AIOps Sentinel operates as a decoupled, multi-tier software reliability and engineering intelligence platform. In production environments, it is deployed across three discrete operational planes:

```
                                 [ Public / Ingress ]
                                          │
                                          ▼
                         ┌─────────────────────────────────┐
                         │   Nginx / Cloud Ingress Gateway │
                         │   - TLS Termination             │
                         │   - Security Headers (HSTS, CSP)│
                         │   - Rate Limiting (10r/m auth)  │
                         └────────────────┬────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
     ┌────────────────────────┐                     ┌───────────────────────────┐
     │  Next.js Frontend SSR  │                     │    FastAPI Backend API    │
     │  - Port 3000           │                     │    - Port 8000            │
     │  - Non-root UID 10001  │                     │    - Non-root UID 10001   │
     │  - Standalone Node     │                     │    - Prometheus /metrics  │
     └────────────────────────┘                     └─────────────┬─────────────┘
                                                                  │
                  ┌───────────────────────────────┬───────────────┴───────────────┐
                  ▼                               ▼                               ▼
     ┌────────────────────────┐     ┌────────────────────────┐      ┌──────────────────────────┐
     │  Background Workers    │     │  PostgreSQL 16 Cluster │      │  Redis 7 In-Memory Store │
     │  - Alert Evaluator     │     │  - Pool Size: 10 (+20) │      │  - Task Queue & Streams  │
     │  - Advisory Locked     │     │  - PgBouncer / Tuning  │      │  - Append-Only File (AOF)│
     │  - Durable Task Queue  │     │  - Persistent SSD      │      │  - Cache & Session Store │
     └────────────────────────┘     └────────────────────────┘      └──────────────────────────┘
                  │
                  ▼
     ┌────────────────────────────────────────────────────────┐
     │ Observability Infrastructure                           │
     │ - Prometheus (Metrics TSDB, Port 9090)                 │
     │ - Grafana Loki (Log Aggregation, Port 3100)            │
     │ - Grafana Tempo (Distributed Tracing, Port 3200)       │
     │ - OpenTelemetry Collector (OTLP gRPC 4317 / HTTP 4318) │
     └────────────────────────────────────────────────────────┘
```

---

## 2. Infrastructure Prerequisites

| Requirement | Minimum Specification | Recommended Production Specification |
| :--- | :--- | :--- |
| **Compute (API & Worker)** | 2 vCPU, 4 GB RAM | 4 vCPU, 8 GB RAM (x2 replicas) |
| **Compute (Frontend)** | 1 vCPU, 2 GB RAM | 2 vCPU, 4 GB RAM (x2 replicas) |
| **Database (PostgreSQL)** | PostgreSQL 16, 2 vCPU, 4 GB RAM | PostgreSQL 16 (HA / RDS Multi-AZ), 4 vCPU, 16 GB RAM |
| **Message Broker (Redis)** | Redis 7, 1 vCPU, 1 GB RAM | Redis 7 (ElastiCache / Sentinel Cluster), 2 GB RAM |
| **Storage (Persistent SSD)**| 20 GB gp3 / fast SSD | 100 GB gp3 (IOPS 3000, Throughput 125 MB/s) |
| **Network** | VPC with private subnets | Private subnets with NAT Gateway and TLS Ingress |

---

## 3. Production Environment Variables Reference

Create a production `.env` file from `.env.example`. In production mode (`APP_ENV=production`), the application enforces strict fail-fast security invariants:

```bash
# ==============================================================================
# APPLICATION RUNTIME & SECURITY
# ==============================================================================
APP_ENV=production
DEBUG=false
DEMO_MODE=false
APP_NAME="AIOps Sentinel Enterprise"
API_V1_PREFIX=/api/v1

# 32+ character high-entropy cryptographically random secrets (Generate: openssl rand -hex 32)
SESSION_SECRET=<GENERATE_VIA_OPENSSL_RAND_HEX_32>
JWT_SECRET_KEY=<GENERATE_VIA_OPENSSL_RAND_HEX_32>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# Allowed Web Origins (Strictly restrict to corporate domain/ingress)
CORS_ALLOWED_ORIGINS=https://sentinel.company.com,https://sentinel-internal.company.com

# ==============================================================================
# DATABASE & STORAGE
# ==============================================================================
# Production MUST use PostgreSQL with asyncpg driver (SQLite is prohibited in production)
DATABASE_URL=postgresql+asyncpg://sentinel_prod_usr:<STRONG_PRODUCTION_PASSWORD>@postgres-ha.internal:5432/sentinel_prod_db
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20
DATABASE_POOL_RECYCLE=1800

# Persistent Storage Backend (local or s3)
STORAGE_BACKEND=local
ASSESSMENT_STORAGE_DIR=/var/lib/aiops/storage/assessments
MAX_UPLOAD_SIZE_BYTES=52428800 # 50 MB

# Redis Broker (Cluster or Standalone with AOF enabled)
REDIS_URL=redis://:RedisAuthSecret_2026!@redis-ha.internal:6379/0

# ==============================================================================
# TELEMETRY & OBSERVABILITY SERVICES
# ==============================================================================
PROMETHEUS_URL=http://prometheus.monitoring.svc.cluster.local:9090
LOKI_URL=http://loki.monitoring.svc.cluster.local:3100
TEMPO_URL=http://tempo.monitoring.svc.cluster.local:3200
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector.monitoring.svc.cluster.local:4317

# Initial Administrator Credentials (Change password immediately on first login)
INITIAL_ADMIN_EMAIL=security-admin@company.com
INITIAL_ADMIN_PASSWORD=SentinelMaster_2026#Secure!
INITIAL_ADMIN_NAME="Enterprise Security Officer"
```

---

## 4. Single-Host Production Deployment (Docker Compose)

For dedicated single-host server environments:

```bash
# 1. Clone repository into production directory
cd /opt/aiops-sentinel

# 2. Configure environment
cp .env.example .env
chmod 600 .env
vim .env  # Populate strong production secrets

# 3. Create persistent directories with non-root ownership (UID 10001)
sudo mkdir -p /var/lib/aiops/storage/assessments
sudo chown -R 10001:10001 /var/lib/aiops/storage/assessments

# 4. Launch full production stack
docker compose -f docker-compose.prod.yml up -d --build

# 5. Verify service health
docker compose -f docker-compose.prod.yml ps
curl -f http://localhost/healthz
curl -f http://localhost/api/v1/health/live
curl -f http://localhost/metrics | head -n 20
```

---

## 5. Kubernetes & Multi-Replica Deployment

### A. Leader Election & Advisory Locking
When scaling `aiops-prod-alert-worker` across multiple Kubernetes pods, the worker automatically utilizes PostgreSQL session-level advisory locking (`pg_try_advisory_lock(424242)`). Only the active leader executes metric evaluations and incident generation cycles. If a pod terminates, PostgreSQL drops the session lock instantly, allowing a standby replica to assume leadership without split-brain incidents.

### B. Kubernetes Deployment Manifest Excerpt
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aiops-backend
  namespace: aiops
spec:
  replicas: 2
  selector:
    matchLabels:
      app: aiops-backend
  template:
    metadata:
      labels:
        app: aiops-backend
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8000"
        prometheus.io/path: "/metrics"
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 10001
        runAsGroup: 10001
        fsGroup: 10001
      containers:
        - name: backend
          image: your-registry.company.com/aiops-sentinel/backend:1.0.0
          ports:
            - containerPort: 8000
          envFrom:
            - secretRef:
                name: aiops-production-secrets
          readinessProbe:
            httpGet:
              path: /api/v1/health/ready
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /api/v1/health/live
              port: 8000
            initialDelaySeconds: 15
            periodSeconds: 15
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "2000m"
              memory: "4Gi"
```

---

## 6. Database Migrations & Zero-Downtime Releases

Alembic manages deterministic database schema evolutions. Never apply breaking schema modifications in a single step; utilize the expand-and-contract pattern:

```bash
# 1. Run migrations before updating application pods
docker compose -f docker-compose.prod.yml exec -T backend alembic upgrade head

# 2. Deploy updated application pods (rolling deployment)
docker compose -f docker-compose.prod.yml up -d --no-deps --build backend frontend worker
```

---

## 7. Operational Troubleshooting

| Symptom | Root Cause | Remediation Procedure |
| :--- | :--- | :--- |
| `502 Bad Gateway` on `/api/*` | Backend container initializing or failing healthchecks | Check logs: `docker logs aiops-prod-backend`. Verify database connectivity. |
| Alert Worker not evaluating rules | Lock contention or disconnected DB session | Check logs: `docker logs aiops-prod-alert-worker`. Verify PostgreSQL connection pool has available connections. |
| Assessment analysis stuck in `queued` | Background task queue blocked | Check Redis status: `docker exec -it aiops-prod-redis redis-cli ping`. Verify worker task consumer is healthy. |
| `429 Too Many Requests` on `/api/v1/auth/login` | Rate limit threshold exceeded (10 req/min) | Client IP has made more than 10 login attempts within 60s. Wait 60s or configure trusted proxy IPs in Nginx. |
| Telemetry shows `unavailable` | Prometheus/Loki endpoint down | In production, synthetic simulation is disabled. Verify network connectivity to `PROMETHEUS_URL` and `LOKI_URL`. |
