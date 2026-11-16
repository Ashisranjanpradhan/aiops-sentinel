from aiops_ml.detectors.ewma import EWMADetector
from aiops_ml.detectors.isolation_forest import IsolationForestDetector
from aiops_ml.detectors.robust_zscore import RobustZScoreDetector
from aiops_ml.evaluation.metrics import compute_anomaly_metrics, compute_rca_metrics
from aiops_ml.topology.graph import ServiceDependencyGraph


def test_robust_zscore_normal_series():
    detector = RobustZScoreDetector(threshold=3.5, min_samples=10)
    normal_series = [10.0, 10.2, 9.8, 10.1, 10.3, 9.9, 10.0, 10.1, 9.7, 10.2]
    res = detector.score(normal_series)
    assert res.is_anomaly is False
    assert res.score < 3.5


def test_robust_zscore_spike_anomaly():
    detector = RobustZScoreDetector(threshold=3.5, min_samples=10)
    series_with_spike = [10.0, 10.1, 9.9, 10.0, 10.2, 9.8, 10.1, 10.0, 9.9, 10.1, 55.0]
    res = detector.score(series_with_spike)
    assert res.is_anomaly is True
    assert res.score > 3.5
    assert "deviates" in res.reason


def test_ewma_shift_detection():
    detector = EWMADetector(alpha=0.3, threshold=2.5, min_samples=10)
    baseline = [50.0] * 15
    detector.fit(baseline)
    shifted_series = [50.0] * 10 + [95.0, 98.0, 102.0]
    res = detector.score(shifted_series)
    assert res.is_anomaly is True
    assert res.score > 2.5


def test_isolation_forest_detector():
    detector = IsolationForestDetector(contamination=0.05, min_samples=15)
    data = [20.0 + (i * 0.4) for i in range(30)]
    detector.fit(data)
    normal_res = detector.score(data + [25.0])
    assert normal_res.is_anomaly is False

    anom_res = detector.score(data + [150.0])
    assert anom_res.is_anomaly is True


def test_rca_evaluation_metrics():
    predictions = [
        ["payment", "checkout", "shipping"],
        ["auth", "payment", "cart"],
        ["shipping", "currency", "cart"],
        ["email", "recommendation", "ad"],
    ]
    ground_truth = ["payment", "payment", "cart", "unrelated"]

    metrics = compute_rca_metrics(predictions, ground_truth)
    assert metrics["sample_count"] == 4
    # Case 1: rank 1 (hit@1, hit@3, 1/1)
    # Case 2: rank 2 (hit@3, 1/2)
    # Case 3: rank 3 (hit@3, 1/3)
    # Case 4: not found (0)
    assert metrics["top_1_accuracy"] == 0.25  # 1/4
    assert metrics["top_3_accuracy"] == 0.75  # 3/4
    expected_mrr = (1.0 + 0.5 + (1.0 / 3.0) + 0.0) / 4.0
    assert abs(metrics["mrr"] - expected_mrr) < 1e-3


def test_anomaly_classification_metrics():
    y_true = [0, 0, 1, 1, 0, 1]
    y_pred = [0, 0, 1, 0, 0, 1]
    m = compute_anomaly_metrics(y_true, y_pred)
    assert m["precision"] == 1.0  # 2 TP, 0 FP
    assert abs(m["recall"] - 2 / 3) < 1e-3  # 2 TP, 1 FN
    assert m["f1"] > 0.0


def test_topology_graph_paths():
    g = ServiceDependencyGraph()
    g.add_service("s1", "frontend")
    g.add_service("s2", "checkout")
    g.add_service("s3", "payment")
    g.add_edge("s1", "s2")
    g.add_edge("s2", "s3")

    assert g.get_downstream_services("s1") == ["s2"]
    assert g.get_upstream_services("s3") == ["s2"]
    assert g.shortest_path_distance("s1", "s3") == 2
    assert g.shortest_path_distance("s3", "s1") is None
