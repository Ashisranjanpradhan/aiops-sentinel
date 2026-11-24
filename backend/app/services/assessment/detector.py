import json
import os
from pathlib import Path
from typing import Any

IGNORED_DIRS = {
    ".git",
    ".hg",
    ".svn",
    "__pycache__",
    "node_modules",
    ".venv",
    "venv",
    "env",
    "dist",
    "build",
    ".next",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    "coverage",
    ".idea",
    ".vscode",
}

EXTENSION_MAP = {
    ".py": "Python",
    ".ts": "TypeScript",
    ".tsx": "TypeScript (React)",
    ".js": "JavaScript",
    ".jsx": "JavaScript (React)",
    ".go": "Go",
    ".rs": "Rust",
    ".java": "Java",
    ".c": "C",
    ".cpp": "C++",
    ".h": "C/C++ Header",
    ".hpp": "C++ Header",
    ".cs": "C#",
    ".sql": "SQL",
    ".sh": "Shell",
    ".bash": "Shell",
    ".html": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".yaml": "YAML",
    ".yml": "YAML",
    ".json": "JSON",
    ".toml": "TOML",
    ".md": "Markdown",
    ".dockerfile": "Dockerfile",
}

PROFILES = [
    "Python Backend/API",
    "JavaScript/TypeScript Web Application",
    "Full-Stack Web Application",
    "Java Enterprise Application",
    "Go Backend Application",
    "Microservices Application",
    "Machine Learning Application",
    "Generic Software Repository",
]


