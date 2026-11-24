import numpy as np


def compute_rca_metrics(
    predictions: list[list[str]],
    ground_truth: list[str],
    case_ids: list[str] | None = None,
) -> dict:
    """
    Compute standard Root Cause Analysis evaluation metrics:
    - Top-1 Accuracy (Hit@1)
    - Top-3 Accuracy (Hit@3)
    - Top-5 Accuracy (Hit@5)
    - Mean Reciprocal Rank (MRR)
    - Mean Rank
    - Per-case breakdown
    """
    if not predictions or not ground_truth or len(predictions) != len(ground_truth):
        return {
            "top_1_accuracy": 0.0,
            "top_3_accuracy": 0.0,
            "top_5_accuracy": 0.0,
            "mrr": 0.0,
            "mean_rank": 0.0,
            "sample_count": 0,
            "cases": [],
        }

    total = len(ground_truth)
    hits_at_1 = 0
    hits_at_3 = 0
    hits_at_5 = 0
    reciprocal_ranks = []
    ranks = []
    case_results = []

    for i, (ranked_candidates, true_cause) in enumerate(zip(predictions, ground_truth)):
        cid = case_ids[i] if case_ids and i < len(case_ids) else f"case_{i + 1:04d}"
        if not ranked_candidates:
            reciprocal_ranks.append(0.0)
            ranks.append(float(len(ranked_candidates) + 1))
            case_results.append(
                {
                    "case_id": cid,
                    "true_cause": true_cause,
                    "predicted_top_1": None,
                    "rank": None,
                    "reciprocal_rank": 0.0,
                    "hit_1": False,
                    "hit_3": False,
                }
            )
            continue

        pred_top_1 = ranked_candidates[0]
        is_hit_1 = pred_top_1 == true_cause
        is_hit_3 = true_cause in ranked_candidates[:3]
        is_hit_5 = true_cause in ranked_candidates[:5]

        if is_hit_1:
            hits_at_1 += 1
        if is_hit_3:
            hits_at_3 += 1
        if is_hit_5:
            hits_at_5 += 1

        try:
            rank = ranked_candidates.index(true_cause) + 1
            rr = 1.0 / rank
            reciprocal_ranks.append(rr)
            ranks.append(float(rank))
        except ValueError:
            rank = len(ranked_candidates) + 1
            rr = 0.0
            reciprocal_ranks.append(0.0)
            ranks.append(float(rank))

        case_results.append(
            {
                "case_id": cid,
                "true_cause": true_cause,
                "predicted_top_1": pred_top_1,
                "rank": rank,
                "reciprocal_rank": round(rr, 4),
                "hit_1": is_hit_1,
                "hit_3": is_hit_3,
            }
        )

    return {
        "top_1_accuracy": round(hits_at_1 / total, 4),
        "top_3_accuracy": round(hits_at_3 / total, 4),
        "top_5_accuracy": round(hits_at_5 / total, 4),
        "mrr": round(float(np.mean(reciprocal_ranks)), 4),
        "mean_rank": round(float(np.mean(ranks)), 2),
        "sample_count": total,
        "cases": case_results,
    }


def compute_anomaly_metrics(y_true: list[int], y_pred: list[int]) -> dict[str, float]:
    """Compute precision, recall, F1 score, false positive rate, and specificity for anomaly detection."""
    if len(y_true) != len(y_pred) or not y_true:
        return {
            "precision": 0.0,
            "recall": 0.0,
            "f1": 0.0,
            "false_positive_rate": 0.0,
            "specificity": 0.0,
            "tp": 0,
            "fp": 0,
            "tn": 0,
            "fn": 0,
        }

    tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 1 and yp == 1)
    fp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 0 and yp == 1)
    fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 1 and yp == 0)
    tn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 0 and yp == 0)

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (
        (2 * precision * recall) / (precision + recall)
        if (precision + recall) > 0
        else 0.0
    )
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0

    return {
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "false_positive_rate": round(fpr, 4),
        "specificity": round(specificity, 4),
        "tp": tp,
        "fp": fp,
        "tn": tn,
        "fn": fn,
    }
