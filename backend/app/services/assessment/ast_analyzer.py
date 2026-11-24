import ast
import re
from pathlib import Path
from typing import Any


class PythonSecurityVisitor(ast.NodeVisitor):
    """AST visitor for identifying security and reliability antipatterns in Python code."""

    def __init__(self, file_path: str, lines: list[str]) -> None:
        self.file_path = file_path
        self.lines = lines
        self.findings: list[dict[str, Any]] = []

    def _get_line_snippet(self, lineno: int) -> str:
        if 1 <= lineno <= len(self.lines):
            return self.lines[lineno - 1].strip()
        return ""

    def visit_Call(self, node: ast.Call) -> None:
        func_name = ""
        if isinstance(node.func, ast.Name):
            func_name = node.func.id
        elif isinstance(node.func, ast.Attribute):
            func_name = node.func.attr

        # 1. eval / exec
        if func_name in ("eval", "exec"):
            self.findings.append(
                {
                    "dimension": "Security & Secrets Hygiene",
                    "rule_id": "SEC_DYNAMIC_CODE_EXEC",
                    "title": f"Dangerous Dynamic Code Execution (`{func_name}`)",
                    "description": f"Use of `{func_name}()` enables arbitrary code execution vulnerabilities.",
                    "severity": "critical",
                    "file_path": self.file_path,
                    "line_number": node.lineno,
                    "evidence_snippet": self._get_line_snippet(node.lineno),
                    "remediation_advice": "Replace dynamic code evaluation with static parsers, schemas, or safe lookup tables.",
                }
            )

        # 2. os.system or subprocess without shell=False
        if (
            func_name == "system"
            and isinstance(node.func, ast.Attribute)
            and isinstance(node.func.value, ast.Name)
            and node.func.value.id == "os"
        ):
            self.findings.append(
                {
                    "dimension": "Security & Secrets Hygiene",
                    "rule_id": "SEC_OS_SYSTEM_COMMAND",
                    "title": "Unsafe Shell Command Execution (`os.system`)",
                    "description": "Calling `os.system()` runs commands via shell without sanitization.",
                    "severity": "high",
                    "file_path": self.file_path,
                    "line_number": node.lineno,
                    "evidence_snippet": self._get_line_snippet(node.lineno),
                    "remediation_advice": "Use `subprocess.run([...], shell=False, check=True)` with validated arguments.",
                }
            )

        # 3. subprocess with shell=True
        if func_name in ("Popen", "run", "call", "check_call", "check_output"):
            for kw in node.keywords:
                if kw.arg == "shell" and isinstance(kw.value, ast.Constant) and kw.value.value is True:
                    self.findings.append(
                        {
                            "dimension": "Security & Secrets Hygiene",
                            "rule_id": "SEC_SUBPROCESS_SHELL_TRUE",
                            "title": "Subprocess Invocation with `shell=True`",
                            "description": "Spawning subprocesses with `shell=True` exposes command injection risks.",
                            "severity": "high",
                            "file_path": self.file_path,
                            "line_number": node.lineno,
                            "evidence_snippet": self._get_line_snippet(node.lineno),
                            "remediation_advice": "Pass command arguments as an array and set `shell=False`.",
                        }
                    )

        # 4. pickle.loads (unsafe deserialization)
        if (
            func_name in ("loads", "load")
            and isinstance(node.func, ast.Attribute)
            and isinstance(node.func.value, ast.Name)
            and node.func.value.id == "pickle"
        ):
            self.findings.append(
                {
                    "dimension": "Security & Secrets Hygiene",
                    "rule_id": "SEC_UNSAFE_DESERIALIZATION",
                    "title": "Unsafe Deserialization (`pickle`)",
                    "description": "Deserializing untrusted pickle streams can result in remote code execution.",
                    "severity": "high",
                    "file_path": self.file_path,
                    "line_number": node.lineno,
                    "evidence_snippet": self._get_line_snippet(node.lineno),
                    "remediation_advice": "Use safe serialization formats like JSON, Protobuf, or Pydantic models.",
                }
            )

        # 5. SQL concatenation in execute()
        if func_name in ("execute", "executemany") and node.args:
            first_arg = node.args[0]
            if isinstance(first_arg, (ast.JoinedStr, ast.BinOp)):
                self.findings.append(
                    {
                        "dimension": "Database & Data Modeling",
                        "rule_id": "DB_SQL_CONCATENATION",
                        "title": "Possible SQL Injection via String Interpolation",
                        "description": "Direct string interpolation in database execute() call risks SQL injection.",
                        "severity": "critical",
                        "file_path": self.file_path,
                        "line_number": node.lineno,
                        "evidence_snippet": self._get_line_snippet(node.lineno),
                        "remediation_advice": "Use parameterized queries, SQLAlchemy ORM, or bind variables.",
                    }
                )

        self.generic_visit(node)

    def visit_ExceptHandler(self, node: ast.ExceptHandler) -> None:
        # Check for empty or pass-only exception handling (swallowing errors)
        if len(node.body) == 1 and isinstance(node.body[0], ast.Pass):
            self.findings.append(
                {
                    "dimension": "Reliability & Fault Tolerance",
                    "rule_id": "REL_SWALLOWED_EXCEPTION",
                    "title": "Swallowed Exception with Silent Pass",
                    "description": "Empty except block with `pass` hides critical runtime errors and hinders debugging.",
                    "severity": "medium",
                    "file_path": self.file_path,
                    "line_number": node.lineno,
                    "evidence_snippet": self._get_line_snippet(node.lineno),
                    "remediation_advice": "Log the exception with context (`logger.exception(...)`) or re-raise appropriate error.",
                }
            )
        self.generic_visit(node)


