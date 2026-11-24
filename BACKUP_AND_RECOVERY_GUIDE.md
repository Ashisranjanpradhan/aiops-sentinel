# AIOps Sentinel — Backup & Disaster Recovery Guide

## 1. Disaster Recovery Objectives

| Metric | Target Objective | Implementation Mechanism |
| :--- | :--- | :--- |
| **RPO (Recovery Point Objective)** | $\le 1$ Hour | Automated hourly compressed snapshots + WAL replication |
| **RTO (Recovery Time Objective)** | $\le 15$ Minutes | Scripted checksum validation + stream-based restoration |
| **Retention Period** | 14 Days Local, 90 Days Cold | Automated daily pruning with S3/GCS lifecycle policies |

---

## 2. Backup Architecture & Data Ledger

The following critical state entities must be preserved during disaster recovery:
1. **PostgreSQL Relational Ledger**:
   - User credentials, roles, and audit trail logs.
   - Monitored microservices and dependency topology graph (`Service`, `ServiceEdge`).
   - Incident records, timeline events, and evidence references.
   - Alert evaluation rules and trigger history.
   - Codebase production-readiness assessments and vulnerability findings.
   - Machine learning experiment runs, hyperparameters, and metric artifacts.
2. **Persistent File Storage**:
   - Uploaded codebase archives (`/var/lib/aiops/storage/assessments`).
   - Exported assessment reports (SARIF, HTML, JSON).
   - Trained detector joblib artifacts and evaluation case caches (`ml/artifacts`).

---

## 3. Automated Backup Configuration

The production backup script is located at:
`scripts/backup-db.sh`

### Crontab Schedule
To execute automated hourly backups with 14-day retention, configure `cron` on the host:
```cron
# Hourly database backup at minute 0
0 * * * * cd /opt/aiops-sentinel && ./scripts/backup-db.sh >> /var/log/aiops-backup.log 2>&1
```

### Manual Backup Execution
```bash
# Execute snapshot manually
BACKUP_DIR="/mnt/backups" POSTGRES_PASSWORD="YourProdPassword" ./scripts/backup-db.sh
```

### Output Artifacts
Each backup execution generates two files:
- `aiops_aiops_sentinel_YYYYMMDD_HHMMSS.sql.gz`: Gzip-compressed PostgreSQL schema and data.
- `aiops_aiops_sentinel_YYYYMMDD_HHMMSS.sql.gz.sha256`: Cryptographic SHA-256 checksum for tamper-evidence.

---

## 4. Step-by-Step Restoration Procedure

When recovering from data corruption, accidental deletion, or infrastructure failure:

### Step 1: Locate Target Snapshot
Identify the desired snapshot from the backup directory:
```bash
ls -lht /opt/aiops-sentinel/backups/aiops_*.sql.gz | head -n 5
```

### Step 2: Validate Checksum & Integrity
Execute `scripts/restore-db.sh`. The script automatically checks the corresponding `.sha256` file before touching the database:
```bash
./scripts/restore-db.sh /opt/aiops-sentinel/backups/aiops_aiops_sentinel_20261122_225921.sql.gz
```

### Step 3: Verify Restored Schema & Tables
Connect to PostgreSQL and verify that all core tables are populated:
```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U aiops_prod -d aiops_sentinel_prod -c "
SELECT table_name, (xpath('/row/cnt/text()', xml_count))[1]::text::int as row_count
FROM (
  SELECT table_name,
         query_to_xml(format('SELECT count(*) as cnt FROM %I', table_name), false, true, '') as xml_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
) t ORDER BY row_count DESC;
"
```

### Step 4: Restart Application Services
Once database restoration completes, restart application workers to re-initialize leader elections and task consumers:
```bash
docker compose -f docker-compose.prod.yml restart backend worker
```

---

## 5. Cold Storage & S3 Offsite Archival

In enterprise environments, local backups must be mirrored to air-gapped or immutable S3 storage:
```bash
# Push compressed backups to encrypted S3 bucket with Object Lock (WORM)
aws s3 sync /opt/aiops-sentinel/backups/ s3://company-aiops-disaster-recovery/backups/ \
    --sse aws:kms \
    --sse-kms-key-id arn:aws:kms:region:account:key/dr-key-id
```

---

## 6. Disaster Recovery Drill Schedule

SRE teams must execute a semi-annual recovery drill:
1. Provision a clean, isolated staging environment.
2. Retrieve the latest production snapshot from cold storage.
3. Execute `scripts/restore-db.sh`.
4. Run automated integration test suite against restored staging DB:
   ```bash
   pytest backend/tests/integration/test_api.py
   ```
5. Log drill outcome, elapsed time (RTO), and any recovery blockers in the SRE compliance portal.
