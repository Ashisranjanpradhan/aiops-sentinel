import io
import zipfile
from pathlib import Path

import pytest

from app.core.errors import ValidationError
from app.services.assessment.ast_analyzer import MultiLanguageCodeAnalyzer
from app.services.assessment.detector import CodebaseDetector
from app.services.assessment.evaluator import DimensionEvaluator
from app.services.assessment.secrets_scanner import SecretsScanner
from app.services.assessment.workspace import WorkspaceManager


def test_secrets_scanner_detects_credentials(tmp_path: Path):
    vuln_file = tmp_path / "app.py"
    vuln_file.write_text(
        'OPENAI_KEY = "sk-abcdef1234567890abcdef1234567890"\n'  # gitleaks:allow
        'AWS_KEY = "AKIA1234567890ABCDEF"\n'  # gitleaks:allow
        'DB_URL = "postgresql://admin:superSecretPass123@db.prod.internal:5432/main"\n'  # gitleaks:allow
    )
    findings = SecretsScanner.scan_files(tmp_path, [vuln_file])
    assert len(findings) >= 3
    rule_ids = {f["rule_id"] for f in findings}
    assert "SEC_OPENAI_KEY" in rule_ids
    assert "SEC_AWS_ACCESS_KEY" in rule_ids
    assert "SEC_DB_URI_PASSWORD" in rule_ids
    # Ensure evidence is redacted
    for f in findings:
        assert "superSecretPass123" not in (f["evidence_snippet"] or "")
        assert "sk-abcdef1234567890" not in (f["evidence_snippet"] or "")


def test_ast_analyzer_detects_dangerous_patterns(tmp_path: Path):
    vuln_file = tmp_path / "danger.py"
    vuln_file.write_text(
        "import os, pickle, subprocess\n"
        "eval('2 + 2')\n"
        "os.system('rm -rf /')\n"
        "subprocess.Popen(['ls'], shell=True)\n"
        "pickle.loads(b'data')\n"
        "def query(db, val):\n"
        "    db.execute(f'SELECT * FROM users WHERE id = {val}')\n"
        "try:\n"
        "    risky_operation()\n"
        "except Exception:\n"
        "    pass\n"
    )
    findings = MultiLanguageCodeAnalyzer.analyze_files(tmp_path, [vuln_file])
    rule_ids = {f["rule_id"] for f in findings}
    assert "SEC_DYNAMIC_CODE_EXEC" in rule_ids
    assert "SEC_OS_SYSTEM_COMMAND" in rule_ids
    assert "SEC_SUBPROCESS_SHELL_TRUE" in rule_ids
    assert "SEC_UNSAFE_DESERIALIZATION" in rule_ids
    assert "DB_SQL_CONCATENATION" in rule_ids
    assert "REL_SWALLOWED_EXCEPTION" in rule_ids


def test_multi_language_analyzers_js_java_go_rust(tmp_path: Path):
    js_file = tmp_path / "index.ts"
    js_file.write_text(
        "eval('console.log(1)');\n"
        "element.innerHTML = userInput;\n"
        "const https = require('https');\n"
        "https.request({ rejectUnauthorized: false });\n"
    )

    java_file = tmp_path / "App.java"
    java_file.write_text(
        "public class App {\n"
        "    public static void main(String[] args) throws Exception {\n"
        "        Runtime.getRuntime().exec(args[0]);\n"
        '        stmt.executeQuery("SELECT * FROM accounts WHERE id = " + args[0]);\n'
        "    }\n"
        "}\n"
    )

    go_file = tmp_path / "main.go"
    go_file.write_text(
        "package main\n"
        'import ("os/exec"; "fmt")\n'
        "func main() {\n"
        '    exec.Command("sh", "-c", "ls")\n'
        "    db.Query(fmt.Sprintf(\"SELECT * FROM items WHERE name = '%s'\", name))\n"
        "}\n"
    )

    rust_file = tmp_path / "lib.rs"
    rust_file.write_text(
        "pub fn risky() {\n"
        "    unsafe { let p = 0 as *const i32; }\n"
        "    let item = option.unwrap();\n"
        "}\n"
    )

    findings = MultiLanguageCodeAnalyzer.analyze_files(
        tmp_path, [js_file, java_file, go_file, rust_file]
    )
    rule_ids = {f["rule_id"] for f in findings}

    assert "SEC_JS_EVAL" in rule_ids
    assert "SEC_XSS_INNER_HTML" in rule_ids
    assert "SEC_NODE_REJECT_UNAUTHORIZED" in rule_ids
    assert "SEC_JAVA_COMMAND_EXEC" in rule_ids
    assert "DB_JAVA_SQL_INJECTION" in rule_ids
    assert "SEC_GO_EXEC_COMMAND" in rule_ids
    assert "DB_GO_SQL_INJECTION" in rule_ids
    assert "SEC_RUST_UNSAFE_BLOCK" in rule_ids
    assert "REL_RUST_UNWRAP_PANIC" in rule_ids


