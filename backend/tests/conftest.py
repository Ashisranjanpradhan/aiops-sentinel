import asyncio
import importlib.util
from pathlib import Path

import pytest

import app.models.entities  # noqa: F401 - Register all models with Base

REPO_ROOT = Path(__file__).resolve().parent.parent.parent


@pytest.fixture(autouse=True, scope="session")
def setup_test_database():
    """Ensure database tables and initial topology seed data exist for tests."""
    seed_script = REPO_ROOT / "scripts" / "seed-dev-user.py"
    if seed_script.exists():
        spec = importlib.util.spec_from_file_location("seed_dev_user", str(seed_script))
        if spec and spec.loader:
            seed_mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(seed_mod)
            asyncio.run(seed_mod.seed())
    yield
