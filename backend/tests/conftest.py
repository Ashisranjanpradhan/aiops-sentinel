import asyncio
import importlib.util
from pathlib import Path

import pytest

import app.models.entities  # noqa: F401 - Register all models with Base

REPO_ROOT = Path(__file__).resolve().parent.parent.parent


@pytest.fixture(autouse=True, scope="session")
def setup_test_database():
    """Ensure database tables, initial topology, and benchmark datasets exist for tests."""
    # 1. Ensure benchmark data is generated
    bench_script = REPO_ROOT / "scripts" / "download-benchmarks.py"
    bench_file = REPO_ROOT / "ml" / "data" / "rcaeval" / "rcaeval_benchmark_seed42.json"
    if not bench_file.exists() and bench_script.exists():
        spec = importlib.util.spec_from_file_location("download_benchmarks", str(bench_script))
        if spec and spec.loader:
            bench_mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(bench_mod)
            bench_mod.ensure_dirs()
            bench_mod.generate_rcaeval_benchmark(seed=42, num_episodes=60)

    # 2. Seed development user and topology
    seed_script = REPO_ROOT / "scripts" / "seed-dev-user.py"
    if seed_script.exists():
        spec = importlib.util.spec_from_file_location("seed_dev_user", str(seed_script))
        if spec and spec.loader:
            seed_mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(seed_mod)
            asyncio.run(seed_mod.seed())
    yield
