# AIOps Sentinel — Application Security & Threat Model Review

**Security Standard:** OWASP ASVS Level 2 / NIST SP 800-218 (Secure Software Development Framework)  
**Document Version:** 3.0.0 (Production Verified)  
**Status:** Certified Production-Grade Security Architecture  
**Date:** November 2026  
**Auditor:** Principal Application Security Engineer

---

## 1. Security Architecture & Threat Model Overview

AIOps Sentinel operates across three critical trust boundaries:
1. **Runtime Telemetry Ingestion (Pillar A):** Ingestion of infrastructure metrics (Prometheus), distributed traces (Tempo), and application logs (Loki).
2. **Codebase Production-Readiness Assessment (Pillar B):** Processing untrusted source code archives (ZIP), repository folders, and multi-file codebases uploaded by end users.
3. **Automated & Guided Remediation Operations:** Safe runbook execution with human-in-the-loop approvals on monitored services.

Because users submit untrusted source code and operators trigger runtime remediations, AIOps Sentinel enforces a **Zero-Execution Static Sandbox Boundary** and a **Strict Runbook Allowlist Boundary**.

---

## 2. Zero-Execution Static Sandbox Architecture

```
[Untrusted Client Upload (ZIP / Folder / Files)]
                       │
                       ▼
          [Archive Inspection Boundary]
          ├── Zip Slip Path Traversal Check (NFC canonical resolution)
          ├── Decompression Bomb Detection (Ratio > 100:1 rejection)
          ├── Encryption Flag Detection (Encrypted archives blocked)
          ├── Symlink Disallowance (0o120000 POSIX symlinks rejected)
          └── Max Directory Depth Enforcement (<= 16 levels)
                       │
                       ▼
          [Ephemeral Scratch Workspace]
          ├── Strictly isolated directory (/tmp/aiops_sentinel/workspaces/)
          ├── Pure AST Visitor Parsing (Python ast, Regex Lexers)
          ├── ZERO Dynamic Execution (No eval, exec, or import)
          └── Guaranteed Disk Purge (on completion & explicit deletion)
```

### 2.1 Archive Extraction Vulnerability Mitigations

| Threat Vector | Attack Mechanism | Implemented Mitigation & Evidence | Status |
|---|---|---|---|
| **Zip Slip** | Archive entries with `../` attempting to write outside target directory (e.g. `../../etc/passwd`). | Paths are normalized using `os.path.normpath` and Unicode NFC. Extraction verifies `dest.resolve().is_relative_to(target_dir.resolve())`. Rejects with `ValidationError`. | **VERIFIED** |
| **Zip Bomb** | Small archive expanding to hundreds of gigabytes, exhausting server disk/RAM. | Measures `file_size` vs `compress_size`. If ratio exceeds $100:1$ and uncompressed size exceeds $10 \text{ MB}$, rejects immediately before decompression. | **VERIFIED** |
| **Password Encrypted Zip** | Password-protected archive causing unbounded worker thread blocking. | Inspects ZIP header bit flags (`flag_bits & 0x1`). Rejects with clear HTTP 400 error. | **VERIFIED** |
| **Symlink Poisoning** | Malicious symlink pointing to `/proc`, `/sys`, or sensitive host files. | Checks external attributes (`attr >> 16 & 0o120000`). Rejects archive if any entry is a symlink. | **VERIFIED** |
| **Directory Depth Attack** | Deep recursive nesting (`a/b/c/...`) attempting to exhaust OS path buffers. | Enforces maximum directory hierarchy depth of **16 levels**. | **VERIFIED** |

---

## 3. Stored XSS Elimination & Content Security Policy

### 3.1 Vulnerability Remediation
Previously, dynamically generated HTML assessment reports interpolated vulnerability titles, rule IDs, and remediation advice directly without escaping.
- **Implemented Mitigation:**
  - All dynamic assessment metadata, filenames, and rule identifiers are strictly wrapped in `html.escape()`.
  - HTML reports embed strict Content Security Policy meta headers:
    ```html
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src data:;">
    <meta http-equiv="X-Content-Type-Options" content="nosniff">
    ```
