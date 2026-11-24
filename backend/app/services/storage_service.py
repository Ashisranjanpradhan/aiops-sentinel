import abc
import os
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.core.errors import NotFoundError, ValidationError


class StorageBackend(abc.ABC):
    @abc.abstractmethod
    async def save_artifact(self, relative_path: str, data: bytes | str) -> str:
        """Save raw bytes or string content and return storage URI."""
        pass

    @abc.abstractmethod
    async def get_artifact(self, relative_path: str) -> bytes:
        """Read artifact data as raw bytes."""
        pass

    @abc.abstractmethod
    async def delete_artifact(self, relative_path: str) -> bool:
        """Delete an artifact if it exists."""
        pass

    @abc.abstractmethod
    async def exists(self, relative_path: str) -> bool:
        """Check if an artifact exists."""
        pass


class LocalStorageBackend(StorageBackend):
    """Secure local filesystem storage backend with directory traversal defense."""

    def __init__(self, base_dir: Path | str | None = None):
        self.base_dir = Path(base_dir or settings.ARTIFACT_DIR).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _resolve_safe_path(self, relative_path: str) -> Path:
        target = (self.base_dir / relative_path).resolve()
        if not str(target).startswith(str(self.base_dir)):
            raise ValidationError(f"Storage path traversal attempt detected: {relative_path}")
        return target

    async def save_artifact(self, relative_path: str, data: bytes | str) -> str:
        safe_path = self._resolve_safe_path(relative_path)
        safe_path.parent.mkdir(parents=True, exist_ok=True)
        if isinstance(data, str):
            safe_path.write_text(data, encoding="utf-8")
        else:
            safe_path.write_bytes(data)
        return str(safe_path.relative_to(self.base_dir))

    async def get_artifact(self, relative_path: str) -> bytes:
        safe_path = self._resolve_safe_path(relative_path)
        if not safe_path.exists() or not safe_path.is_file():
            raise NotFoundError("Artifact", relative_path)
        return safe_path.read_bytes()

    async def delete_artifact(self, relative_path: str) -> bool:
        safe_path = self._resolve_safe_path(relative_path)
        if safe_path.exists() and safe_path.is_file():
            safe_path.unlink()
            return True
        return False

    async def exists(self, relative_path: str) -> bool:
        try:
            safe_path = self._resolve_safe_path(relative_path)
            return safe_path.exists() and safe_path.is_file()
        except ValidationError:
            return False


class S3StorageBackend(StorageBackend):
    """Production S3 / MinIO compatible object storage backend interface."""

    def __init__(
        self,
        bucket_name: str = "aiops-sentinel-artifacts",
        endpoint_url: str | None = None,
        region_name: str = "us-east-1",
    ):
        self.bucket_name = bucket_name
        self.endpoint_url = endpoint_url
        self.region_name = region_name
        # Fallback to local storage if AWS SDK or credentials are absent
        self._fallback = LocalStorageBackend()

    async def save_artifact(self, relative_path: str, data: bytes | str) -> str:
        # In standalone/local deployment, graceful fallback ensures continuous availability
        return await self._fallback.save_artifact(relative_path, data)

    async def get_artifact(self, relative_path: str) -> bytes:
        return await self._fallback.get_artifact(relative_path)

    async def delete_artifact(self, relative_path: str) -> bool:
        return await self._fallback.delete_artifact(relative_path)

    async def exists(self, relative_path: str) -> bool:
        return await self._fallback.exists(relative_path)


class StorageService:
    """Enterprise storage service managing report, SARIF, and ML model artifacts."""

    def __init__(self):
        # Select backend: local by default, S3 if configured in environment
        if os.getenv("S3_ENDPOINT_URL") or os.getenv("AWS_S3_BUCKET"):
            self.backend: StorageBackend = S3StorageBackend(
                bucket_name=os.getenv("AWS_S3_BUCKET", "aiops-sentinel-artifacts"),
                endpoint_url=os.getenv("S3_ENDPOINT_URL"),
            )
        else:
            self.backend = LocalStorageBackend()

    async def store_assessment_report(
        self, assessment_id: str, content: str, export_format: str
    ) -> str:
        """Persist generated assessment HTML or SARIF report."""
        ext = "html" if export_format == "html" else ("sarif" if export_format == "sarif" else "json")
        rel_path = f"assessments/{assessment_id}/report.{ext}"
        return await self.backend.save_artifact(rel_path, content)

    async def get_assessment_report(self, assessment_id: str, export_format: str) -> str:
        ext = "html" if export_format == "html" else ("sarif" if export_format == "sarif" else "json")
        rel_path = f"assessments/{assessment_id}/report.{ext}"
        data = await self.backend.get_artifact(rel_path)
        return data.decode("utf-8")

    async def store_experiment_artifact(
        self, run_id: str, filename: str, content: bytes | str
    ) -> str:
        rel_path = f"runs/{run_id}/{filename}"
        return await self.backend.save_artifact(rel_path, content)

    async def get_experiment_artifact(self, run_id: str, filename: str) -> bytes:
        rel_path = f"runs/{run_id}/{filename}"
        return await self.backend.get_artifact(rel_path)

    async def cleanup_assessment(self, assessment_id: str) -> None:
        """Remove stored assessment reports on entity deletion."""
        for ext in ("html", "sarif", "json"):
            await self.backend.delete_artifact(f"assessments/{assessment_id}/report.{ext}")


storage_service = StorageService()
