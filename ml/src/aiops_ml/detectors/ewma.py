import numpy as np
from aiops_ml.detectors.base import AnomalyResult, BaseDetector


class EWMADetector(BaseDetector):
    """
    Exponentially Weighted Moving Average (EWMA) detector for shift detection in streaming time-series.
    """

    def __init__(
        self,
        alpha: float = 0.2,
        threshold: float = 3.0,
        min_samples: int = 10,
        detector_version: str = "ewma_v1.0",
    ):
        self.alpha = alpha
        self.threshold = threshold
        self.min_samples = min_samples
        self.detector_version = detector_version
        self.mean_: float | None = None
        self.std_: float | None = None

    def fit(self, values: list[float]) -> "EWMADetector":
        clean_vals = [v for v in values if v is not None and not np.isnan(v)]
        if len(clean_vals) < self.min_samples:
            return self
        arr = np.array(clean_vals, dtype=float)
        self.mean_ = float(np.mean(arr))
        self.std_ = float(np.std(arr))
        self.std_ = max(self.std_, 1e-6)
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
                threshold=self.threshold,
                metric_name=metric_name,
                service_name=service_name,
                reason="Insufficient data points for EWMA",
                evidence_summary={},
            )

        # Compute EWMA series
        ewma_val = clean_vals[0]
        for v in clean_vals[1:]:
            ewma_val = self.alpha * v + (1.0 - self.alpha) * ewma_val

        mean = self.mean_ if self.mean_ is not None else float(np.mean(clean_vals))
        std = (
            self.std_
            if self.std_ is not None and self.std_ > 1e-6
            else float(np.std(clean_vals)) or 1.0
        )

        # Control limit factor
        sigma_ewma = std * np.sqrt(self.alpha / (2.0 - self.alpha))
        sigma_ewma = max(sigma_ewma, 1e-6)

        diff = abs(ewma_val - mean)
        score = diff / sigma_ewma
        is_anomaly = bool(score >= self.threshold)

        return AnomalyResult(
            is_anomaly=is_anomaly,
            score=round(float(score), 3),
            threshold=self.threshold,
            metric_name=metric_name,
            service_name=service_name,
            window_start=window_start,
            window_end=window_end,
            reason=f"EWMA current level {ewma_val:.2f} deviates {score:.2f} sigma from historical mean {mean:.2f}",
            evidence_summary={
                "ewma_level": ewma_val,
                "historical_mean": mean,
                "sigma": sigma_ewma,
            },
        )
