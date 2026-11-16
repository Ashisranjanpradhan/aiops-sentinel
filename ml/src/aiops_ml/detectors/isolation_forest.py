import numpy as np
from aiops_ml.detectors.base import AnomalyResult, BaseDetector
from sklearn.ensemble import IsolationForest


class IsolationForestDetector(BaseDetector):
    """
    Unsupervised multivariate anomaly detector using Isolation Forest.
    """

    def __init__(
        self,
        contamination: float = 0.05,
        random_state: int = 42,
        min_samples: int = 15,
        detector_version: str = "isolation_forest_v1.0",
    ):
        self.contamination = contamination
        self.random_state = random_state
        self.min_samples = min_samples
        self.detector_version = detector_version
        self.model = IsolationForest(
            contamination=self.contamination,
            random_state=self.random_state,
            n_estimators=100,
        )
        self.is_fitted = False

    def fit(self, values: list[float]) -> "IsolationForestDetector":
        clean_vals = [v for v in values if v is not None and not np.isnan(v)]
        if len(clean_vals) < self.min_samples:
            return self
        X = np.array(clean_vals).reshape(-1, 1)
        self.model.fit(X)
        self.is_fitted = True
        return self

    def score(
        self,
        values: list[float],
        service_name: str = "service",
        metric_name: str = "metric",
        window_start: str | None = None,
        window_end: str | None = None,
    ) -> AnomalyResult:
        clean_vals = [v for v in values if v is not None and not np.isnan(v)]
        if len(clean_vals) < self.min_samples:
            return AnomalyResult(
                is_anomaly=False,
                score=0.0,
                threshold=0.5,
                metric_name=metric_name,
                service_name=service_name,
                reason="Insufficient data points for Isolation Forest",
                evidence_summary={},
            )

        if not self.is_fitted:
            self.fit(clean_vals)

        recent_val = clean_vals[-1]
        x_recent = np.array([[recent_val]])
        raw_scores = self.model.decision_function(x_recent)
        recent_raw = float(raw_scores[0])
        # In sklearn, decision_function < 0 indicates anomaly.
        normalized_score = float(max(0.0, min(1.0, 0.5 - recent_raw)))
        preds = self.model.predict(x_recent)
        is_anomaly = bool(preds[0] == -1 or recent_raw < 0.0)

        return AnomalyResult(
            is_anomaly=is_anomaly,
            score=round(normalized_score, 3),
            threshold=0.5,
            metric_name=metric_name,
            service_name=service_name,
            window_start=window_start,
            window_end=window_end,
            reason=f"Isolation forest anomaly score {normalized_score:.3f} (prediction: {'anomalous' if is_anomaly else 'normal'})",
            evidence_summary={
                "decision_score": recent_raw,
                "contamination": self.contamination,
            },
        )
