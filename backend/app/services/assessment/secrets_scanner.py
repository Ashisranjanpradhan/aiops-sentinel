import re
from pathlib import Path
from typing import Any

# Regex patterns for high-risk secrets
SECRET_PATTERNS = [
    (
        "SEC_OPENAI_KEY",
        r"sk-[a-zA-Z0-9]{32,}",
        "Hardcoded OpenAI API Key",
        "critical",
        "Remove hardcoded API key and load securely via environment variables (e.g., OPENAI_API_KEY).",
    ),
    (
        "SEC_AWS_ACCESS_KEY",
        r"AKIA[0-9A-Z]{16}",
        "Hardcoded AWS Access Key ID",
        "critical",
        "Use AWS IAM roles, instance metadata, or AWS_ACCESS_KEY_ID environment variable.",
    ),
    (
        "SEC_GITHUB_TOKEN",
        r"ghp_[a-zA-Z0-9]{36}",
        "Hardcoded GitHub Personal Access Token",
        "critical",
        "Revoke token immediately and inject via CI/CD secrets or environment variables.",
    ),
    (
        "SEC_RSA_PRIVATE_KEY",
        r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
        "Embedded Private Cryptographic Key",
        "critical",
        "Never commit private keys to source repositories. Store in secret manager or key vault.",
    ),
    (
        "SEC_DB_URI_PASSWORD",
        r"(?:postgres|postgresql|mysql|mongodb(?:\+srv)?):\/\/[a-zA-Z0-9_\.\-]+:([^@\/\s]{4,})@",
        "Database Connection String with Plaintext Password",
        "high",
        "Externalize database password into DATABASE_URL environment variable.",
    ),
    (
        "SEC_HARDCODED_JWT_SECRET",
        r"(?i)(?:jwt_secret|session_secret|secret_key)\s*=\s*['\"][a-zA-Z0-9_\-!@#$%^&*]{8,}['\"]",
        "Hardcoded Application Secret Key",
        "high",
        "Generate cryptographic secret at deployment time or inject through secure secret manager.",
    ),
    (
        "SEC_SLACK_WEBHOOK",
        r"https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]+\/B[a-zA-Z0-9_]+\/[a-zA-Z0-9_]+",
        "Hardcoded Slack Webhook URL",
        "medium",
        "Move webhook URLs to environment configuration to avoid unauthorized channel messaging.",
    ),
]


def redact_secret(val: str) -> str:
    """Redact secret string to preserve preview without leaking credential."""
    if len(val) <= 8:
        return "****"
    return f"{val[:4]}...{val[-4:]}"


class SecretsScanner:
    """Scans codebase files for exposed credentials and secrets."""

    @classmethod
    def scan_files(cls, workspace_dir: Path, files: list[Path]) -> list[dict[str, Any]]:
        findings = []

        for file_path in files:
            # Skip non-text files and large files > 1.5MB
            if file_path.stat().st_size > 1.5 * 1024 * 1024:
                continue
            if file_path.suffix.lower() in (
                ".png",
                ".jpg",
                ".jpeg",
                ".gif",
                ".ico",
                ".pdf",
                ".zip",
                ".tar",
                ".gz",
                ".woff",
                ".woff2",
                ".ttf",
                ".eot",
                ".pyc",
                ".db",
                ".sqlite",
            ):
                continue

            try:
                content = file_path.read_text(encoding="utf-8", errors="ignore")
            except (OSError, UnicodeDecodeError):
                continue

            rel_path = str(file_path.relative_to(workspace_dir))
            lines = content.splitlines()

            for rule_id, pattern, title, severity, advice in SECRET_PATTERNS:
                for line_idx, line in enumerate(lines, start=1):
                    # Skip commented examples in .env.example or markdown docs if appropriate
                    if ".env.example" in rel_path and "secret" in title.lower():
                        continue

                    match = re.search(pattern, line)
                    if match:
                        matched_str = match.group(0)
                        redacted = redact_secret(matched_str)
                        line_snippet = line.replace(matched_str, redacted).strip()
                        findings.append(
                            {
                                "dimension": "Security & Secrets Hygiene",
                                "rule_id": rule_id,
                                "title": title,
                                "description": f"Exposed credential pattern found in `{rel_path}` at line {line_idx}.",
                                "severity": severity,
                                "file_path": rel_path,
                                "line_number": line_idx,
                                "evidence_snippet": line_snippet[:200],
                                "remediation_advice": advice,
                            }
                        )

        return findings
