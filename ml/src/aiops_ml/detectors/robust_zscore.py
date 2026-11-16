import numpy as np
from aiops_ml.detectors.base import AnomalyResult, BaseDetector


class RobustZScoreDetector(BaseDetector):
    """
    Transparent robust anomaly detector using rolling median and Median Absolute Deviation (MAD).
    Robust to outliers and non-normal distributions compared to standard sample mean/std.
    """

    def __init__(
        self,
        threshold: float = 3.5,
        min_samples: int = 10,
        detector_version: str = "robust_zscore_v1.0",
    ):
        self.threshold = threshold
        self.min_samples = min_samples
        self.detector_version = detector_version
        self.median_: float | None = None
        self.mad_: float | None = None

    def fit(self, values: list[float]) -> "RobustZScoreDetector":
        clean_vals = [v for v in values if v is not None and not np.isnan(v)]
        if len(clean_vals) < self.min_samples:
            self.median_ = None
            self.mad_ = None
            return self

        arr = np.array(clean_vals, dtype=float)
        self.median_ = float(np.median(arr))
        # 1.4826 scale factor makes MAD an asymptotically normal estimator for standard deviation
        self.mad_ = float(1.4826 * np.median(np.abs(arr - self.median_)))
        self.mad_ = max(self.mad_, 1e-6)
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
                window_start=window_start,
                window_end=window_end,
                reason="Insufficient data points for robust z-score calculation",
                evidence_summary={
                    "sample_count": len(clean_vals),
                    "min_required": self.min_samples,
                },
            )

        if self.median_ is None or self.mad_ is None:
            self.fit(clean_vals)

        recent_val = clean_vals[-1]
        mad_val = self.mad_ if (self.mad_ and self.mad_ > 1e-6) else 1e-6
        median_val = (
            self.median_ if self.median_ is not None else float(np.median(clean_vals))
        )

        z_score = abs(recent_val - median_val) / mad_val
        is_anomaly = bool(z_score >= self.threshold)

        reason = (
            f"Observed {metric_name} value {recent_val:.2f} deviates {z_score:.2f} MAD units "
            f"from baseline median {median_val:.2f} (threshold: {self.threshold:.1f})"
        )

        return AnomalyResult(
            is_anomaly=is_anomaly,
            score=round(float(z_score), 3),
            threshold=self.threshold,
            metric_name=metric_name,
            service_name=service_name,
            window_start=window_start,
            window_end=window_end,
            reason=reason,
            evidence_summary={
                "observed_value": recent_val,
                "baseline_median": median_val,
                "mad": mad_val,
                "z_score": round(float(z_score), 3),
                "detector": self.detector_version,
            },
        )
