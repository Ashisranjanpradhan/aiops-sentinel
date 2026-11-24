import asyncio
import os
import shutil
import tempfile
import unicodedata
import zipfile
from pathlib import Path

from fastapi import UploadFile

from app.core.config import settings
from app.core.errors import ValidationError

# Safety limits
MAX_ZIP_SIZE = settings.ASSESSMENT_MAX_UPLOAD_BYTES  # 25 MB
MAX_UNCOMPRESSED_SIZE = settings.ASSESSMENT_MAX_WORKSPACE_BYTES  # 100 MB
MAX_FILES = settings.ASSESSMENT_MAX_FILE_COUNT  # 5000 files
MAX_SINGLE_FILE_SIZE = 15 * 1024 * 1024  # 15 MB
MAX_COMPRESSION_RATIO = 100.0  # Max 100:1 decompression ratio (zip bomb defense)
MAX_DIRECTORY_DEPTH = 16  # Max nested folder depth
ALLOWED_EXTENSIONS = {".zip"}


def _extract_zip_members_sync(tmp_path: str, resolved_dest: Path) -> int:
    """
    Synchronous file extraction worker enforcing strict archive boundary checks:
    - Path traversal (zip-slip)
    - Decompression bomb ratio (>100:1)
    - Total uncompressed size & single file size limits
    - Encrypted / password-protected entries
    - Symlinks and directory symlinks
    - Excessive directory depth (>16)
    - Duplicate normalized paths
    """
    total_uncompressed = 0
    file_count = 0
    seen_normalized_paths: set[str] = set()

    with zipfile.ZipFile(tmp_path, "r") as zf:
        # Pass 1: Inspection & Validation
        for member in zf.infolist():
            file_count += 1
            if file_count > MAX_FILES:
                raise ValidationError(
                    f"Archive contains too many files (exceeds limit of {MAX_FILES})."
                )

            # 1. Encrypted archive entry check
            if member.flag_bits & 0x1:
                raise ValidationError(
                    f"Security Violation: Encrypted member '{member.filename}' detected. "
                    "Password-protected archives are rejected."
                )

            # 2. Symlink detection (Unix mode stored in external_attr >> 16)
            unix_mode = member.external_attr >> 16
            if unix_mode & 0o120000 == 0o120000:
                raise ValidationError(
                    f"Security Violation: Symlink member '{member.filename}' detected. "
                    "Symbolic links inside archives are prohibited to prevent arbitrary file disclosure."
                )

            # 3. Decompression ratio (zip bomb protection)
            if member.compress_size > 0:
                ratio = member.file_size / member.compress_size
                if ratio > MAX_COMPRESSION_RATIO and member.file_size > 1024 * 1024:
                    raise ValidationError(
                        f"Security Violation: Compression ratio of {ratio:.1f}:1 on '{member.filename}' "
                        f"exceeds safety threshold of {MAX_COMPRESSION_RATIO:.0f}:1 (potential zip bomb)."
                    )

            # 4. Total uncompressed size limit
            total_uncompressed += member.file_size
            if total_uncompressed > MAX_UNCOMPRESSED_SIZE:
                raise ValidationError(
                    f"Uncompressed archive size exceeds limit of {MAX_UNCOMPRESSED_SIZE // (1024 * 1024)} MB."
                )

            # 5. Single file size limit
            if member.file_size > MAX_SINGLE_FILE_SIZE:
                raise ValidationError(
                    f"Single file '{member.filename}' exceeds {MAX_SINGLE_FILE_SIZE // (1024 * 1024)} MB limit."
                )

            # 6. Path normalization and traversal checks
            norm_path = os.path.normpath(member.filename)
            if norm_path.startswith("..") or os.path.isabs(norm_path) or "/../" in norm_path or "\\..\\" in norm_path:
                raise ValidationError(
                    f"Security Violation: Zip-slip path traversal attempted in member '{member.filename}'."
                )

            # 7. Directory depth limit
            parts = [p for p in norm_path.replace("\\", "/").split("/") if p and p != "."]
            if len(parts) > MAX_DIRECTORY_DEPTH:
                raise ValidationError(
                    f"Directory nesting depth of {len(parts)} levels in '{member.filename}' "
                    f"exceeds maximum allowed depth of {MAX_DIRECTORY_DEPTH}."
                )

            # 8. Duplicate normalized path collision
            canonical = unicodedata.normalize("NFC", norm_path.lower().replace("\\", "/"))
            if canonical in seen_normalized_paths and not member.is_dir():
                raise ValidationError(
                    f"Security Violation: Ambiguous duplicate file path '{member.filename}' "
                    "in archive (potential case-collision attack)."
                )
            if not member.is_dir():
                seen_normalized_paths.add(canonical)

            # 9. Verify destination resolution
            target_file = (resolved_dest / norm_path).resolve()
            if not str(target_file).startswith(str(resolved_dest)):
                raise ValidationError(
                    f"Security Violation: Member path '{member.filename}' resolves outside target workspace."
                )

        # Pass 2: Safe Extraction
        for member in zf.infolist():
            norm_path = os.path.normpath(member.filename)
            target_file = resolved_dest / norm_path
            if member.is_dir():
                target_file.mkdir(parents=True, exist_ok=True)
            else:
                target_file.parent.mkdir(parents=True, exist_ok=True)
                with zf.open(member) as source, open(target_file, "wb") as target:
                    shutil.copyfileobj(source, target)

    return file_count


