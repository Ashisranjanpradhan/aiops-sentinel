import html
from pathlib import Path
from typing import Any

DIMENSION_WEIGHTS = {
    "Architecture & Modularity": 0.10,
    "API Design & Contracts": 0.10,
    "Database & Data Modeling": 0.10,
    "Security & Secrets Hygiene": 0.15,
    "Reliability & Fault Tolerance": 0.10,
    "Observability & Telemetry": 0.10,
    "Testing & Quality Assurance": 0.15,
    "Configuration & Environment Hygiene": 0.10,
    "Deployment & Infrastructure": 0.05,
    "Documentation & Maintainability": 0.05,
}

SEVERITY_DEDUCTIONS = {
    "critical": 25,
    "high": 15,
    "medium": 8,
    "low": 3,
    "info": 0,
}

STANDARD_CHECKS_PER_DIMENSION = {
    "Architecture & Modularity": [
        "Directory hierarchy modularity",
        "Circular dependency absence",
        "Layered separation of concerns",
        "Coupling and package cohesion",
    ],
    "API Design & Contracts": [
        "Explicit request/response schemas",
        "Consistent error response envelope",
        "Input boundary validation",
        "Versioning and route structure",
    ],
    "Database & Data Modeling": [
        "SQL injection prevention",
        "Migration versioning tracking",
        "Connection lifecycle management",
        "ORM/schema indexing hygiene",
    ],
    "Security & Secrets Hygiene": [
        "Zero hardcoded API credentials",
        "Zero private keys or tokens in source",
        "Dangerous code execution absence",
        "Command injection prevention",
        "Safe deserialization protocols",
    ],
    "Reliability & Fault Tolerance": [
        "Swallowed exception handling",
        "Timeout and retry bounds",
        "Circuit breaker or fallback safety",
        "Graceful resource cleanup",
    ],
    "Observability & Telemetry": [
        "Container liveness & readiness probes",
        "Structured logging with context",
        "Correlation & request tracking",
        "Metric collection instruments",
    ],
    "Testing & Quality Assurance": [
        "Automated unit test presence",
        "Integration test existence",
        "Code syntax validity across sources",
        "Test directory organization",
    ],
    "Configuration & Environment Hygiene": [
        "Environment template (.env.example)",
        "Secrets separation from codebase",
        "Default runtime configuration",
    ],
    "Deployment & Infrastructure": [
        "Containerization manifest (Dockerfile)",
        "Non-root container user safety",
        "Orchestration manifest (Compose/K8s)",
        "Multi-stage build optimization",
    ],
    "Documentation & Maintainability": [
        "Repository README setup guide",
        "Architecture and contributing docs",
        "License file presence",
    ],
}


