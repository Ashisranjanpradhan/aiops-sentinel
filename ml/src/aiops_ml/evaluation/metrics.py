import numpy as np


def compute_rca_metrics(
    predictions: list[list[str]], ground_truth: list[str]
) -> dict[str, float]:
    """
    Compute standard Root Cause Analysis evaluation metrics:
    - Top-1 Accuracy (Hit@1)
    - Top-3 Accuracy (Hit@3)
    - Top-5 Accuracy (Hit@5)
    - Mean Reciprocal Rank (MRR)
    """
    if not predictions or not ground_truth or len(predictions) != len(ground_truth):
        return {
            "top_1_accuracy": 0.0,
            "top_3_accuracy": 0.0,
            "top_5_accuracy": 0.0,
            "mrr": 0.0,
            "sample_count": 0,
        }

    total = len(ground_truth)
    hits_at_1 = 0
    hits_at_3 = 0
    hits_at_5 = 0
    reciprocal_ranks = []

    for ranked_candidates, true_cause in zip(predictions, ground_truth):
        if not ranked_candidates:
            reciprocal_ranks.append(0.0)
            continue

        if ranked_candidates[0] == true_cause:
            hits_at_1 += 1
        if true_cause in ranked_candidates[:3]:
            hits_at_3 += 1
        if true_cause in ranked_candidates[:5]:
            hits_at_5 += 1

        try:
            rank = ranked_candidates.index(true_cause) + 1
            reciprocal_ranks.append(1.0 / rank)
        except ValueError:
            reciprocal_ranks.append(0.0)

    return {
        "top_1_accuracy": round(hits_at_1 / total, 4),
        "top_3_accuracy": round(hits_at_3 / total, 4),
        "top_5_accuracy": round(hits_at_5 / total, 4),
        "mrr": round(float(np.mean(reciprocal_ranks)), 4),
        "sample_count": total,
    }


def compute_anomaly_metrics(y_true: list[int], y_pred: list[int]) -> dict[str, float]:
    """Compute precision, recall, and F1 score for anomaly detection."""
    if len(y_true) != len(y_pred) or not y_true:
        return {"precision": 0.0, "recall": 0.0, "f1": 0.0}

    tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 1 and yp == 1)
    fp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 0 and yp == 1)
    fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 1 and yp == 0)

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (
        (2 * precision * recall) / (precision + recall)
        if (precision + recall) > 0
        else 0.0
    )

    return {
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
    }
