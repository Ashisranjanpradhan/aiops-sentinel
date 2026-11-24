#!/usr/bin/env python3
"""
Research reproducibility, ablation, and per-case validation script for AIOps Sentinel.
Evaluates across seeds 42, 123, and 999.
"""

import json
import math
import os
import random
import sys
import time
from pathlib import Path

# Add backend and ml paths
REPO_ROOT = Path("/Users/ashisranjanpradhan/Documents/AIops_sentinel")
sys.path.insert(0, str(REPO_ROOT / "backend"))
sys.path.insert(0, str(REPO_ROOT / "ml" / "src"))

from aiops_ml.detectors.ewma import EWMADetector
from aiops_ml.detectors.isolation_forest import IsolationForestDetector
from aiops_ml.detectors.robust_zscore import RobustZScoreDetector
from aiops_ml.evaluation.metrics import compute_anomaly_metrics, compute_rca_metrics

ML_DATA_DIR = REPO_ROOT / "ml" / "data"

SEEDS = [42, 123, 999]


def load_dataset_and_split(seed: int):
    dataset_file = ML_DATA_DIR / "rcaeval" / f"rcaeval_benchmark_seed{seed}.json"
    manifest_file = ML_DATA_DIR / "manifests" / f"rcaeval_split_seed{seed}.json"

    with open(dataset_file) as f:
        episodes = json.load(f)
    with open(manifest_file) as f:
        manifest = json.load(f)

    test_ids = set(manifest["splits"]["test"])
    test_episodes = [e for e in episodes if e["case_id"] in test_ids]
    return test_episodes, manifest


def evaluate_pipeline(model_type: str, test_episodes: list, seed: int, ablation_mode: str = "full"):
    """
    ablation_mode:
    - 'full': Hybrid (detector score * temporal boost)
    - 'no_temporal': Detector score only
    - 'temporal_only': First anomaly onset step only
    """
    rng = random.Random(seed)
    y_true = []
    y_pred = []
    rca_predictions = []
    rca_ground_truth = []
    case_ids = []

    for ep in test_episodes:
        case_id = ep["case_id"]
        root_cause = ep["root_cause_service"]
        case_ids.append(case_id)
        rca_ground_truth.append(root_cause)

        service_scores = {}

        for s_name, series in ep["telemetry"].items():
            err_values = [p["error_rate"] for p in series]
            labels = [p["is_anomalous"] for p in series]

            if model_type == "random":
                for l in labels:
                    y_true.append(l)
                    y_pred.append(1 if rng.random() < 0.15 else 0)
                service_scores[s_name] = rng.random()

            elif model_type == "heuristic":
                for err, label in zip(err_values, labels):
                    y_true.append(label)
                    y_pred.append(1 if err > 0.05 else 0)
                service_scores[s_name] = max(err_values)

            else:
                if model_type == "ewma":
                    detector = EWMADetector(alpha=0.3, threshold=2.5)
                elif model_type == "zscore":
                    detector = RobustZScoreDetector(threshold=3.0)
                elif model_type == "isolation_forest":
                    detector = IsolationForestDetector(contamination=0.05, random_state=seed)

                # Fit on baseline 30%
                baseline_len = max(10, int(len(err_values) * 0.3))
                detector.fit(err_values[:baseline_len])

                max_score = 0.0
                first_anomaly_idx = len(series)

                for step_idx in range(len(series)):
                    window = err_values[max(0, step_idx - 20) : step_idx + 1]
                    res = detector.score(window)
                    y_true.append(labels[step_idx])
                    y_pred.append(1 if res.is_anomaly else 0)
                    if res.is_anomaly and step_idx < first_anomaly_idx:
                        first_anomaly_idx = step_idx
                    max_score = max(max_score, res.score)

                if ablation_mode == "no_temporal":
                    service_scores[s_name] = max_score
                elif ablation_mode == "temporal_only":
                    # Earlier onset -> higher score
                    service_scores[s_name] = float(len(series) - first_anomaly_idx)
                else:  # full hybrid
                    temporal_boost = 1.0 + max(0.0, (len(series) - first_anomaly_idx) / max(1, len(series)) * 0.25)
                    service_scores[s_name] = max_score * temporal_boost

        ranked = sorted(service_scores.keys(), key=lambda s: service_scores[s], reverse=True)
        rca_predictions.append(ranked)

    anomaly_m = compute_anomaly_metrics(y_true, y_pred)
    rca_m = compute_rca_metrics(rca_predictions, rca_ground_truth, case_ids)

    return {
        "anomaly": anomaly_m,
        "rca": rca_m,
        "predictions": rca_predictions,
        "ground_truth": rca_ground_truth,
        "case_ids": case_ids,
    }


