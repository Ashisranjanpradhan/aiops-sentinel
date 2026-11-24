import pytest
from app.core.errors import NotFoundError, ValidationError
from app.services.storage_service import LocalStorageBackend, StorageService


@pytest.mark.asyncio
async def test_storage_service_save_and_retrieve(tmp_path):
    backend = LocalStorageBackend(base_dir=tmp_path)
    stored_path = await backend.save_artifact("test/report.html", "<h1>Clean Report</h1>")
    assert "test/report.html" in stored_path

    data = await backend.get_artifact("test/report.html")
    assert data.decode("utf-8") == "<h1>Clean Report</h1>"
    assert await backend.exists("test/report.html") is True

    deleted = await backend.delete_artifact("test/report.html")
    assert deleted is True
    assert await backend.exists("test/report.html") is False


@pytest.mark.asyncio
async def test_storage_service_path_traversal_protection(tmp_path):
    backend = LocalStorageBackend(base_dir=tmp_path)

    with pytest.raises(ValidationError, match="path traversal"):
        await backend.save_artifact("../../etc/passwd", "evil data")

    with pytest.raises(ValidationError, match="path traversal"):
        await backend.get_artifact("../../../var/log/system.log")


@pytest.mark.asyncio
async def test_storage_service_missing_file_raises_not_found(tmp_path):
    backend = LocalStorageBackend(base_dir=tmp_path)
    with pytest.raises(NotFoundError):
        await backend.get_artifact("non_existent_file.txt")