- **Automated Verification:** Verified in unit test `test_html_report_xss_sanitization` (asserts 0 executable tags, confirms full HTML entity escaping).

---

## 4. Multi-Tenant Authorization, IDOR & Ownership Protection

### 4.1 Insecure Direct Object Reference (IDOR) Defense
- Assessment entities are stamped with `created_by_user_id`.
- The service layer (`assessment_service.py`) and API endpoints (`assessments.py`) enforce ownership checks across all 6 assessment endpoints:
  - `GET /api/v1/assessments` (Filtered to user's own scans unless user is `admin`/`operator`)
  - `GET /api/v1/assessments/{id}` (403 Forbidden if not owner or admin)
  - `GET /api/v1/assessments/{id}/export` (403 Forbidden if not owner or admin)
  - `GET /api/v1/assessments/{id}/findings` (403 Forbidden if not owner or admin)
  - `GET /api/v1/assessments/{id}/job` (403 Forbidden if not owner or admin)
  - `DELETE /api/v1/assessments/{id}` (403 Forbidden if not owner or admin)
- **Automated Verification:** Verified in integration test `test_assessment_ownership_and_idor_protection`.

---

## 5. Authentication, Refresh Token Rotation & Password Policy

### 5.1 Refresh Token Hardening & Rotation
- Refresh tokens are cryptographically signed JWTs using `HS256` with unique RFC 7519 `"jti"` claim.
- Token rotation: `POST /api/v1/auth/refresh` revokes the incoming refresh token and returns a fresh access/refresh token pair.
- Stored session tokens prevent replay attacks.

### 5.2 NIST SP 800-63B Compliant Password Policy
- `POST /api/v1/auth/password` and registration validate:
  - Minimum 10 characters length.
  - At least one uppercase letter (`[A-Z]`).
  - At least one lowercase letter (`[a-z]`).
  - At least one digit (`[0-9]`).
  - At least one special symbol.

---

## 6. Network Security, SSRF & Telemetry Boundaries

### 6.1 Server-Side Request Forgery (SSRF) Defense
- `validate_telemetry_url()` validates all outgoing Prometheus, Loki, and Tempo requests:
  - Requires strict `http` or `https` URL scheme.
  - Prohibits cloud metadata endpoints: `169.254.169.254`, `metadata.google.internal`, and AWS IMDSv2 paths.
  - Blocks link-local ranges (`169.254.0.0/16`, `fe80::/10`) in production mode.
- **Automated Verification:** Verified in unit test `test_telemetry_hardening.py`.

### 6.2 Truthful Fallback in Production
- In `APP_ENV=production`, `is_simulation_allowed()` evaluates to `False`.
- If telemetry services are down, the platform reports `status="unavailable"`, logs warnings, and never fabricates synthetic operational measurements.

---

## 7. Remediation Governance & Blast Radius Control

### 7.1 Zero Arbitrary Code Execution
- The remediation engine strictly allowlists 4 operations: `restart_pod`, `rollback_deployment`, `scale_replicas`, `toggle_circuit_breaker`.
- Arbitrary commands or shell scripts are rejected immediately with `ValidationError`.

### 7.2 Human-in-the-Loop & Audit Logging
- Operations require explicit human operator confirmation (`human_approval_confirmed=True`) and operational justification (`approval_notes`).
- Requires `operator` or `admin` RBAC role.
- All actions calculate blast radius and are immutably logged in `AuditEvent` and `IncidentEvent`.

---

## 8. Fail-Fast Production Security Invariants

`validate_production_security()` verifies at application startup:
1. `APP_ENV=production` rejects SQLite; PostgreSQL is mandatory.
2. Default or placeholder secrets (`SESSION_SECRET`, `JWT_SECRET_KEY`) halt process startup with exit code 1.
3. `DEMO_MODE=true` is rejected in production.
