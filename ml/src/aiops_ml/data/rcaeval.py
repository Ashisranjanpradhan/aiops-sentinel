from typing import Any

from pydantic import BaseModel


class RCAEvalManifest(BaseModel):
    name: str = "RCAEval"
    version: str = "1.0.0"
    source_url: str = "https://github.com/phamquiluan/RCAEval"
    zenodo_record: str = "https://zenodo.org/records/15117188"
    license_note: str = "MIT / Research attribution required. Check Zenodo license."
    suites: list[str] = ["RE1", "RE2", "RE3"]
    fault_types: list[str] = [
        "cpu_contention",
        "memory_leak",
        "network_delay",
        "network_loss",
        "disk_io",
        "process_crash",
    ]
    total_cases: int = 735
    modalities: list[str] = ["metrics", "logs", "traces"]


def create_rcaeval_split(
    manifest: RCAEvalManifest, train_ratio: float = 0.7, seed: int = 42
) -> dict[str, Any]:
    """
    Generates an immutable case-level train/validation/test split manifest to prevent
    information leakage across failure episodes (Section 3.5 & 11.4).
    """
    total = manifest.total_cases
    indices = list(range(1, total + 1))

    # Deterministic split by case
    import random

    rng = random.Random(seed)
    rng.shuffle(indices)

    train_end = int(total * train_ratio)
    val_end = int(total * (train_ratio + 0.15))

    train_cases = [f"case_{i:04d}" for i in indices[:train_end]]
    val_cases = [f"case_{i:04d}" for i in indices[train_end:val_end]]
    test_cases = [f"case_{i:04d}" for i in indices[val_end:]]

    split_doc = {
        "dataset_name": manifest.name,
        "dataset_version": manifest.version,
        "seed": seed,
        "train_count": len(train_cases),
        "val_count": len(val_cases),
        "test_count": len(test_cases),
        "splits": {"train": train_cases, "validation": val_cases, "test": test_cases},
    }
    return split_doc
