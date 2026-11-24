# Production Environment Variables Reference Catalog — AIOps Sentinel

**Platform Version:** `1.0.0`  
**Security Classification:** Configuration Reference  
**Last Updated:** November 24, 2026  

This document serves as the authoritative, comprehensive reference catalog of all environment variables required or supported across the AIOps Sentinel ecosystem: backend service, worker, database, cache, frontend console, and CI/CD automation pipelines.

---

## 1. General Application Settings

| Variable Name | Type | Default Value | Required in Prod? | Description / Guidance |
| :--- | :---: | :--- | :---: | :--- |
| `APP_ENV` | `string` | `development` | **YES** | Environment tier: `development`, `test`, `staging`, or `production`. |
| `APP_NAME` | `string` | `AIOps Sentinel` | No | Application branding wordmark. |
| `LOG_LEVEL` | `string` | `INFO` | No | Logging verbosity: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`. |
| `DEFAULT_TIMEZONE`| `string` | `UTC` | No | Default timezone for telemetry aggregation and audit timestamps. |
| `DEMO_MODE` | `boolean` | `false` | No | When `false`, strictly disables all mock data generators and simulation fallbacks. |

---

## 2. Security, Cryptography & Session Management

> [!CAUTION]
> In `staging` and `production`, the backend enforces **fail-fast startup validation**. If `SESSION_SECRET` or `SECRET_KEY` is shorter than 32 characters or matches known default placeholders, the service will refuse to start.

| Variable Name | Type | Default Value | Required in Prod? | Description / Guidance |
| :--- | :---: | :--- | :---: | :--- |
| `SESSION_SECRET` | `secret` | *(None in prod)* | **YES** | High-entropy 256-bit encryption secret (min 32 characters) for JWT tokens and sessions. |
| `SESSION_COOKIE_NAME` | `string` | `aiops_session` | No | Name of session state cookie. |
| `SESSION_COOKIE_SECURE` | `boolean` | `true` | **YES** | Set `true` in production to enforce `Secure; HttpOnly` over HTTPS. |
| `SESSION_COOKIE_SAMESITE`| `string` | `lax` | No | Cookie SameSite policy (`lax`, `strict`, or `none`). |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `int` | `60` | No | Lifetime of JWT bearer access tokens (minutes). |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `int` | `14` | No | Lifetime of refresh tokens before mandatory re-login. |
| `CORS_ALLOWED_ORIGINS` | `csv` | `https://yourdomain.com` | **YES** | Comma-separated list of permitted origin domains for browser CORS. |

---

## 3. Database & Persistence Layer (PostgreSQL)

| Variable Name | Type | Default Value | Required in Prod? | Description / Guidance |
| :--- | :---: | :--- | :---: | :--- |
| `DATABASE_URL` | `string` | `sqlite+aiosqlite:///aiops_sentinel.db` | **YES** | Async PostgreSQL connection URI: `postgresql+asyncpg://user:pass@host:5432/dbname`. |
| `POSTGRES_DB` | `string` | `aiops_sentinel_prod` | No | PostgreSQL database name used by Docker Compose. |
| `POSTGRES_USER` | `string` | `aiops_user` | No | PostgreSQL username used by Docker Compose. |
| `POSTGRES_PASSWORD` | `secret`| *(Must be generated)* | **YES** | Strong database password for PostgreSQL container. |

---

## 4. Cache, Queue & Advisory Lock Layer (Redis)

| Variable Name | Type | Default Value | Required in Prod? | Description / Guidance |
| :--- | :---: | :--- | :---: | :--- |
| `REDIS_URL` | `string` | `redis://localhost:6379/0` | **YES** | Redis connection URI for task queues, cache, and rate limiters. |
| `QUEUE_MAX_WORKERS` | `int` | `4` | No | Number of concurrent background evaluation workers. |

---

## 5. Ingress & Observability Integrations

