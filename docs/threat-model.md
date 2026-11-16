# Threat Model & Safe Execution Boundary

## 1. Trust Boundaries
- **Public vs Protected**: All routes except `/login`, `/health/live`, `/health/ready`, and `/meta` require valid authentication.
- **Session Security**: Session tokens are transmitted in HTTP-only, SameSite cookies or Bearer Authorization headers. Passwords are hashed with Argon2id.
- **Telemetry Backends**: Prometheus, Loki, and Tempo interfaces are accessed strictly through server-side clients with bounded timeouts and input validation; internal query APIs are never exposed directly to client browsers.

## 2. Safe Execution Policy
- AIOps Sentinel acts as an investigation and advisory platform (Human Control principle, Section 1.4).
- The platform does not autonomously execute production rollbacks, pod kills, or host modifications.
- Secret masking: Endpoint credentials, connection strings, and tokens are redacted from all API responses and UI displays.
