#!/usr/bin/env python3
"""
Enhanced Scalability and Performance Profiler for AIOps Sentinel.
Measures real source code repositories (backend/app, frontend/src) and synthetic tiers.
Computes median, p95, peak RSS, CPU time, LOC, bytes, and file distribution.
"""

import os
import resource
import shutil
import sys
import tempfile
import time
from pathlib import Path

REPO_ROOT = Path("/Users/ashisranjanpradhan/Documents/AIops_sentinel")
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.services.assessment.ast_analyzer import MultiLanguageCodeAnalyzer
from app.services.assessment.detector import CodebaseDetector
from app.services.assessment.evaluator import DimensionEvaluator


def get_peak_rss_mb() -> float:
    rusage = resource.getrusage(resource.RUSAGE_SELF)
    if sys.platform == "darwin":
        return rusage.ru_maxrss / (1024.0 * 1024.0)
    return rusage.ru_maxrss / 1024.0


def profile_directory(target_dir: Path, runs: int = 5):
    # Collect metadata
    all_files = []
    total_bytes = 0
    total_loc = 0
    file_types = {}
    excluded_count = 0

    for root, dirs, files in os.walk(target_dir):
        # Count excluded
        orig_dirs = list(dirs)
        dirs[:] = [d for d in dirs if d not in ("__pycache__", ".git", "node_modules", ".next", ".venv")]
        excluded_count += len(orig_dirs) - len(dirs)

        for f in files:
            p = Path(root) / f
            ext = p.suffix.lower() or p.name
            file_types[ext] = file_types.get(ext, 0) + 1
            sz = p.stat().st_size
            total_bytes += sz
            try:
                with open(p, "r", encoding="utf-8", errors="ignore") as fp:
                    loc = sum(1 for _ in fp)
                total_loc += loc
            except Exception:
                pass
            all_files.append(p)

    durations = []
    cpu_times = []
    peak_mems = []

    for _ in range(runs):
        start_wall = time.perf_counter()
        start_cpu = time.process_time()

        scan_info = CodebaseDetector.scan_workspace(target_dir)
        inventory = scan_info["inventory"]
        findings = MultiLanguageCodeAnalyzer.analyze_files(target_dir, inventory)
        score, level, dim_scores, all_findings, recs, summary = DimensionEvaluator.evaluate(
            target_dir, inventory, scan_info, findings, is_partial_upload=False
        )

        dur_wall = time.perf_counter() - start_wall
        dur_cpu = time.process_time() - start_cpu
        durations.append(dur_wall)
        cpu_times.append(dur_cpu)
        peak_mems.append(get_peak_rss_mb())

    durations.sort()
    median_dur = durations[len(durations) // 2]
    p95_dur = durations[int(len(durations) * 0.95)]
    avg_cpu = sum(cpu_times) / len(cpu_times)
    peak_rss = max(peak_mems)

    return {
        "file_count": len(all_files),
        "total_bytes": total_bytes,
        "total_loc": total_loc,
        "file_types": file_types,
        "excluded_dirs": excluded_count,
        "median_sec": round(median_dur, 4),
        "p95_sec": round(p95_dur, 4),
        "avg_cpu_sec": round(avg_cpu, 4),
        "peak_rss_mb": round(peak_rss, 2),
    }


def main():
    print("=" * 80)
    print("Scalability and Empirical Performance Profiling Report")
    print(f"Platform: {sys.platform} | Python: {sys.version.split()[0]}")
    print("=" * 80)

    # 1. Real Repositories
    real_targets = [
        ("Backend Source (backend/app)", REPO_ROOT / "backend" / "app"),
        ("Frontend Source (frontend/src)", REPO_ROOT / "frontend" / "src"),
        ("ML Package (ml/src)", REPO_ROOT / "ml" / "src"),
    ]

    print("\n--- 1. Real Production Source Repositories ---")
    for name, path in real_targets:
        if not path.exists():
            continue
        res = profile_directory(path, runs=5)
        print(f"\nTarget: {name}")
        print(f"  Files: {res['file_count']} | Bytes: {res['total_bytes'] / 1024:.1f} KB | LOC: {res['total_loc']:,}")
        print(f"  Types: {dict(sorted(res['file_types'].items(), key=lambda x: x[1], reverse=True)[:5])}")
        print(f"  Median Time: {res['median_sec']*1000:.2f} ms | p95 Time: {res['p95_sec']*1000:.2f} ms")
        print(f"  CPU Time: {res['avg_cpu_sec']*1000:.2f} ms | Peak RSS: {res['peak_rss_mb']} MB")

    # 2. Synthetic Range Tests
    print("\n--- 2. Synthetic Scaling Suite (10, 100, 1000, 5000 files) ---")
    import importlib.util
    spec = importlib.util.spec_from_file_location("benchmark_perf", str(REPO_ROOT / "scripts" / "benchmark-performance.py"))
    bp = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(bp)

    sizes = [10, 100, 1000, 5000]
    for sz in sizes:
        temp_dir = Path(tempfile.mkdtemp(prefix=f"bench_scale_{sz}_"))
        try:
            bp.create_synthetic_repo(sz, temp_dir)
            res = profile_directory(temp_dir, runs=5)
            print(f"\nSynthetic Tier: {sz} files")
            print(f"  Total Bytes: {res['total_bytes'] / 1024:.1f} KB | LOC: {res['total_loc']:,}")
            print(f"  Median Time: {res['median_sec']*1000:.2f} ms | p95 Time: {res['p95_sec']*1000:.2f} ms")
            print(f"  Throughput: {sz / max(0.0001, res['median_sec']):.1f} files/sec | Peak RSS: {res['peak_rss_mb']} MB")
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    print("\n" + "=" * 80)
    print("Profiling Complete.")


if __name__ == "__main__":
    main()