| Variable Name | Type | Default Value | Required in Prod? | Description / Guidance |
| :--- | :---: | :--- | :---: | :--- |
| `PROMETHEUS_URL` | `string` | `http://prometheus:9090` | No | HTTP URI for querying Prometheus metrics scrapers. |
| `LOKI_URL` | `string` | `http://loki:3100` | No | HTTP URI for querying Grafana Loki distributed log streams. |
| `TEMPO_URL` | `string` | `http://tempo:3200` | No | HTTP URI for querying Grafana Tempo trace collector. |
| `OTEL_EXPORTER_OTLP_ENDPOINT`| `string`| `http://otel-collector:4317` | No | gRPC endpoint for exporting internal Sentinel OTel traces. |

---

## 6. ArchMind Codebase Assessment Security Quotas

| Variable Name | Type | Default Value | Description / Security Boundary |
| :--- | :---: | :--- | :--- |
| `ASSESSMENT_MAX_UPLOAD_BYTES` | `int` | `26214400` (25 MB) | Maximum permitted ZIP file upload size. |
| `ASSESSMENT_MAX_WORKSPACE_BYTES`| `int` | `104857600` (100 MB) | Maximum uncompressed archive workspace size (Zip-bomb defense). |
| `ASSESSMENT_MAX_FILE_COUNT` | `int` | `5000` | Maximum number of files processed per codebase assessment. |
| `ASSESSMENT_WORKSPACE_DIR` | `string` | `/tmp/aiops_assessments` | Isolation directory for zero-execution AST analysis workspaces. |

---

## 7. Frontend Console Environment Settings (Next.js 14)

| Variable Name | Type | Default Value | Required in Prod? | Description / Guidance |
| :--- | :---: | :--- | :---: | :--- |
| `NEXT_PUBLIC_API_BASE_URL` | `string` | `""` (Empty string in browser) | Optional | Base URL for FastAPI backend. If empty, browser routes through Next.js proxy rewrite `/api/v1/:path*`. |
| `PORT` | `int` | `3000` | No | Internal port for Next.js standalone server. |
| `HOSTNAME` | `string` | `0.0.0.0` | No | Host bind interface for container runtime. |

---

## 8. GitHub Actions CI/CD Deployment Secrets

Configure these in GitHub Repository Settings (`Settings -> Secrets and variables -> Actions`):

| Secret Name | Scope | Description |
| :--- | :---: | :--- |
| `STAGING_HOST` | `staging` | Hostname or IP address of the staging deployment server. |
| `STAGING_SSH_KEY` | `staging` | SSH private key with deployment access to staging host. |
| `STAGING_DB_PASSWORD` | `staging` | PostgreSQL staging password for database migrations. |
| `PROD_HOST` | `production` | Fully qualified domain name or IP of production host. |
| `PROD_SSH_KEY` | `production` | Restricted SSH private key for production deployment orchestrator. |
| `PROD_SECRET_KEY` | `production` | Production `SESSION_SECRET` value. |
| `PROD_DB_PASSWORD` | `production` | Production PostgreSQL password. |

---

## 9. Example Production `.env` Template

```ini
# Environment & Server
APP_ENV=production
LOG_LEVEL=INFO
DEMO_MODE=false
DEFAULT_TIMEZONE=UTC

# Cryptography & Security (Generate with: openssl rand -hex 32)
SESSION_SECRET=e7b4a1c89f2d3e0b5a6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a
SESSION_COOKIE_SECURE=true
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=14
CORS_ALLOWED_ORIGINS=https://sentinel.example.com,https://ashisranjanpradhan.github.io

# PostgreSQL 16 Connection
DATABASE_URL=postgresql+asyncpg://aiops_user:VerySecretDatabasePassword123!@postgres:5432/aiops_sentinel_prod
POSTGRES_DB=aiops_sentinel_prod
POSTGRES_USER=aiops_user
POSTGRES_PASSWORD=VerySecretDatabasePassword123!

# Redis Cache & Queue
REDIS_URL=redis://redis:6379/0

# Ingress
NEXT_PUBLIC_API_BASE_URL=https://sentinel.example.com
```