class MultiLanguageCodeAnalyzer:
    """
    Performs structural and pattern analysis across Python, JavaScript, TypeScript,
    Java, Go, and Rust files.
    """

    SUPPORTED_CAPABILITIES = {
        "Python": {
            "tier": "Full AST Analysis",
            "status": "SUPPORTED",
            "analyzed_categories": [
                "Syntax Validity",
                "Dynamic Code Execution",
                "Command Injection",
                "Unsafe Deserialization",
                "SQL Injection",
                "Swallowed Exceptions",
            ],
        },
        "TypeScript": {
            "tier": "Structural & Pattern Analysis",
            "status": "SUPPORTED",
            "analyzed_categories": [
                "XSS via innerHTML",
                "Dynamic eval()",
                "Child Process Shell Execution",
                "Insecure TLS Configurations",
                "Client-side Token Storage",
            ],
        },
        "JavaScript": {
            "tier": "Structural & Pattern Analysis",
            "status": "SUPPORTED",
            "analyzed_categories": [
                "XSS via innerHTML",
                "Dynamic eval()",
                "Child Process Shell Execution",
                "Insecure TLS Configurations",
                "Client-side Token Storage",
            ],
        },
        "Java": {
            "tier": "Structural & Pattern Analysis",
            "status": "SUPPORTED",
            "analyzed_categories": [
                "Runtime Shell Execution",
                "Unsafe Deserialization",
                "SQL String Concatenation",
                "Swallowed Catch Blocks",
                "Insecure TrustManager",
            ],
        },
        "Go": {
            "tier": "Structural & Pattern Analysis",
            "status": "SUPPORTED",
            "analyzed_categories": [
                "Shell Command Execution",
                "Unsafe Memory Pointers",
                "Ignored Error Returns",
                "SQL Formatted Queries",
            ],
        },
        "Rust": {
            "tier": "Structural & Pattern Analysis",
            "status": "SUPPORTED",
            "analyzed_categories": [
                "Unsafe Blocks Audit",
                "Production Panics via unwrap()",
                "Shell Command Execution",
            ],
        },
    }

    @classmethod
    def get_capability_matrix(cls, languages_detected: list[dict[str, Any]]) -> list[dict[str, Any]]:
        matrix = []
        for l_item in languages_detected:
            name = l_item["language"]
            base_lang = name.split()[0]
            cap = cls.SUPPORTED_CAPABILITIES.get(base_lang) or cls.SUPPORTED_CAPABILITIES.get(name)

            if cap:
                matrix.append({
                    "language": name,
                    "analysis_tier": cap["tier"],
                    "status": cap["status"],
                    "categories": cap["analyzed_categories"],
                    "files_count": l_item.get("files", 0),
                })
            else:
                matrix.append({
                    "language": name,
                    "analysis_tier": "Pattern & Configuration Inspection",
                    "status": "PARTIAL",
                    "categories": ["Secret Scanning", "Configuration Hygiene"],
                    "files_count": l_item.get("files", 0),
                })
        return matrix

    @classmethod
    def analyze_files(cls, workspace_dir: Path, files: list[Path]) -> list[dict[str, Any]]:
        findings: list[dict[str, Any]] = []

        for f in files:
            ext = f.suffix.lower()
            rel_path = str(f.relative_to(workspace_dir))

            try:
                content = f.read_text(encoding="utf-8", errors="ignore")
                lines = content.splitlines()
            except (OSError, UnicodeDecodeError):
                continue

            if ext == ".py":
                cls._analyze_python(rel_path, content, lines, findings)
            elif ext in (".js", ".jsx", ".ts", ".tsx"):
                cls._analyze_js_ts(rel_path, lines, findings)
            elif ext == ".java":
                cls._analyze_java(rel_path, lines, findings)
            elif ext == ".go":
                cls._analyze_go(rel_path, lines, findings)
            elif ext == ".rs":
                cls._analyze_rust(rel_path, lines, findings)

        return findings

    @classmethod
    def _analyze_python(
        cls, rel_path: str, content: str, lines: list[str], findings: list[dict[str, Any]]
    ) -> None:
        try:
            tree = ast.parse(content, filename=rel_path)
            visitor = PythonSecurityVisitor(rel_path, lines)
            visitor.visit(tree)
            findings.extend(visitor.findings)
        except SyntaxError:
            findings.append(
                {
                    "dimension": "Testing & Quality Assurance",
                    "rule_id": "QA_PYTHON_SYNTAX_ERROR",
                    "title": "Python Syntax Error Detected",
                    "description": f"File `{rel_path}` fails to parse as valid Python.",
                    "severity": "high",
                    "file_path": rel_path,
                    "line_number": 1,
                    "evidence_snippet": "",
                    "remediation_advice": "Run `python -m py_compile` or `ruff check` to resolve syntax errors.",
                }
            )

    @classmethod
    def _analyze_js_ts(
        cls, rel_path: str, lines: list[str], findings: list[dict[str, Any]]
    ) -> None:
        for idx, line in enumerate(lines, start=1):
            stripped = line.strip()
            if stripped.startswith(("//", "/*", "*")):
                continue

            # XSS hazards
            if "dangerouslySetInnerHTML" in line or "innerHTML" in line:
                findings.append(
                    {
                        "dimension": "Security & Secrets Hygiene",
                        "rule_id": "SEC_XSS_INNER_HTML",
                        "title": "Cross-Site Scripting (XSS) Hazard via innerHTML",
                        "description": "Unsanitized HTML injection can allow stored or reflected XSS execution.",
                        "severity": "high",
                        "file_path": rel_path,
                        "line_number": idx,
                        "evidence_snippet": stripped[:200],
                        "remediation_advice": "Sanitize with DOMPurify or use standard React text interpolation.",
                    }
                )

            # eval
            if re.search(r"\beval\s*\(", line):
                findings.append(
                    {
                        "dimension": "Security & Secrets Hygiene",
                        "rule_id": "SEC_JS_EVAL",
                        "title": "Dangerous JavaScript `eval()` Call",
                        "description": "Dynamic script evaluation exposes the application to remote code injection.",
                        "severity": "critical",
                        "file_path": rel_path,
                        "line_number": idx,
                        "evidence_snippet": stripped[:200],
                        "remediation_advice": "Avoid `eval()`. Use `JSON.parse` or safe functional abstractions.",
                    }
                )

            # Child process execution
            if "child_process" in line or ("exec(" in line and ("require" in line or "import" in line)):
                findings.append(
                    {
                        "dimension": "Security & Secrets Hygiene",
                        "rule_id": "SEC_NODE_CHILD_PROCESS",
                        "title": "Node.js Child Process Execution",
                        "description": "Invoking shell child processes with user input risks command injection.",
                        "severity": "high",
                        "file_path": rel_path,
                        "line_number": idx,
                        "evidence_snippet": stripped[:200],
                        "remediation_advice": "Use `execFile` with arguments array or validate inputs strictly.",
                    }
                )

            # Insecure TLS rejection
            norm_line = line.lower().replace(" ", "").replace('"', '').replace("'", "")
            if "rejectunauthorized:false" in norm_line:
                findings.append(
                    {
                        "dimension": "Security & Secrets Hygiene",
                        "rule_id": "SEC_NODE_REJECT_UNAUTHORIZED",
                        "title": "Disabled TLS Certificate Validation",
                        "description": "Disabling TLS certificate verification enables man-in-the-middle attacks.",
                        "severity": "critical",
                        "file_path": rel_path,
                        "line_number": idx,
                        "evidence_snippet": stripped[:200],
                        "remediation_advice": "Enable strict TLS validation with trusted CA certificates.",
                    }
                )

            # Sensitive token storage in localStorage
            if "localStorage.setItem" in line and any(k in line.lower() for k in ("token", "jwt", "auth", "secret", "password")):
                findings.append(
                    {
                        "dimension": "Security & Secrets Hygiene",
                        "rule_id": "SEC_LOCALSTORAGE_JWT",
                        "title": "Insecure Token Storage in `localStorage`",
                        "description": "Storing authentication tokens in `localStorage` makes them accessible to XSS attacks.",
                        "severity": "medium",
                        "file_path": rel_path,
                        "line_number": idx,
                        "evidence_snippet": stripped[:200],
                        "remediation_advice": "Store session tokens in HTTP-only, secure, SameSite cookies.",
                    }
                )

    @classmethod
    def _analyze_java(
        cls, rel_path: str, lines: list[str], findings: list[dict[str, Any]]
    ) -> None:
        for idx, line in enumerate(lines, start=1):
            stripped = line.strip()
            if stripped.startswith(("//", "/*", "*")):
                continue

            # Runtime exec
            if "Runtime.getRuntime().exec(" in line or "ProcessBuilder(" in line:
                findings.append(
                    {
                        "dimension": "Security & Secrets Hygiene",
                        "rule_id": "SEC_JAVA_COMMAND_EXEC",
                        "title": "Operating System Command Execution (`Runtime.exec`)",
                        "description": "Executing OS commands in Java risks command injection vulnerabilities.",
                        "severity": "high",
                        "file_path": rel_path,
                        "line_number": idx,
                        "evidence_snippet": stripped[:200],
                        "remediation_advice": "Use typed Java APIs or strictly sanitize external process arguments.",
                    }
                )

            # Unsafe deserialization
            if "ObjectInputStream(" in line and "readObject(" in line:
                findings.append(
                    {
                        "dimension": "Security & Secrets Hygiene",
                        "rule_id": "SEC_JAVA_UNSAFE_DESERIALIZATION",
                        "title": "Unsafe Java Deserialization (`readObject`)",
                        "description": "Deserializing untrusted Java object streams can trigger remote code execution.",
                        "severity": "critical",
                        "file_path": rel_path,
                        "line_number": idx,
                        "evidence_snippet": stripped[:200],
                        "remediation_advice": "Use Jackson JSON, Protocol Buffers, or ObjectInputFilter validation.",
                    }
                )

            # SQL concatenation
            if "executeQuery(" in line and "+" in line and not stripped.startswith("//"):
                findings.append(
                    {
                        "dimension": "Database & Data Modeling",
                        "rule_id": "DB_JAVA_SQL_INJECTION",
                        "title": "Possible Java SQL Injection via String Concatenation",
                        "description": "Dynamic SQL query concatenation risks SQL injection vulnerabilities.",
                        "severity": "critical",
                        "file_path": rel_path,
                        "line_number": idx,
                        "evidence_snippet": stripped[:200],
                        "remediation_advice": "Use `PreparedStatement` with parameterized placeholders or JPA/Hibernate.",
                    }
                )

    @classmethod
    def _analyze_go(
        cls, rel_path: str, lines: list[str], findings: list[dict[str, Any]]
    ) -> None:
        for idx, line in enumerate(lines, start=1):
            stripped = line.strip()
            if stripped.startswith("//"):
                continue

            # Command execution
            if "exec.Command(" in line and any(sh in line for sh in ("sh", "bash", "-c")):
                findings.append(
                    {
                        "dimension": "Security & Secrets Hygiene",
                        "rule_id": "SEC_GO_EXEC_COMMAND",
                        "title": "Go Shell Command Execution (`exec.Command`)",
                        "description": "Invoking shell interpreters with arguments in Go risks command injection.",
                        "severity": "high",
                        "file_path": rel_path,
                        "line_number": idx,
                        "evidence_snippet": stripped[:200],
                        "remediation_advice": "Execute discrete binary executables directly without shell wrappers.",
                    }
                )

            # Unsafe pointer usage
            if "unsafe.Pointer(" in line:
                findings.append(
                    {
                        "dimension": "Reliability & Fault Tolerance",
                        "rule_id": "REL_GO_UNSAFE_POINTER",
                        "title": "Use of Go `unsafe.Pointer`",
                        "description": "Bypassing Go type safety with `unsafe.Pointer` can trigger memory corruption.",
                        "severity": "medium",
                        "file_path": rel_path,
                        "line_number": idx,
                        "evidence_snippet": stripped[:200],
                        "remediation_advice": "Use idiomatic Go type conversions and standard library interfaces.",
                    }
                )

            # SQL formatting
            if any(q in line for q in ("db.Query(", "db.QueryRow(", "db.Exec(")) and "fmt.Sprintf" in line:
                findings.append(
                    {
                        "dimension": "Database & Data Modeling",
                        "rule_id": "DB_GO_SQL_INJECTION",
                        "title": "Possible Go SQL Injection via `fmt.Sprintf`",
                        "description": "Formatting SQL queries using `fmt.Sprintf` risks SQL injection.",
                        "severity": "critical",
                        "file_path": rel_path,
                        "line_number": idx,
                        "evidence_snippet": stripped[:200],
                        "remediation_advice": "Pass query parameters as variadic arguments (`db.Query(query, arg1, arg2)`).",
                    }
                )

    @classmethod
    def _analyze_rust(
        cls, rel_path: str, lines: list[str], findings: list[dict[str, Any]]
    ) -> None:
        for idx, line in enumerate(lines, start=1):
            stripped = line.strip()
            if stripped.startswith("//"):
                continue

            # Unsafe block
            if stripped.startswith("unsafe {") or " unsafe {" in line:
                findings.append(
                    {
                        "dimension": "Security & Secrets Hygiene",
                        "rule_id": "SEC_RUST_UNSAFE_BLOCK",
                        "title": "Rust `unsafe` Block Detected",
                        "description": "Unsafe Rust blocks disable memory safety guarantees and require manual auditing.",
                        "severity": "medium",
                        "file_path": rel_path,
                        "line_number": idx,
                        "evidence_snippet": stripped[:200],
                        "remediation_advice": "Verify invariants or refactor to safe Rust abstractions.",
                    }
                )

            # Panic on unwrap in production
            if ".unwrap()" in line and not any(t in rel_path.lower() for t in ("test", "bench", "example")):
                findings.append(
                    {
                        "dimension": "Reliability & Fault Tolerance",
                        "rule_id": "REL_RUST_UNWRAP_PANIC",
                        "title": "Direct Rust `.unwrap()` in Production Code",
                        "description": "Calling `.unwrap()` can panic at runtime if an Error or None is encountered.",
                        "severity": "low",
                        "file_path": rel_path,
                        "line_number": idx,
                        "evidence_snippet": stripped[:200],
                        "remediation_advice": "Use the `?` error propagation operator or `match` with graceful fallbacks.",
                    }
                )


# Alias for backward compatibility
ASTCodeAnalyzer = MultiLanguageCodeAnalyzer
