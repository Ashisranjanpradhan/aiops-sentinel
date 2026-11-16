from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
DEFAULT_DB_FILE = PROJECT_ROOT / "aiops_sentinel.db"


class Settings(BaseSettings):
    APP_NAME: str = "AIOps Sentinel"
    APP_ENV: str = "development"
    APP_BASE_URL: str = "http://localhost:3000"
    API_BASE_URL: str = "http://localhost:8000"
    API_V1_PREFIX: str = "/api/v1"
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_URL: str = f"sqlite+aiosqlite:///{DEFAULT_DB_FILE.as_posix()}"

    # Redis
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
    SESSION_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    CORS_ALLOWED_ORIGINS: str | list[str] = "http://localhost:3000,http://127.0.0.1:3000"

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

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