def test_language_capability_matrix():
    langs = [
        {"language": "Python", "files": 5},
        {"language": "TypeScript", "files": 10},
        {"language": "Go", "files": 2},
        {"language": "Kotlin", "files": 1},
    ]
    matrix = MultiLanguageCodeAnalyzer.get_capability_matrix(langs)
    assert len(matrix) == 4
    py_entry = next(m for m in matrix if m["language"] == "Python")
    assert py_entry["status"] == "SUPPORTED"
    assert py_entry["analysis_tier"] == "Full AST Analysis"

    kt_entry = next(m for m in matrix if m["language"] == "Kotlin")
    assert kt_entry["status"] == "PARTIAL"


def test_dimension_evaluator_scoring(tmp_path: Path):
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "main.py").write_text("print('hello')")
    (tmp_path / "tests").mkdir()
    (tmp_path / "tests" / "test_main.py").write_text("def test_ok(): assert True")
    (tmp_path / "README.md").write_text("# Project Docs")
    (tmp_path / ".env.example").write_text("PORT=8000")
    (tmp_path / "Dockerfile").write_text("FROM python:3.11-slim\nUSER appuser\nCMD python main.py")

    files = [f for f in tmp_path.rglob("*") if f.is_file()]
    detector_info = CodebaseDetector.scan_workspace(tmp_path)
    score, level, dim_scores, _all_findings, _recs, summary = DimensionEvaluator.evaluate(
        tmp_path, files, detector_info, []
    )

    assert score >= 70.0
    assert len(dim_scores) == 10
    assert "Architecture & Modularity" in dim_scores
    assert dim_scores["Testing & Quality Assurance"]["passed_checks"] > 0
    assert level in ("PRODUCTION_READY", "NEAR_PRODUCTION")
    assert len(summary) > 0


def test_critical_finding_forces_high_risk(tmp_path: Path):
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "main.py").write_text("eval('1 + 1')")
    (tmp_path / "tests").mkdir()
    (tmp_path / "tests" / "test_main.py").write_text("def test_ok(): assert True")
    (tmp_path / "README.md").write_text("# Project Docs")

    files = [f for f in tmp_path.rglob("*") if f.is_file()]
    detector_info = CodebaseDetector.scan_workspace(tmp_path)

    critical_finding = [
        {
            "dimension": "Security & Secrets Hygiene",
            "rule_id": "SEC_DYNAMIC_CODE_EXEC",
            "title": "Dangerous eval",
            "description": "Arbitrary code execution",
            "severity": "critical",
            "file_path": "src/main.py",
            "line_number": 1,
            "evidence_snippet": "eval('1 + 1')",
            "remediation_advice": "Do not use eval",
        }
    ]

    _score, level, _dim_scores, _all_findings, _recs, _summary = DimensionEvaluator.evaluate(
        tmp_path, files, detector_info, critical_finding
    )
    # Even if score might be above 50, critical finding must force HIGH_RISK
    assert level == "HIGH_RISK"


def test_sarif_and_html_generation(tmp_path: Path):
    assessment_dict = {
        "project_name": "Test SARIF Project",
        "overall_score": 85.0,
        "readiness_level": "NEAR_PRODUCTION",
        "dimension_scores_json": {
            "Security & Secrets Hygiene": {
                "score": 80.0,
                "status": "EXCELLENT",
                "findings_count": 1,
            }
        },
        "summary": "Sample summary text",
    }
    findings = [
        {
            "dimension": "Security & Secrets Hygiene",
            "rule_id": "SEC_AWS_ACCESS_KEY",
            "title": "Hardcoded Key",
            "description": "Exposed credential",
            "severity": "critical",
            "file_path": "config.py",
            "line_number": 10,
            "remediation_advice": "Use env var",
        }
    ]
    sarif = DimensionEvaluator.generate_sarif_report(assessment_dict, findings)
    assert sarif["version"] == "2.1.0"
    assert len(sarif["runs"][0]["results"]) == 1
    assert sarif["runs"][0]["results"][0]["ruleId"] == "SEC_AWS_ACCESS_KEY"

    html_out = DimensionEvaluator.generate_html_report(assessment_dict, findings)
    assert "Test SARIF Project" in html_out
    assert "Hardcoded Key" in html_out