class CodebaseDetector:
    """Discovers languages, frameworks, manifests, structure tree, and inventory of a workspace."""

    @classmethod
    def scan_workspace(cls, workspace_dir: Path) -> dict[str, Any]:
        file_inventory: list[Path] = []
        language_counts: dict[str, int] = {}
        total_code_files = 0
        unsupported_files: list[str] = []

        for root, dirs, files in os.walk(workspace_dir):
            # Prune ignored directories in-place
            dirs[:] = [d for d in dirs if d not in IGNORED_DIRS and not d.startswith(".")]

            for file in files:
                file_path = Path(root) / file
                file_inventory.append(file_path)

                ext = file_path.suffix.lower()
                rel_p = str(file_path.relative_to(workspace_dir))
                if file.lower() == "dockerfile" or file.lower().startswith("dockerfile."):
                    lang = "Dockerfile"
                else:
                    lang = EXTENSION_MAP.get(ext)

                if lang:
                    language_counts[lang] = language_counts.get(lang, 0) + 1
                    total_code_files += 1
                else:
                    unsupported_files.append(rel_p)

        # Calculate percentages
        languages_summary = []
        for lang, count in sorted(language_counts.items(), key=lambda x: x[1], reverse=True):
            pct = round((count / max(1, total_code_files)) * 100, 1)
            languages_summary.append({"language": lang, "files": count, "percentage": pct})

        frameworks = cls._detect_frameworks(workspace_dir, file_inventory)
        detected_profile = cls._detect_profile(
            languages_summary, frameworks, file_inventory, workspace_dir
        )
        project_tree = cls._generate_project_tree(workspace_dir, file_inventory)
        structural_components = cls._detect_structural_components(workspace_dir, file_inventory)
        missing_critical_files = cls._detect_missing_critical_files(
            workspace_dir, file_inventory, detected_profile
        )

        return {
            "total_files": len(file_inventory),
            "code_files_count": total_code_files,
            "languages": languages_summary,
            "frameworks": frameworks,
            "profile": detected_profile,
            "inventory": file_inventory,
            "unsupported_files_count": len(unsupported_files),
            "unsupported_files": unsupported_files[:50],  # preview top 50
            "project_tree": project_tree,
            "structural_components": structural_components,
            "missing_critical_files": missing_critical_files,
        }

    @classmethod
    def _detect_frameworks(cls, workspace_dir: Path, files: list[Path]) -> list[str]:
        detected = set()
        file_names = {f.name.lower() for f in files}

        # Container & Orchestration
        if "dockerfile" in file_names or any(
            f.name.lower().startswith("dockerfile.") for f in files
        ):
            detected.add("Docker")
        if any("compose" in name for name in file_names):
            detected.add("Docker Compose")
        if any("k8s" in str(f).lower() or "helm" in str(f).lower() for f in files):
            detected.add("Kubernetes")

        # Python manifests
        for f in files:
            if f.name in ("requirements.txt", "pyproject.toml", "Pipfile", "setup.py"):
                try:
                    content = f.read_text(encoding="utf-8", errors="ignore").lower()
                    if "fastapi" in content:
                        detected.add("FastAPI")
                    if "flask" in content:
                        detected.add("Flask")
                    if "django" in content:
                        detected.add("Django")
                    if "sqlalchemy" in content:
                        detected.add("SQLAlchemy")
                    if "pydantic" in content:
                        detected.add("Pydantic")
                    if "celery" in content:
                        detected.add("Celery")
                    if "pytest" in content:
                        detected.add("Pytest")
                    if "torch" in content or "pytorch" in content:
                        detected.add("PyTorch")
                    if "tensorflow" in content or "keras" in content:
                        detected.add("TensorFlow")
                    if "scikit-learn" in content or "sklearn" in content:
                        detected.add("Scikit-Learn")
                    if "alembic" in content:
                        detected.add("Alembic")
                except Exception:
                    pass

            # Node package.json
            if f.name == "package.json":
                try:
                    data = json.loads(f.read_text(encoding="utf-8", errors="ignore"))
                    deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
                    keys = {k.lower() for k in deps}
                    if "next" in keys:
                        detected.add("Next.js")
                    if "react" in keys:
                        detected.add("React")
                    if "express" in keys:
                        detected.add("Express")
                    if "nestjs" in keys or "@nestjs/core" in keys:
                        detected.add("NestJS")
                    if "vue" in keys or "nuxt" in keys:
                        detected.add("Vue")
                    if "@angular/core" in keys:
                        detected.add("Angular")
                    if "prisma" in keys or "@prisma/client" in keys:
                        detected.add("Prisma")
                    if "typeorm" in keys:
                        detected.add("TypeORM")
                    if "jest" in keys:
                        detected.add("Jest")
                    if "vitest" in keys:
                        detected.add("Vitest")
                    if "playwright" in keys or "@playwright/test" in keys:
                        detected.add("Playwright")
                except Exception:
                    pass

            # Java pom.xml / build.gradle
            if f.name in ("pom.xml", "build.gradle", "build.gradle.kts"):
                try:
                    content = f.read_text(encoding="utf-8", errors="ignore").lower()
                    if "spring-boot" in content or "springframework" in content:
                        detected.add("Spring Boot")
                    if "quarkus" in content:
                        detected.add("Quarkus")
                    if "micronaut" in content:
                        detected.add("Micronaut")
                    if "hibernate" in content:
                        detected.add("Hibernate")
                    if "junit" in content:
                        detected.add("JUnit")
                except Exception:
                    pass

            # Go go.mod
            if f.name == "go.mod":
                try:
                    content = f.read_text(encoding="utf-8", errors="ignore").lower()
                    if "gin-gonic/gin" in content:
                        detected.add("Gin")
                    if "gofiber/fiber" in content:
                        detected.add("Fiber")
                    if "labstack/echo" in content:
                        detected.add("Echo")
                    if "go-chi/chi" in content:
                        detected.add("Chi")
                    if "gorm.io/gorm" in content:
                        detected.add("GORM")
                except Exception:
                    pass

            # Rust Cargo.toml
            if f.name == "Cargo.toml":
                try:
                    content = f.read_text(encoding="utf-8", errors="ignore").lower()
                    if "actix-web" in content:
                        detected.add("Actix-web")
                    if "axum" in content:
                        detected.add("Axum")
                    if "tokio" in content:
                        detected.add("Tokio")
                    if "diesel" in content:
                        detected.add("Diesel")
                except Exception:
                    pass

        return sorted(detected)

    @classmethod
    def _detect_profile(
        cls,
        languages: list[dict[str, Any]],
        frameworks: list[str],
        files: list[Path],
        workspace_dir: Path,
    ) -> str:
        primary_lang = languages[0]["language"] if languages else "Generic"
        framework_set = set(frameworks)

        # 1. Machine Learning Application
        if framework_set.intersection({"PyTorch", "TensorFlow", "Scikit-Learn"}):
            return "Machine Learning Application"

        # 2. Microservices Application
        if "Docker Compose" in framework_set or "Kubernetes" in framework_set:
            rel_files = [str(f.relative_to(workspace_dir)) for f in files]
            service_indicators = [
                f for f in rel_files if "service" in f.lower() or "microservice" in f.lower()
            ]
            if len(service_indicators) > 2 or any("services/" in f for f in rel_files):
                return "Microservices Application"

        # 3. Python Backend/API
        if "Python" in primary_lang and framework_set.intersection({"FastAPI", "Flask", "Django"}):
            return "Python Backend/API"

        # 4. Java Enterprise Application
        if "Java" in primary_lang or framework_set.intersection(
            {"Spring Boot", "Quarkus", "Micronaut"}
        ):
            return "Java Enterprise Application"

        # 5. Go Backend Application
        if "Go" in primary_lang or framework_set.intersection({"Gin", "Fiber", "Echo", "Chi"}):
            return "Go Backend Application"

        # 6. Full-Stack Web Application
        if framework_set.intersection({"Next.js", "Nuxt"}) or (
            "React" in framework_set and ("Express" in framework_set or "FastAPI" in framework_set)
        ):
            return "Full-Stack Web Application"

        # 7. JavaScript/TypeScript Web Application
        if (
            "JavaScript" in primary_lang or "TypeScript" in primary_lang
        ) and framework_set.intersection({"React", "Vue", "Angular", "Express"}):
            return "JavaScript/TypeScript Web Application"

        if "Python" in primary_lang:
            return "Python Backend/API"

        return "Generic Software Repository"

    @classmethod
    def _generate_project_tree(
        cls, workspace_dir: Path, files: list[Path], max_entries: int = 40
    ) -> list[str]:
        """Generates a clean text-based repository tree for top-level modules."""
        rel_paths = sorted([str(f.relative_to(workspace_dir)) for f in files])
        tree_lines = []
        seen_dirs = set()

        for p in rel_paths[:max_entries]:
            parts = p.split(os.sep)
            if len(parts) > 1:
                top_dir = parts[0] + "/"
                if top_dir not in seen_dirs:
                    tree_lines.append(f"├── {top_dir}")
                    seen_dirs.add(top_dir)
                tree_lines.append(f"│   └── {parts[-1]}")
            else:
                tree_lines.append(f"├── {p}")

        if len(rel_paths) > max_entries:
            tree_lines.append(f"└── ... ({len(rel_paths) - max_entries} more files)")

        return tree_lines

    @classmethod
    def _detect_structural_components(
        cls, workspace_dir: Path, files: list[Path]
    ) -> dict[str, list[str]]:
        """Identifies architectural components based on file locations and conventions."""
        rel_files = [str(f.relative_to(workspace_dir)) for f in files]

        components = {
            "entry_points": [],
            "api_routes": [],
            "database_modules": [],
            "test_suites": [],
            "deployment_manifests": [],
            "documentation": [],
            "ci_cd_pipelines": [],
        }

        for path in rel_files:
            lower = path.lower()
            name = os.path.basename(lower)

            # Entry points
            if name in (
                "main.py",
                "app.py",
                "index.ts",
                "index.js",
                "server.ts",
                "server.js",
                "main.go",
                "application.java",
                "main.rs",
            ):
                components["entry_points"].append(path)

            # API routes
            if any(
                k in lower for k in ("routes/", "api/", "controllers/", "endpoints/", "routers/")
            ):
                components["api_routes"].append(path)

            # Database modules
            if any(
                k in lower
                for k in ("models/", "schema/", "migrations/", "alembic/", "entities/", "db/")
            ):
                components["database_modules"].append(path)

            # Test suites
            if any(k in lower for k in ("test", "spec")) and any(
                lower.endswith(ext) for ext in (".py", ".ts", ".js", ".go", ".java", ".rs")
            ):
                components["test_suites"].append(path)

            # Deployment manifests
            if name in (
                "dockerfile",
                "compose.yaml",
                "docker-compose.yml",
                "docker-compose.yaml",
                "helmfile.yaml",
            ) or any(k in lower for k in ("k8s/", "helm/", "deploy/")):
                components["deployment_manifests"].append(path)

            # Documentation
            if lower.endswith(".md") or "docs/" in lower:
                components["documentation"].append(path)

            # CI/CD
            if ".github/workflows" in lower or ".gitlab-ci.yml" in lower or "jenkinsfile" in lower:
                components["ci_cd_pipelines"].append(path)

        return components

    @classmethod
    def _detect_missing_critical_files(
        cls, workspace_dir: Path, files: list[Path], profile: str
    ) -> list[dict[str, str]]:
        """Flags missing foundational project files."""
        file_names_lower = {f.name.lower() for f in files}
        rel_paths_lower = {str(f.relative_to(workspace_dir)).lower() for f in files}

        missing = []

        # 1. README
        if not any(f.startswith("readme") for f in file_names_lower):
            missing.append(
                {
                    "file": "README.md",
                    "importance": "HIGH",
                    "reason": "Missing primary project documentation explaining architecture, installation, and usage.",
                }
            )

        # 2. Automated Tests
        has_tests = any("test" in p or "spec" in p for p in rel_paths_lower)
        if not has_tests:
            missing.append(
                {
                    "file": "tests/ or *_test.*",
                    "importance": "CRITICAL",
                    "reason": "No automated unit or integration tests found in the repository.",
                }
            )

        # 3. Container / Deployment manifest
        has_container = "dockerfile" in file_names_lower or any(
            f.startswith("dockerfile.") for f in file_names_lower
        )
        if not has_container and profile != "Generic Software Repository":
            missing.append(
                {
                    "file": "Dockerfile",
                    "importance": "HIGH",
                    "reason": "No containerization manifest detected for reproducible production deployment.",
                }
            )

        # 4. CI/CD workflow
        has_ci = any(".github/workflows" in p or ".gitlab-ci" in p for p in rel_paths_lower)
        if not has_ci:
            missing.append(
                {
                    "file": ".github/workflows/ci.yml",
                    "importance": "MEDIUM",
                    "reason": "No automated continuous integration pipeline configured for pull requests and builds.",
                }
            )

        # 5. Environment configuration template
        has_env_example = ".env.example" in file_names_lower or ".env.template" in file_names_lower
        if not has_env_example and any(
            f.endswith((".py", ".ts", ".js", ".go")) for f in file_names_lower
        ):
            missing.append(
                {
                    "file": ".env.example",
                    "importance": "MEDIUM",
                    "reason": "No environment variable documentation template provided for runtime configurations.",
                }
            )

        return missing
