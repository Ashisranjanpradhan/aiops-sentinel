from pathlib import Path
from typing import Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
DEFAULT_DB_FILE = PROJECT_ROOT / "aiops_sentinel.db"
KNOWN_INSECURE_SECRETS = {
    "replace-with-a-long-random-local-secret-32-chars-minimum",
    "secret",
    "changeme",
    "admin",
    "default-secret-key-do-not-use-in-production",
}


class Settings(BaseSettings):
    APP_NAME: str = "AIOps Sentinel"
    APP_ENV: Literal["development", "test", "staging", "production"] = "development"
    APP_BASE_URL: str = "http://localhost:3000"
    API_BASE_URL: str = "http://localhost:8000"
    API_V1_PREFIX: str = "/api/v1"
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_URL: str = f"sqlite+aiosqlite:///{DEFAULT_DB_FILE.as_posix()}"

    # Redis (Optional, used if configured)
    REDIS_URL: str = "redis://localhost:6379/0"

    # Observability Backends
    PROMETHEUS_URL: str = "http://localhost:9090"
    LOKI_URL: str = "http://localhost:3100"
    TEMPO_URL: str = "http://localhost:3200"
    OTEL_EXPORTER_OTLP_ENDPOINT: str = "http://localhost:4317"

    # Auth & Security
    SESSION_SECRET: str = "replace-with-a-long-random-local-secret-32-chars-minimum"
    SESSION_COOKIE_NAME: str = "aiops_session"
    SESSION_COOKIE_SECURE: bool = False
    SESSION_COOKIE_SAMESITE: str = "lax"
    SESSION_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days session fallback
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # Target 60 minutes for access tokens
    CORS_ALLOWED_ORIGINS: str | list[str] = "http://localhost:3000,http://127.0.0.1:3000"

    # Login Protection & Rate Limiting
    LOGIN_RATE_LIMIT_MAX_ATTEMPTS: int = 5
    LOGIN_RATE_LIMIT_WINDOW_SECONDS: int = 60
    LOGIN_LOCKOUT_SECONDS: int = 300

    # Codebase Assessment Quotas & Security Limits
    MAX_UPLOAD_SIZE_BYTES: int = 25 * 1024 * 1024  # 25 MB max ZIP upload
    MAX_EXTRACTED_SIZE_BYTES: int = 100 * 1024 * 1024  # 100 MB max extracted workspace
    MAX_ASSESSMENT_FILES: int = 2000  # Max file count in archive
    ASSESSMENT_MAX_UPLOAD_BYTES: int = 25 * 1024 * 1024
    ASSESSMENT_MAX_WORKSPACE_BYTES: int = 100 * 1024 * 1024
    ASSESSMENT_MAX_FILE_COUNT: int = 2000
    ASSESSMENT_WORKSPACE_DIR: str = "/tmp/aiops_assessments"

    # Contact & Enquiry Management
    CONTACT_RATE_LIMIT_PER_HOUR: int = 100
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM_EMAIL: str = "noreply@aiops-sentinel.local"
    CONTACT_NOTIFICATION_EMAIL: str | None = None

    # Application settings
    DEFAULT_TIMEZONE: str = "Asia/Kolkata"
    DEMO_MODE: bool = True
    DATA_DIR: str = "./ml/data"
    ARTIFACT_DIR: str = "./ml/artifacts"

    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def resolve_db_url(cls, v: str) -> str:
        if "sqlite" in v and "./aiops_sentinel.db" in v:
            return f"sqlite+aiosqlite:///{DEFAULT_DB_FILE.as_posix()}"
        return v

    @field_validator("CORS_ALLOWED_ORIGINS", mode="after")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    @model_validator(mode="after")
    def validate_production_security(self) -> "Settings":
        """Fail fast in staging and production if secrets are insecure, default, or misconfigured."""
        if self.APP_ENV in ["staging", "production"]:
            if (
                not self.SESSION_SECRET
                or self.SESSION_SECRET in KNOWN_INSECURE_SECRETS
                or len(self.SESSION_SECRET) < 32
            ):
                raise ValueError(
                    f"CRITICAL SECURITY CONFIGURATION ERROR: SESSION_SECRET must be at least 32 characters "
                    f"and cannot be a default or placeholder string when APP_ENV={self.APP_ENV}."
                )

        if self.APP_ENV == "production":
            # Production requires PostgreSQL with asyncpg driver
            if "sqlite" in self.DATABASE_URL.lower():
                raise ValueError(
                    "CRITICAL DATABASE CONFIGURATION ERROR: SQLite is not permitted in production. "
                    "Configure a production-grade PostgreSQL database URL (e.g., postgresql+asyncpg://user:pass@host:5432/db)."
                )

            # Production prohibits simulated demo mode
            if self.DEMO_MODE:
                raise ValueError(
                    "CRITICAL TELEMETRY CONFIGURATION ERROR: DEMO_MODE must be False in production. "
                    "Production requires real telemetry ingestion from Prometheus, Loki, and Tempo."
                )

            # Validate telemetry backend schemes
            for name, url in [
                ("PROMETHEUS_URL", self.PROMETHEUS_URL),
                ("LOKI_URL", self.LOKI_URL),
                ("TEMPO_URL", self.TEMPO_URL),
            ]:
                if not url or not (url.startswith("http://") or url.startswith("https://")):
                    raise ValueError(
                        f"CRITICAL OBSERVABILITY CONFIGURATION ERROR: {name} must be a valid http/https URL in production."
                    )

        return self

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
