from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel


class AnomalyResult(BaseModel):
    is_anomaly: bool
    score: float
    threshold: float
    metric_name: str
    service_name: str
    window_start: str | None = None
    window_end: str | None = None
    reason: str
    evidence_summary: dict[str, Any] = {}


class BaseDetector(ABC):
    @abstractmethod
    def fit(self, values: list[float]) -> "BaseDetector":
        pass

    @abstractmethod
    def score(self, values: list[float]) -> AnomalyResult:
        pass
