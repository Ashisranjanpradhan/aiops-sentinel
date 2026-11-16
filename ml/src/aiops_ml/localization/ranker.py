from typing import Any

from aiops_ml.topology.graph import ServiceDependencyGraph
from pydantic import BaseModel


class CandidateScore(BaseModel):
    service_id: str
    service_name: str
    rank: int
    score: float
    calibrated_confidence: float | None
    candidate_indicator: str
    explanation: str
    evidence_ids: list[str]


class RootCauseRanker:
    """
    Ranks candidate root cause services using multi-modal evidence (metric deviations,
    error logs, trace latency/failures) combined with topological dependency distance.
    """

    def __init__(
        self, abstention_threshold: float = 0.25, version: str = "rca-ranker-v1.0"
    ):
        self.abstention_threshold = abstention_threshold
        self.version = version

    def rank_candidates(
        self,
        primary_service_id: str,
        service_names_map: dict[str, str],
        evidence_list: list[dict[str, Any]],
        topology_graph: ServiceDependencyGraph,
    ) -> list[CandidateScore]:
        if not evidence_list:
            # Handle abstention / insufficient evidence explicitly
            primary_name = service_names_map.get(primary_service_id, "Unknown service")
            return [
                CandidateScore(
                    service_id=primary_service_id,
                    service_name=primary_name,
                    rank=1,
                    score=0.1,
                    calibrated_confidence=None,
                    candidate_indicator="insufficient_evidence",
                    explanation="Insufficient telemetry evidence captured during the incident window to reliably localize root cause. Recommend collecting more metrics/traces.",
                    evidence_ids=[],
                )
            ]

        # Accumulate evidence scores per service
        service_scores: dict[str, float] = {}
        service_reasons: dict[str, list[str]] = {}
        service_evidence_ids: dict[str, list[str]] = {}
        service_indicators: dict[str, str] = {}

        for ev in evidence_list:
            s_id = ev.get("service_id") or primary_service_id
            ev_id = ev.get("id", "ev_unknown")
            ev_type = ev.get("evidence_type", "metric")
            summary = ev.get("summary_json", {})

            weight = 1.0
            indicator = "anomaly"
            desc = "Observed telemetry anomaly"

            if ev_type == "metric":
                z = summary.get("z_score", 3.0)
                weight = min(5.0, z / 2.0)
                indicator = summary.get("metric_name", "metric_spike")
                desc = f"Metric '{indicator}' had anomalous deviation ({z:.1f} MAD)"
            elif ev_type == "log":
                sev = summary.get("severity", "ERROR")
                weight = 3.5 if sev in ["CRITICAL", "ERROR"] else 1.5
                indicator = "error_log_burst"
                desc = f"Severe log messages recorded: '{summary.get('message', '')[:60]}...'"
            elif ev_type == "trace":
                weight = 4.0 if summary.get("status") == "ERROR" else 2.0
                indicator = "trace_error_or_timeout"
                desc = f"Trace duration {summary.get('duration_ms', 0):.0f}ms marked {summary.get('status', 'ERROR')}"
            elif ev_type == "deployment":
                weight = 3.0
                indicator = "recent_deployment"
                desc = f"Recent deployment occurred {summary.get('deployment_id', '')}"

            service_scores[s_id] = service_scores.get(s_id, 0.0) + weight
            service_reasons.setdefault(s_id, []).append(desc)
            service_evidence_ids.setdefault(s_id, []).append(ev_id)
            service_indicators[s_id] = indicator

        # Incorporate topology distance from the primary impacted service
        for s_id in list(service_scores.keys()):
            if s_id != primary_service_id:
                dist = topology_graph.shortest_path_distance(primary_service_id, s_id)
                if dist is not None:
                    # Direct downstream dependency carries higher causal likelihood
                    service_scores[s_id] *= 1.0 + 1.0 / (dist + 1)
                else:
                    # Check upstream
                    up_dist = topology_graph.shortest_path_distance(
                        s_id, primary_service_id
                    )
                    if up_dist is not None:
                        service_scores[s_id] *= 1.0 + 0.5 / (up_dist + 1)

        # Normalize scores
        max_score = max(service_scores.values()) if service_scores else 1.0
        sorted_services = sorted(
            service_scores.items(), key=lambda x: x[1], reverse=True
        )

        candidates: list[CandidateScore] = []
        for rank, (s_id, raw_sc) in enumerate(sorted_services[:5], start=1):
            norm_score = round(min(1.0, raw_sc / (max_score + 1e-6)), 3)
            # Calibrated confidence heuristic
            confidence = round(float(norm_score * 0.92), 2)
            name = service_names_map.get(s_id, f"Service-{s_id[:8]}")
            reasons = service_reasons.get(s_id, ["Anomalous behavior observed"])
            explanation = (
                f"Candidate ranked #{rank} because of strong multi-source indicators: "
                f"{'; '.join(reasons[:2])}. Correlated with topology calls to {service_names_map.get(primary_service_id, 'impacted service')}."
            )

            candidates.append(
                CandidateScore(
                    service_id=s_id,
                    service_name=name,
                    rank=rank,
                    score=norm_score,
                    calibrated_confidence=confidence,
                    candidate_indicator=service_indicators.get(s_id, "telemetry_spike"),
                    explanation=explanation,
                    evidence_ids=service_evidence_ids.get(s_id, []),
                )
            )

        return candidates
