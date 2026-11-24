#!/usr/bin/env python3
"""
scripts/benchmark-performance.py

Scalability and Performance Benchmarking Suite for AIOps Sentinel Codebase Assessment Engine.

Measures:
- Wall-clock scan duration
- Analysis throughput (files/second)
- Peak RSS memory consumption
- Scaling complexity curve across repository sizes:
  * Small: 10 files
  * Medium: 100 files
  * Large: 1,000 files
  * Stress: 5,000 files
"""

import io
import math
import os
import resource
import shutil
import sys
import tempfile
import time
import zipfile
from pathlib import Path

# Add backend directory to sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.services.assessment.ast_analyzer import MultiLanguageCodeAnalyzer
from app.services.assessment.detector import CodebaseDetector
from app.services.assessment.evaluator import DimensionEvaluator


def get_peak_memory_mb() -> float:
    """Returns peak resident set size in megabytes."""
    rusage = resource.getrusage(resource.RUSAGE_SELF)
    # macOS ru_maxrss is in bytes, Linux is in kilobytes
    if sys.platform == "darwin":
        return rusage.ru_maxrss / (1024.0 * 1024.0)
    return rusage.ru_maxrss / 1024.0


def create_synthetic_repo(num_files: int, target_dir: Path):
    """Generates a realistic multi-language repository with varying file sizes and constructs."""
    target_dir.mkdir(parents=True, exist_ok=True)

    templates = [
        # Python
        ("service_{i}.py", """import os
import sys

def handle_request(req_id: int):
    # Potential finding
    token = os.getenv("SECRET_KEY", "default_insecure_token")
    if req_id < 0:
        raise ValueError("Invalid id")
    return {"status": "ok", "id": req_id}
"""),
        # TypeScript
        ("handler_{i}.ts", """export function processPayment(amount: number) {
  if (amount <= 0) return { error: "negative" };
  const raw = eval("amount * 1.05");
  return { net: raw };
}
"""),
        # Go
        ("worker_{i}.go", """package main
import "os/exec"

func RunWorker(cmd string) error {
    return exec.Command("sh", "-c", cmd).Run()
}
"""),
        # Config / Manifest
        ("config_{i}.json", """{
  "service": "worker",
  "enabled": true,
  "retries": 3
}
"""),
    ]

    for i in range(num_files):
        filename_pattern, content = templates[i % len(templates)]
        filename = filename_pattern.format(i=i)

        # Distribute into subdirectories to test directory tree traversal
        sub_dir = target_dir / f"pkg_{i // 50}"
        sub_dir.mkdir(parents=True, exist_ok=True)

        file_path = sub_dir / filename
        file_path.write_text(content, encoding="utf-8")


def benchmark_size(num_files: int) -> dict:
    temp_dir = Path(tempfile.mkdtemp(prefix=f"bench_{num_files}_"))
    try:
        # Generate files
        create_synthetic_repo(num_files, temp_dir)

        mem_before = get_peak_memory_mb()
        start_time = time.perf_counter()

        # Phase 1: Detection & File Inventory
        scan_info = CodebaseDetector.scan_workspace(temp_dir)

        # Phase 2: Static AST Analysis
        inventory = scan_info["inventory"]
        raw_findings = MultiLanguageCodeAnalyzer.analyze_files(temp_dir, inventory)

        # Phase 3: Dimension Evaluation & Scoring
        score, level, dim_scores, all_findings, recs, summary = DimensionEvaluator.evaluate(
            temp_dir,
            inventory,
            scan_info,
            raw_findings,
            is_partial_upload=False,
        )

        duration = time.perf_counter() - start_time
        mem_after = get_peak_memory_mb()
        files_per_sec = round(num_files / max(0.001, duration), 1)

        return {
            "num_files": num_files,
            "duration_sec": round(duration, 3),
            "files_per_sec": files_per_sec,
            "peak_memory_mb": round(mem_after, 2),
            "findings_count": len(all_findings),
            "overall_score": score,
            "readiness_level": level,
        }
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def main():
    print("=" * 70)
    print("AIOps Sentinel Codebase Assessment Scalability Benchmark")
    print("=" * 70)
    print(f"Platform: {sys.platform} | Python: {sys.version.split()[0]}")
    print(f"Initial Baseline Memory: {get_peak_memory_mb():.2f} MB\n")

    sizes = [10, 100, 1000, 5000]
    results = []

    print(f"{'Repository Size':<18} | {'Duration (s)':<14} | {'Throughput (files/s)':<22} | {'Peak RSS (MB)':<14}")
    print("-" * 75)

    for sz in sizes:
        res = benchmark_size(sz)
        results.append(res)
        print(f"{res['num_files']:<6} files       | {res['duration_sec']:<14.3f} | {res['files_per_sec']:<22.1f} | {res['peak_memory_mb']:<14.2f}")

    print("\n" + "=" * 70)
    print("Complexity Analysis:")
    t_100 = next(r["duration_sec"] for r in results if r["num_files"] == 100)
    t_1000 = next(r["duration_sec"] for r in results if r["num_files"] == 1000)
    t_5000 = next(r["duration_sec"] for r in results if r["num_files"] == 5000)

    ratio_10x = t_1000 / max(0.001, t_100)
    ratio_5x = t_5000 / max(0.001, t_1000)

    print(f"  * 100 -> 1,000 files (10x size increase): {ratio_10x:.2f}x duration increase")
    print(f"  * 1,000 -> 5,000 files (5x size increase): {ratio_5x:.2f}x duration increase")

    if ratio_10x <= 12.0 and ratio_5x <= 6.0:
        print("  -> Scaling Profile: O(N) LINEAR SCALING (Zero exponential AST bottlenecks detected)")
    else:
        print(f"  -> Scaling Profile: Superlinear (10x ratio = {ratio_10x:.2f}x)")

    print("=" * 70)


if __name__ == "__main__":
    main()