def _save_file_bytes_sync(target_path: Path, content: bytes) -> None:
    target_path.parent.mkdir(parents=True, exist_ok=True)
    with open(target_path, "wb") as out:
        out.write(content)


class WorkspaceManager:
    """Manages safe, sandboxed workspaces for uploaded codebases."""

    @staticmethod
    def create_isolated_workspace(assessment_id: str) -> Path:
        """Create a dedicated, isolated scratch workspace directory."""
        base_dir = Path("/tmp/aiops_assessments")
        base_dir.mkdir(parents=True, exist_ok=True)
        workspace = base_dir / assessment_id
        workspace.mkdir(parents=True, exist_ok=True)
        return workspace

    @staticmethod
    def cleanup_workspace(workspace_dir: Path) -> None:
        """Remove temporary workspace directory cleanly."""
        try:
            if workspace_dir.exists() and str(workspace_dir).startswith("/tmp/aiops_assessments"):
                shutil.rmtree(workspace_dir, ignore_errors=True)
        except Exception:
            pass

    @classmethod
    def cleanup_assessment_artifacts(cls, assessment_id: str) -> None:
        """Remove all persistent scratch files, reports, and extracted archives for an assessment."""
        workspace = Path("/tmp/aiops_assessments") / assessment_id
        cls.cleanup_workspace(workspace)

    @classmethod
    async def extract_zip_safely(cls, upload_file: UploadFile, dest_dir: Path) -> int:
        """Safely unpack ZIP archive with zip-slip, zip-bomb, and symlink defenses."""
        with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp:
            total_read = 0
            while chunk := await upload_file.read(1024 * 64):
                total_read += len(chunk)
                if total_read > MAX_ZIP_SIZE:
                    os.unlink(tmp.name)
                    raise ValidationError(
                        f"Archive size exceeds maximum allowed upload limit of {MAX_ZIP_SIZE // (1024 * 1024)} MB."
                    )
                tmp.write(chunk)
            tmp_path = tmp.name

        try:
            if not zipfile.is_zipfile(tmp_path):
                raise ValidationError("Uploaded file is not a valid ZIP archive.")

            resolved_dest = dest_dir.resolve()
            return await asyncio.to_thread(_extract_zip_members_sync, tmp_path, resolved_dest)
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    @classmethod
    async def save_multiple_files_safely(
        cls,
        files: list[UploadFile],
        dest_dir: Path,
        relative_paths: list[str] | None = None,
    ) -> int:
        """
        Safely write individual or folder-selected uploaded files into workspace.
        Preserves relative directory hierarchies when available.
        """
        resolved_dest = dest_dir.resolve()
        count = 0
        total_size = 0

        for idx, f in enumerate(files):
            if not f.filename:
                continue

            # Determine relative path: preferential from relative_paths or filename
            raw_path = f.filename
            if relative_paths and idx < len(relative_paths) and relative_paths[idx].strip():
                raw_path = relative_paths[idx].strip()

            norm_name = os.path.normpath(raw_path)
            if norm_name.startswith("..") or os.path.isabs(norm_name) or "/../" in norm_name:
                raise ValidationError(f"Invalid file path traversal: {raw_path}")

            parts = [p for p in norm_name.replace("\\", "/").split("/") if p and p != "."]
            if len(parts) > MAX_DIRECTORY_DEPTH:
                raise ValidationError(
                    f"File '{raw_path}' exceeds directory nesting limit of {MAX_DIRECTORY_DEPTH}."
                )

            target_path = (resolved_dest / norm_name).resolve()
            if not str(target_path).startswith(str(resolved_dest)):
                raise ValidationError(f"File path resolves outside workspace: {raw_path}")

            content = await f.read()
            total_size += len(content)
            if total_size > MAX_UNCOMPRESSED_SIZE:
                raise ValidationError("Total upload size exceeds maximum allowed workspace quota.")

            if len(content) > MAX_SINGLE_FILE_SIZE:
                raise ValidationError(
                    f"Single file '{raw_path}' exceeds {MAX_SINGLE_FILE_SIZE // (1024 * 1024)} MB limit."
                )

            await asyncio.to_thread(_save_file_bytes_sync, target_path, content)
            count += 1

        return count
