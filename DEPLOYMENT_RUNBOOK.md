# Deployment Runbook — AIOps Sentinel

**Platform Version:** `1.0.0`  
**Target Environment:** Staging & Production (Docker Compose / Kubernetes / Cloud VM)  
**Security Classification:** Enterprise Operations  

---

## 1. Prerequisites & System Requirements

### Minimum Compute Hardware
- **CPU:** 4 vCPUs (x86_64 or ARM64 / Apple Silicon)
- **RAM:** 8 GB minimum (16 GB recommended for high-volume telemetry ingestion)
- **Disk Storage:** 50 GB SSD persistent storage
- **Operating System:** Ubuntu 22.04 LTS / Debian 12 / macOS Sonoma (dev)

### Software Dependencies
- **Docker Engine:** `24.0.0+`
- **Docker Compose:** `v2.20.0+`
- **OpenSSL:** `3.0+` (for key generation)
- **Git:** `2.40+`

---

## 2. Architecture & Service Ports

| Service Component | Internal Container Port | Host Port (Staging) | Host Port (Production) | Health Endpoint |
| :--- | :---: | :---: | :---: | :--- |
| **Frontend (Next.js 14)** | `3000` | `3000` | NGINX Reverse Proxy | `GET /login` |
| **Backend (FastAPI)** | `8000` | `8000` | NGINX Reverse Proxy | `GET /api/v1/health/live` |
| **Database (PostgreSQL 16)** | `5432` | `5433` | Internal Only (`5432`) | `pg_isready` |
| **Cache & Queue (Redis 7)** | `6379` | `6380` | Internal Only (`6379`) | `redis-cli ping` |
| **Metrics (Prometheus)** | `9090` | `9090` | Internal / VPN (`9090`) | `/-/healthy` |
| **Logs (Grafana Loki)** | `3100` | `3100` | Internal Only (`3100`) | `/ready` |

---

## 3. Step-by-Step Production Deployment

### Step 1: Clone Repository
```bash
git clone https://github.com/Ashisranjanpradhan/aiops-sentinel.git
cd aiops-sentinel
```

### Step 2: Configure Production Environment Variables
Generate cryptographic secrets and populate `.env.production`:

```bash
# Generate high-entropy 256-bit secret key
openssl rand -hex 32
# Output example: 4a2b9f8e7d1c6a5b0e3f2d1c9a8b7e6f5d4c3b2a1e0f9d8c7b6a5e4f3d2c1b0a

# Generate strong database password
openssl rand -base64 24
```

Create `/opt/aiops-sentinel/.env`:
```ini
APP_ENV=production
LOG_LEVEL=info

# Security & Cryptography
SECRET_KEY=<GENERATED_32_BYTE_HEX_SECRET>
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=14

# Database Connection (PostgreSQL)
DATABASE_URL=postgresql+asyncpg://aiops_user:<DB_PASSWORD>@postgres:5432/aiops_sentinel_prod
POSTGRES_DB=aiops_sentinel_prod
POSTGRES_USER=aiops_user
POSTGRES_PASSWORD=<DB_PASSWORD>

# Redis
REDIS_URL=redis://redis:6379/0

# Ingress & Public Endpoints
NEXT_PUBLIC_API_BASE_URL=https://sentinel.yourdomain.com
CORS_ORIGINS=["https://sentinel.yourdomain.com","https://ashisranjanpradhan.github.io"]

# ArchMind Sandbox Limits
ASSESSMENT_MAX_UPLOAD_BYTES=26214400
ASSESSMENT_MAX_WORKSPACE_BYTES=104857600
ASSESSMENT_MAX_FILE_COUNT=5000
```

### Step 3: Launch Supporting Infrastructure
```bash
# Start PostgreSQL, Redis, and Prometheus
docker compose -f docker-compose.production.yml up -d postgres redis prometheus

# Verify database health
docker compose -f docker-compose.production.yml exec postgres pg_isready -U aiops_user -d aiops_sentinel_prod
```

### Step 4: Apply Database Migrations
```bash
# Run Alembic migrations to bring schema to head
docker compose -f docker-compose.production.yml run --rm backend alembic upgrade head
```

### Step 5: Seed Baseline System Data (Initial Setup)
```bash
# Seed initial microservices, topology, and administrator account
docker compose -f docker-compose.production.yml run --rm backend python -m app.db.seed
```

### Step 6: Start Full Application Stack
```bash
# Launch backend, alert worker, and frontend
docker compose -f docker-compose.production.yml up -d --remove-orphans
```

---

## 4. Verification & Post-Deployment Smoke Checks

Verify each layer systematically:

```bash
# 1. Backend Liveness & Readiness
curl -s -f http://localhost:8000/api/v1/health/live | jq .
curl -s -f http://localhost:8000/api/v1/health/ready | jq .

# 2. Database Connectivity
curl -s -f http://localhost:8000/api/v1/meta | jq .

# 3. Frontend Availability
curl -s -I http://localhost:3000/login | grep "HTTP/1.1 200 OK"
curl -s -I http://localhost:3000/privacy | grep "HTTP/1.1 200 OK"

# 4. Container Health Status
docker compose -f docker-compose.production.yml ps
```

---

## 5. Zero-Downtime Rolling Update Procedure

When releasing a new version:

```bash
# 1. Fetch latest release tag
git fetch --tags origin
git checkout v1.0.1

# 2. Build or pull updated container images
docker compose -f docker-compose.production.yml pull

# 3. Apply schema migrations
docker compose -f docker-compose.production.yml run --rm backend alembic upgrade head

# 4. Rolling restart of backend worker and API
docker compose -f docker-compose.production.yml up -d --no-deps --build backend alert_worker

# 5. Rolling restart of frontend
docker compose -f docker-compose.production.yml up -d --no-deps --build frontend

# 6. Verify health
curl -s -f http://localhost:8000/api/v1/health/ready || (echo "Deployment failed! Rolling back..." && exit 1)
```

---

## 6. Disaster Recovery & Database Backup

### Automated Daily Backup Script
```bash
#!/usr/bin/env bash
set -euo pipefail
BACKUP_DIR="/var/backups/aiops"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "${BACKUP_DIR}"

docker compose -f docker-compose.production.yml exec -T postgres \
  pg_dump -U aiops_user aiops_sentinel_prod | gzip > "${BACKUP_DIR}/aiops_backup_${TIMESTAMP}.sql.gz"

# Retain 30 days of backups
find "${BACKUP_DIR}" -type f -name "*.sql.gz" -mtime +30 -delete
echo "Backup completed: aiops_backup_${TIMESTAMP}.sql.gz"
```

### Restoration Procedure
```bash
gunzip < /var/backups/aiops/aiops_backup_20261124_120000.sql.gz | \
  docker compose -f docker-compose.production.yml exec -T postgres \
  psql -U aiops_user -d aiops_sentinel_prod
```