def test_html_report_xss_sanitization():
    """Verify Stored XSS vectors (script tags, event handlers, payload attributes) are strictly escaped."""
    malicious_assessment = {
        "project_name": "<script>alert('pwned-project')</script>",
        "overall_score": 42.0,
        "readiness_level": "<b onmouseover=alert(1)>NEEDS_WORK</b>",
        "summary": "Untrusted summary with <img src='x' onerror='alert(document.cookie)'> payload",
        "dimension_scores_json": {
            "<script>evil_dim()</script>": {
                "score": 10,
                "status": "FAIL",
                "findings_count": 1,
                "passed_checks": 0,
                "unverified_checks": 0,
            }
        },
    }
    malicious_findings = [
        {
            "dimension": "Security",
            "rule_id": "XSS_RULE",
            "title": "Title with <svg/onload=alert('title-xss')>",
            "description": "Description with <iframe src='javascript:alert(1)'></iframe>",
            "severity": "critical",
            "file_path": "src/<img src=x onerror=alert(2)>/app.py",
            "line_number": 99,
            "remediation_advice": "Advice with <a href='javascript:alert(3)'>Click here</a>",
        }
    ]

    html_out = DimensionEvaluator.generate_html_report(malicious_assessment, malicious_findings)

    # Assert no unescaped tags or event handlers exist as executable HTML
    assert "<script>" not in html_out
    assert "</script>" not in html_out
    assert "<img" not in html_out
    assert "<svg" not in html_out
    assert "<iframe" not in html_out
    assert "<b " not in html_out
    assert "<a href" not in html_out

    # Assert properly escaped representations exist
    assert "&lt;script&gt;alert(&#x27;pwned-project&#x27;)&lt;/script&gt;" in html_out
    assert "&lt;b onmouseover=alert(1)&gt;NEEDS_WORK&lt;/b&gt;" in html_out
    assert "&lt;svg/onload=alert(&#x27;title-xss&#x27;)&gt;" in html_out
    assert "&lt;img src=&#x27;x&#x27;" in html_out
    assert "Content-Security-Policy" in html_out


@pytest.mark.asyncio
async def test_workspace_zip_slip_rejection(tmp_path: Path):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("../../etc/passwd", "root:x:0:0:")
    buf.seek(0)

    from fastapi import UploadFile

    upload = UploadFile(filename="malicious.zip", file=buf)
    dest = tmp_path / "extracted"
    dest.mkdir()

    with pytest.raises(ValidationError, match="Zip-slip path traversal"):
        await WorkspaceManager.extract_zip_safely(upload, dest)


@pytest.mark.asyncio
async def test_workspace_encrypted_zip_rejection(tmp_path: Path):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("secret.txt", b"confidential data")
    raw = bytearray(buf.getvalue())
    # Set general purpose bit flag 0x01 (encryption bit) in local header and central directory
    idx = raw.find(b"PK\x03\x04")
    if idx != -1:
        raw[idx + 6] |= 0x01
    cd_idx = raw.find(b"PK\x01\x02")
    if cd_idx != -1:
        raw[cd_idx + 8] |= 0x01

    from fastapi import UploadFile

    upload = UploadFile(filename="encrypted.zip", file=io.BytesIO(raw))
    dest = tmp_path / "extracted"
    dest.mkdir()

    with pytest.raises(ValidationError, match="Encrypted member"):
        await WorkspaceManager.extract_zip_safely(upload, dest)


@pytest.mark.asyncio
async def test_workspace_symlink_rejection(tmp_path: Path):
    """Verify archives containing symbolic links are rejected to prevent arbitrary host file disclosure."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zinfo = zipfile.ZipInfo("symlink_target.txt")
        # Set Unix symlink mode (0o120777 << 16)
        zinfo.external_attr = 0o120777 << 16
        zf.writestr(zinfo, "/etc/shadow")
    buf.seek(0)

    from fastapi import UploadFile

    upload = UploadFile(filename="symlink.zip", file=buf)
    dest = tmp_path / "extracted"
    dest.mkdir()

    with pytest.raises(ValidationError, match="Symlink member"):
        await WorkspaceManager.extract_zip_safely(upload, dest)


@pytest.mark.asyncio
async def test_workspace_zip_bomb_ratio_rejection(tmp_path: Path):
    """Verify high-compression zip bombs exceeding 100:1 ratio are rejected."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        # 1.5MB of zeroes will compress to < 2KB (ratio > 700:1)
        zf.writestr("huge_zeroes.dat", b"\x00" * (1500 * 1024))
    buf.seek(0)

    from fastapi import UploadFile

    upload = UploadFile(filename="zipbomb.zip", file=buf)
    dest = tmp_path / "extracted"
    dest.mkdir()

    with pytest.raises(ValidationError, match="potential zip bomb"):
        await WorkspaceManager.extract_zip_safely(upload, dest)
