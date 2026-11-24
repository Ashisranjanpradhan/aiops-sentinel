# Security Policy — AIOps Sentinel

## Supported Versions

Security updates and critical patches are actively applied to the following release branches:

| Version | Supported | Security Maintenance Status |
| :--- | :--- | :--- |
| `1.0.x` (Current Main) | :white_check_mark: | Full Security Support & Active Maintenance |
| `< 1.0.0` | :x: | End of Life / Unsupported |

---

## Reporting a Vulnerability

The AIOps Sentinel engineering team takes platform security and telemetry integrity seriously. If you discover a potential vulnerability, privilege escalation risk, or security defect, please follow our coordinated disclosure policy.

### Reporting Channels

1. **Email:** Submit a detailed advisory to `security@aiops-sentinel.local` (or open a confidential GitHub Security Advisory).
2. **Details to Provide:**
   - Detailed description of the suspected vulnerability.
   - Affected component(s) (e.g., API Gateway, FastAPI backend, assessment parser, Next.js frontend).
   - Step-by-step reproduction instructions or a non-destructive Proof of Concept (PoC).
   - Potential impact on cluster confidentiality, integrity, or availability.

### Coordinated Disclosure Timeline

- **Initial Acknowledgment:** Within **24 business hours**.
- **Triage & Reproducibility Assessment:** Within **3 business days**.
- **Fix Development & Staging Validation:** Within **7 to 14 business days** depending on severity.
- **Public Disclosure:** Following fix deployment across supported container images and publication of a coordinated CVE/GHSA release advisory.

---

## Security Commitments

- **No Public Exposure of Secrets:** Never post unredacted secrets, credentials, or customer telemetry in public GitHub issues or pull requests.
- **Automated Scanning:** Every commit is scanned with automated secret detection (Gitleaks) and container dependency vulnerability auditing (Trivy/Dependabot).
- **Safe Sandboxing:** The Codebase Production-Readiness Assessment engine parses uploaded code statically via AST analysis without arbitrary code execution.