def main():
    models = ["random", "heuristic", "zscore", "ewma", "isolation_forest"]
    results = {}

    print("=" * 80)
    print("AIOps Sentinel Multi-Seed Research Reproduction Matrix (Seeds 42, 123, 999)")
    print("=" * 80)

    for m in models:
        results[m] = {}
        for seed in SEEDS:
            test_episodes, _ = load_dataset_and_split(seed)
            res = evaluate_pipeline(m, test_episodes, seed, ablation_mode="full")
            results[m][seed] = res

    # Print summary table
    print(f"\n{'Model':<20} | {'Seed':<5} | {'Prec':<7} | {'Recall':<7} | {'F1':<7} | {'FPR':<7} | {'Hit@1':<7} | {'Hit@3':<7} | {'MRR':<7} | {'MeanRank':<8}")
    print("-" * 92)

    for m in models:
        for seed in SEEDS:
            an = results[m][seed]["anomaly"]
            rc = results[m][seed]["rca"]
            print(f"{m:<20} | {seed:<5} | {an['precision']:<7.4f} | {an['recall']:<7.4f} | {an['f1']:<7.4f} | {an['false_positive_rate']:<7.4f} | {rc['top_1_accuracy']:<7.4f} | {rc['top_3_accuracy']:<7.4f} | {rc['mrr']:<7.4f} | {rc['mean_rank']:<8.2f}")

    # Compute Aggregate Stats (Mean, Std, 95% CI)
    print("\n" + "=" * 80)
    print("Aggregate Statistics Across Seeds (Mean ± Std, 95% Confidence Interval)")
    print("=" * 80)
    for m in models:
        f1_vals = [results[m][s]["anomaly"]["f1"] for s in SEEDS]
        hit1_vals = [results[m][s]["rca"]["top_1_accuracy"] for s in SEEDS]
        hit3_vals = [results[m][s]["rca"]["top_3_accuracy"] for s in SEEDS]
        mrr_vals = [results[m][s]["rca"]["mrr"] for s in SEEDS]
        rank_vals = [results[m][s]["rca"]["mean_rank"] for s in SEEDS]

        def stats(vals):
            mean = sum(vals) / len(vals)
            variance = sum((x - mean) ** 2 for x in vals) / (len(vals) - 1) if len(vals) > 1 else 0
            std = math.sqrt(variance)
            ci95 = 1.96 * (std / math.sqrt(len(vals)))
            return mean, std, ci95

        m_f1, s_f1, ci_f1 = stats(f1_vals)
        m_h1, s_h1, ci_h1 = stats(hit1_vals)
        m_h3, s_h3, ci_h3 = stats(hit3_vals)
        m_mrr, s_mrr, ci_mrr = stats(mrr_vals)
        m_rk, s_rk, ci_rk = stats(rank_vals)

        print(f"\nModel: {m.upper()}")
        print(f"  F1 Score:     {m_f1:.4f} ± {s_f1:.4f}  (95% CI: [{m_f1 - ci_f1:.4f}, {m_f1 + ci_f1:.4f}])")
        print(f"  Hit@1 (Top1): {m_h1:.4f} ± {s_h1:.4f}  (95% CI: [{m_h1 - ci_h1:.4f}, {m_h1 + ci_h1:.4f}])")
        print(f"  Hit@3 (Top3): {m_h3:.4f} ± {s_h3:.4f}  (95% CI: [{m_h3 - ci_h3:.4f}, {m_h3 + ci_h3:.4f}])")
        print(f"  MRR:          {m_mrr:.4f} ± {s_mrr:.4f}  (95% CI: [{m_mrr - ci_mrr:.4f}, {m_mrr + ci_mrr:.4f}])")
        print(f"  Mean Rank:    {m_rk:.2f} ± {s_rk:.2f}")

    # Ablation Study on Isolation Forest
    print("\n" + "=" * 80)
    print("Ablation Study: Isolation Forest & Temporal Lead-Time Decomposition")
    print("=" * 80)
    ablation_modes = ["no_temporal", "temporal_only", "full"]
    ablation_results = {mode: [] for mode in ablation_modes}

    for mode in ablation_modes:
        print(f"\nMode: {mode}")
        for seed in SEEDS:
            test_episodes, _ = load_dataset_and_split(seed)
            res = evaluate_pipeline("isolation_forest", test_episodes, seed, ablation_mode=mode)
            rc = res["rca"]
            ablation_results[mode].append(rc)
            print(f"  Seed {seed}: Hit@1={rc['top_1_accuracy']:.4f}, Hit@3={rc['top_3_accuracy']:.4f}, MRR={rc['mrr']:.4f}, MeanRank={rc['mean_rank']:.2f}")

    print("\n--- Ablation Comparison Summary (Means across 3 seeds) ---")
    for mode in ablation_modes:
        h1 = sum(r["top_1_accuracy"] for r in ablation_results[mode]) / 3
        h3 = sum(r["top_3_accuracy"] for r in ablation_results[mode]) / 3
        mrr = sum(r["mrr"] for r in ablation_results[mode]) / 3
        mrk = sum(r["mean_rank"] for r in ablation_results[mode]) / 3
        print(f"  {mode:<15}: Hit@1 = {h1:.4f} | Hit@3 = {h3:.4f} | MRR = {mrr:.4f} | Mean Rank = {mrk:.2f}")

    # Save detailed case results for report
    case_log = {}
    for seed in SEEDS:
        case_log[seed] = results["isolation_forest"][seed]["rca"]["cases"]
    with open(REPO_ROOT / "ml" / "artifacts" / "reproducibility_case_audit.json", "w") as f:
        json.dump(case_log, f, indent=2)
    print("\nSaved detailed per-case audit log -> ml/artifacts/reproducibility_case_audit.json")


if __name__ == "__main__":
    main()