class DimensionEvaluator:
    """Evaluates 10 core dimensions, tallies weighted scores, and generates actionable advice."""

    @classmethod
    def evaluate(
        cls,
        workspace_dir: Path,
        files: list[Path],
        detector_info: dict[str, Any],
        static_findings: list[dict[str, Any]],
        is_partial_upload: bool = False,
    ) -> tuple[float, str, dict[str, Any], list[dict[str, Any]], list[dict[str, Any]], str]:
        all_findings = list(static_findings)
        rel_files = [str(f.relative_to(workspace_dir)) for f in files]
        file_names_lower = {f.name.lower() for f in files}

        # 1. Architecture & Modularity checks
        cls._check_architecture(rel_files, all_findings)

        # 2. API Design & Contracts checks
        cls._check_api_design(rel_files, files, all_findings)

        # 3. Database & Data Modeling checks
        cls._check_database(rel_files, files, all_findings)

        # 4. Reliability & Fault Tolerance checks
        cls._check_reliability(files, all_findings)

        # 5. Observability & Telemetry checks
        cls._check_observability(rel_files, files, all_findings)

        # 6. Testing & Quality Assurance checks
        cls._check_testing(rel_files, all_findings)

        # 7. Configuration & Environment Hygiene checks
        cls._check_configuration(rel_files, all_findings)

        # 8. Deployment & Infrastructure checks
        cls._check_deployment(rel_files, files, all_findings)

        # 9. Documentation & Maintainability checks
        cls._check_documentation(rel_files, file_names_lower, all_findings)

        # Calculate scores and check distributions per dimension
        dimension_scores: dict[str, dict[str, Any]] = {}
        weighted_sum = 0.0

        for dim_name, weight in DIMENSION_WEIGHTS.items():
            dim_findings = [f for f in all_findings if f["dimension"] == dim_name]
            deductions = sum(SEVERITY_DEDUCTIONS.get(f["severity"], 5) for f in dim_findings)
            raw_score = max(0.0, min(100.0, 100.0 - deductions))
            weighted_sum += raw_score * weight

            # Status classification
            if raw_score >= 80:
                status = "EXCELLENT"
            elif raw_score >= 65:
                status = "GOOD"
            elif raw_score >= 50:
                status = "MARGINAL"
            else:
                status = "POOR"

            # Count checks
            defined_checks = STANDARD_CHECKS_PER_DIMENSION.get(dim_name, [])
            failed_count = len({f["rule_id"] for f in dim_findings})

            # If partial upload, some checks are unverified
            if is_partial_upload or len(files) < 3:
                unverified_count = max(1, len(defined_checks) - failed_count - 1)
                passed_count = max(0, len(defined_checks) - failed_count - unverified_count)
                confidence = "LOW" if is_partial_upload else "MEDIUM"
                evidence_coverage = 0.4 if is_partial_upload else 0.65
            else:
                unverified_count = 0
                passed_count = max(0, len(defined_checks) - failed_count)
                confidence = "HIGH"
                evidence_coverage = 0.95

            severity_dist = {
                "critical": sum(1 for f in dim_findings if f["severity"] == "critical"),
                "high": sum(1 for f in dim_findings if f["severity"] == "high"),
                "medium": sum(1 for f in dim_findings if f["severity"] == "medium"),
                "low": sum(1 for f in dim_findings if f["severity"] == "low"),
            }

            dimension_scores[dim_name] = {
                "score": round(raw_score, 1),
                "weight": weight,
                "status": status,
                "findings_count": len(dim_findings),
                "passed_checks": passed_count,
                "failed_checks": failed_count,
                "unverified_checks": unverified_count,
                "not_applicable_checks": 0,
                "evidence_coverage": evidence_coverage,
                "confidence": confidence,
                "severity_distribution": severity_dist,
                "summary": f"{status} rating with {len(dim_findings)} identified finding(s). ({passed_count} passed, {failed_count} failed, {unverified_count} unverified).",
            }

        overall_score = round(weighted_sum, 1)

        # STRICT READINESS LEVEL ENFORCEMENT:
        # A critical security finding must trigger an appropriate HIGH_RISK classification regardless of overall score.
        critical_count = sum(1 for f in all_findings if f["severity"] == "critical")
        high_count = sum(1 for f in all_findings if f["severity"] == "high")

        if is_partial_upload:
            readiness_level = "PARTIAL_ASSESSMENT"
        elif critical_count > 0:
            readiness_level = "HIGH_RISK"
        elif overall_score >= 85 and high_count == 0:
            readiness_level = "PRODUCTION_READY"
        elif overall_score >= 70 and high_count <= 1:
            readiness_level = "NEAR_PRODUCTION"
        elif overall_score >= 50:
            readiness_level = "NEEDS_WORK"
        else:
            readiness_level = "HIGH_RISK"

        # Generate prioritized recommendations
        recommendations = cls._generate_recommendations(all_findings, dimension_scores)
        summary = cls._generate_summary(
            overall_score, readiness_level, detector_info, all_findings, is_partial_upload
        )

        return (
            overall_score,
            readiness_level,
            dimension_scores,
            all_findings,
            recommendations,
            summary,
        )

    @classmethod
    def _check_architecture(cls, rel_files: list[str], findings: list[dict[str, Any]]) -> None:
        has_src = any(
            f.startswith(("src/", "app/", "backend/", "pkg/", "internal/")) for f in rel_files
        )
        if not has_src and len(rel_files) > 15:
            findings.append(
                {
                    "dimension": "Architecture & Modularity",
                    "rule_id": "ARCH_FLAT_DIRECTORY",
                    "title": "Flat Unstructured Root Directory",
                    "description": "Codebase contains numerous root-level files without a clear `src/`, `app/`, or package modular hierarchy.",
                    "severity": "medium",
                    "file_path": ".",
                    "line_number": None,
                    "evidence_snippet": "",
                    "remediation_advice": "Organize business logic, models, services, and presentation into designated sub-packages.",
                }
            )

    @classmethod
    def _check_api_design(
        cls, rel_files: list[str], files: list[Path], findings: list[dict[str, Any]]
    ) -> None:
        has_api = any(
            any(k in f.lower() for k in ("routes", "api", "controllers", "endpoints"))
            for f in rel_files
        )
        if not has_api:
            return

        has_schema = any(
            any(k in f.lower() for k in ("schemas", "dto", "contracts", "types", "models"))
            for f in rel_files
        )
        if not has_schema:
            findings.append(
                {
                    "dimension": "API Design & Contracts",
                    "rule_id": "API_MISSING_CONTRACTS",
                    "title": "Absence of Typed API Contracts or Schemas",
                    "description": "API endpoints detected without corresponding Pydantic, Zod, Protobuf, or TypeScript DTO schemas.",
                    "severity": "medium",
                    "file_path": "api/",
                    "line_number": None,
                    "evidence_snippet": "",
                    "remediation_advice": "Define explicit request/response schemas using Pydantic, Zod, or OpenAPI specs.",
                }
            )

    @classmethod
    def _check_database(
        cls, rel_files: list[str], files: list[Path], findings: list[dict[str, Any]]
    ) -> None:
        has_db_models = any(
            any(k in f.lower() for k in ("models", "entities", "schema.sql", "migrations"))
            for f in rel_files
        )
        if not has_db_models:
            return

        has_migrations = any(
            any(k in f.lower() for k in ("alembic", "migrations", "flyway", "prisma/migrations"))
            for f in rel_files
        )
        if not has_migrations:
            findings.append(
                {
                    "dimension": "Database & Data Modeling",
                    "rule_id": "DB_NO_MIGRATIONS",
                    "title": "Missing Database Migration Framework",
                    "description": "Database models exist but no schema migration tool (Alembic, Flyway, Prisma) was detected.",
                    "severity": "high",
                    "file_path": "models/",
                    "line_number": None,
                    "evidence_snippet": "",
                    "remediation_advice": "Initialize Alembic, Flyway, or Liquibase to manage deterministic schema evolutions.",
                }
            )

    @classmethod
    def _check_reliability(cls, files: list[Path], findings: list[dict[str, Any]]) -> None:
        for f in files:
            ext = f.suffix.lower()
            if ext not in (".py", ".ts", ".js", ".go", ".java"):
                continue
            try:
                content = f.read_text(encoding="utf-8", errors="ignore")
                if (
                    "requests.get(" in content or "requests.post(" in content
                ) and "timeout=" not in content:
                    findings.append(
                        {
                            "dimension": "Reliability & Fault Tolerance",
                            "rule_id": "REL_UNBOUNDED_HTTP_TIMEOUT",
                            "title": "Unbounded HTTP Request Timeout",
                            "description": f"File `{f.name}` invokes `requests` without an explicit `timeout` parameter.",
                            "severity": "medium",
                            "file_path": str(f.name),
                            "line_number": None,
                            "evidence_snippet": "requests.get(...) without timeout",
                            "remediation_advice": "Always supply an explicit timeout (e.g., `timeout=10.0`) to avoid thread exhaustion.",
                        }
                    )
                    break
            except Exception:
                pass

    @classmethod
    def _check_observability(
        cls, rel_files: list[str], files: list[Path], findings: list[dict[str, Any]]
    ) -> None:
        has_health = False
        has_logging = False

        for f in files:
            ext = f.suffix.lower()
            if ext in (".py", ".ts", ".js", ".go", ".java"):
                try:
                    content = f.read_text(encoding="utf-8", errors="ignore")
                    if "/health" in content or "healthz" in content or "status" in content:
                        has_health = True
                    if any(
                        k in content
                        for k in ("logging.getLogger", "winston", "zap.New", "slf4j", "pino")
                    ):
                        has_logging = True
                except Exception:
                    pass

        if not has_health and len(rel_files) > 2:
            findings.append(
                {
                    "dimension": "Observability & Telemetry",
                    "rule_id": "OBS_MISSING_HEALTHCHECK",
                    "title": "No Health Check Endpoint Found",
                    "description": "No `/health` or readiness endpoint detected for container orchestrator probes.",
                    "severity": "medium",
                    "file_path": "api/",
                    "line_number": None,
                    "evidence_snippet": "",
                    "remediation_advice": "Expose standard `/health/live` and `/health/ready` endpoints.",
                }
            )

        if not has_logging and len(rel_files) > 3:
            findings.append(
                {
                    "dimension": "Observability & Telemetry",
                    "rule_id": "OBS_NO_STRUCTURED_LOGGING",
                    "title": "Absence of Structured Logging",
                    "description": "Codebase relies on stdout/print without structured logging or correlation IDs.",
                    "severity": "low",
                    "file_path": ".",
                    "line_number": None,
                    "evidence_snippet": "",
                    "remediation_advice": "Configure standard structured JSON logging with request ID tracking.",
                }
            )

    @classmethod
    def _check_testing(cls, rel_files: list[str], findings: list[dict[str, Any]]) -> None:
        has_tests = any(
            any(k in f.lower() for k in ("test", "spec", "tests/"))
            and any(f.endswith(ext) for ext in (".py", ".ts", ".js", ".go", ".java", ".rs"))
            for f in rel_files
        )
        if not has_tests and len(rel_files) > 1:
            findings.append(
                {
                    "dimension": "Testing & Quality Assurance",
                    "rule_id": "QA_NO_TEST_SUITE",
                    "title": "No Automated Test Suite Present",
                    "description": "Repository contains zero automated unit or integration test files.",
                    "severity": "critical",
                    "file_path": "tests/",
                    "line_number": None,
                    "evidence_snippet": "",
                    "remediation_advice": "Establish automated test suites with pytest or vitest covering critical business logic.",
                }
            )

    @classmethod
    def _check_configuration(cls, rel_files: list[str], findings: list[dict[str, Any]]) -> None:
        has_env_example = any(
            f in (".env.example", ".env.template", "config.example.yaml") for f in rel_files
        )
        if not has_env_example and len(rel_files) > 2:
            findings.append(
                {
                    "dimension": "Configuration & Environment Hygiene",
                    "rule_id": "CONF_MISSING_ENV_EXAMPLE",
                    "title": "Missing `.env.example` Configuration Template",
                    "description": "No `.env.example` documentation found for required environment variables.",
                    "severity": "low",
                    "file_path": ".env.example",
                    "line_number": None,
                    "evidence_snippet": "",
                    "remediation_advice": "Provide `.env.example` documenting all configuration keys and sensible defaults.",
                }
            )

    @classmethod
    def _check_deployment(
        cls, rel_files: list[str], files: list[Path], findings: list[dict[str, Any]]
    ) -> None:
        has_docker = any("dockerfile" in f.lower() for f in rel_files)
        if not has_docker and len(rel_files) > 2:
            findings.append(
                {
                    "dimension": "Deployment & Infrastructure",
                    "rule_id": "DEP_NO_CONTAINERFILE",
                    "title": "No Containerization Manifest Found",
                    "description": "Repository lacks a `Dockerfile` for reproducible container deployment.",
                    "severity": "medium",
                    "file_path": "Dockerfile",
                    "line_number": None,
                    "evidence_snippet": "",
                    "remediation_advice": "Create an optimized multi-stage Dockerfile running under a non-root user.",
                }
            )

    @classmethod
    def _check_documentation(
        cls, rel_files: list[str], file_names: set[str], findings: list[dict[str, Any]]
    ) -> None:
        if "readme.md" not in file_names and "readme" not in file_names and len(rel_files) > 1:
            findings.append(
                {
                    "dimension": "Documentation & Maintainability",
                    "rule_id": "DOC_MISSING_README",
                    "title": "Missing Repository README",
                    "description": "Repository does not contain a `README.md` explaining project setup, architecture, or usage.",
                    "severity": "medium",
                    "file_path": "README.md",
                    "line_number": None,
                    "evidence_snippet": "",
                    "remediation_advice": "Add a comprehensive `README.md` with prerequisite setup and run instructions.",
                }
            )

    @classmethod
    def _generate_recommendations(
        cls, findings: list[dict[str, Any]], dimension_scores: dict[str, Any]
    ) -> list[dict[str, Any]]:
        severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
        sorted_findings = sorted(findings, key=lambda f: severity_order.get(f["severity"], 5))

        recommendations = []
        seen_rules = set()

        for f in sorted_findings:
            if f["rule_id"] in seen_rules:
                continue
            seen_rules.add(f["rule_id"])
            recommendations.append(
                {
                    "priority": f["severity"].upper(),
                    "dimension": f["dimension"],
                    "title": f["title"],
                    "action": f["remediation_advice"],
                    "target_file": f["file_path"],
                }
            )

        return recommendations[:12]

    @classmethod
    def _generate_summary(
        cls,
        score: float,
        level: str,
        detector_info: dict[str, Any],
        findings: list[dict[str, Any]],
        is_partial: bool,
    ) -> str:
        langs = [l["language"] for l in detector_info.get("languages", [])[:3]]
        langs_str = ", ".join(langs) if langs else "heterogeneous code"
        fw_str = ", ".join(detector_info.get("frameworks", [])) or "standard libraries"

        crit = sum(1 for f in findings if f["severity"] == "critical")
        high = sum(1 for f in findings if f["severity"] == "high")

        prefix = "Partial codebase evaluation (selected files submitted). " if is_partial else ""

        return (
            f"{prefix}Codebase assessment evaluated {detector_info.get('total_files', 0)} files ({langs_str}) "
            f"built with {fw_str}. Overall production readiness score is {score}/100 ({level.replace('_', ' ')}). "
            f"Analysis identified {len(findings)} total findings ({crit} critical, {high} high severity). "
            f"Prioritize remediation of identified security vulnerabilities and test coverage before release delivery."
        )

    @classmethod
    def generate_sarif_report(
        cls, assessment_dict: dict[str, Any], findings: list[dict[str, Any]]
    ) -> dict[str, Any]:
        """Generates standard OASIS SARIF v2.1.0 output for CI/CD integrations."""
        level_map = {
            "critical": "error",
            "high": "error",
            "medium": "warning",
            "low": "note",
            "info": "none",
        }

        sarif_rules = {}
        sarif_results = []

        for f in findings:
            rule_id = f.get("rule_id", "GENERIC_FINDING")
            if rule_id not in sarif_rules:
                sarif_rules[rule_id] = {
                    "id": rule_id,
                    "name": f.get("title", rule_id),
                    "shortDescription": {"text": f.get("title", "")},
                    "fullDescription": {"text": f.get("description", "")},
                    "help": {"text": f.get("remediation_advice", "")},
                    "properties": {
                        "category": f.get("dimension", "General"),
                        "severity": f.get("severity", "medium"),
                    },
                }

            file_path = f.get("file_path") or "repository"
            line_no = f.get("line_number") or 1

            sarif_results.append(
                {
                    "ruleId": rule_id,
                    "level": level_map.get(f.get("severity", "medium"), "warning"),
                    "message": {"text": f.get("description", f.get("title", ""))},
                    "locations": [
                        {
                            "physicalLocation": {
                                "artifactLocation": {"uri": file_path},
                                "region": {"startLine": max(1, line_no)},
                            }
                        }
                    ],
                }
            )

        return {
            "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
            "version": "2.1.0",
            "runs": [
                {
                    "tool": {
                        "driver": {
                            "name": "AIOps Sentinel Codebase Readiness Engine",
                            "semanticVersion": "2.0.0",
                            "informationUri": "https://github.com/aiops-sentinel",
                            "rules": list(sarif_rules.values()),
                        }
                    },
                    "results": sarif_results,
                }
            ],
        }

    @classmethod
    def generate_html_report(
        cls, assessment_dict: dict[str, Any], findings: list[dict[str, Any]]
    ) -> str:
        """Generates a secure standalone, CSS-styled HTML report with strict HTML escaping and CSP."""
        proj = html.escape(str(assessment_dict.get("project_name", "Codebase Assessment")))
        score = html.escape(str(assessment_dict.get("overall_score", 0.0)))
        level = html.escape(str(assessment_dict.get("readiness_level", "NEEDS_WORK")))
        summary = html.escape(str(assessment_dict.get("summary", "")))
        dim_scores = assessment_dict.get("dimension_scores_json", {})

        allowed_severities = {"critical", "high", "medium", "low", "info"}

        dim_rows = "".join(
            f"<tr><td><strong>{html.escape(str(dim))}</strong></td>"
            f"<td>{html.escape(str(data.get('score', 0)))}/100</td>"
            f"<td>{html.escape(str(data.get('status', '')))}</td>"
            f"<td>{html.escape(str(data.get('findings_count', 0)))}</td>"
            f"<td>{html.escape(str(data.get('passed_checks', 0)))} passed / {html.escape(str(data.get('unverified_checks', 0)))} unverified</td></tr>"
            for dim, data in dim_scores.items()
        )

        findings_rows = []
        for f in findings:
            raw_sev = str(f.get("severity", "low")).lower()
            sev_class = raw_sev if raw_sev in allowed_severities else "low"
            sev_text = html.escape(raw_sev.upper())
            title = html.escape(str(f.get("title", "")))
            desc = html.escape(str(f.get("description", "")))
            file_path = html.escape(str(f.get("file_path", "")))
            line_no = f.get("line_number")
            line_str = html.escape(str(line_no if line_no is not None else 1))
            advice = html.escape(str(f.get("remediation_advice", "")))

            findings_rows.append(
                f"<tr><td><span class='badge {sev_class}'>{sev_text}</span></td>"
                f"<td><strong>{title}</strong><br><small>{desc}</small></td>"
                f"<td><code>{file_path}:{line_str}</code></td>"
                f"<td>{advice}</td></tr>"
            )
        findings_rows_html = "".join(findings_rows)

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src data:;">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<title>AIOps Sentinel Readiness Report - {proj}</title>
<style>
body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; padding: 2rem; max-width: 1200px; margin: auto; }}
h1, h2, h3 {{ color: #1e293b; }}
.score-box {{ background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem; }}
.badge {{ padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; }}
.critical {{ background: #fee2e2; color: #991b1b; }}
.high {{ background: #ffedd5; color: #9a3412; }}
.medium {{ background: #fef9c3; color: #854d0e; }}
.low {{ background: #f1f5f9; color: #475569; }}
.info {{ background: #e0f2fe; color: #0369a1; }}
table {{ width: 100%; border-collapse: collapse; background: white; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 2rem; }}
th, td {{ padding: 10px 14px; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 13px; }}
th {{ background: #f8fafc; font-weight: 600; color: #475569; }}
code {{ font-family: ui-monospace, Menlo, Consolas, monospace; background: #f1f5f9; padding: 2px 4px; border-radius: 4px; }}
</style>
</head>
<body>
<h1>AIOps Sentinel — Production Readiness Report</h1>
<div class="score-box">
<h2>{proj}</h2>
<p>Production Score: <strong>{score} / 100</strong> &nbsp;|&nbsp; Readiness Level: <strong>{level}</strong></p>
<p>{summary}</p>
</div>

<h3>10-Dimension Scorecard</h3>
<table>
<thead><tr><th>Dimension</th><th>Score</th><th>Rating</th><th>Findings</th><th>Checks Summary</th></tr></thead>
<tbody>{dim_rows}</tbody>
</table>

<h3>Identified Findings & Code Evidence</h3>
<table>
<thead><tr><th>Severity</th><th>Finding & Rule</th><th>Target File</th><th>Recommended Remediation</th></tr></thead>
<tbody>{findings_rows_html}</tbody>
</table>
</body>
</html>"""
