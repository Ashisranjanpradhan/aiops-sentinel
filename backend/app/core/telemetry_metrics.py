import time
from typing import Callable

from fastapi import Request, Response
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    Counter,
    Gauge,
    Histogram,
    generate_latest,
)

# Standard Prometheus Metrics
HTTP_REQUESTS_TOTAL = Counter(
    "http_requests_total",
    "Total HTTP requests handled by the application",
    ["method", "endpoint", "status_code"],
)

HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency distribution in seconds",
    ["method", "endpoint"],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 10.0],
)

ACTIVE_DB_CONNECTIONS = Gauge(
    "active_db_connections",
    "Estimated number of active database pool connections in use",
)

TASK_QUEUE_DEPTH = Gauge(
    "task_queue_depth",
    "Current number of pending background tasks in the durable queue",
    ["queue_name"],
)

ASSESSMENT_RUNS_TOTAL = Counter(
    "assessment_runs_total",
    "Total codebase production-readiness assessments processed",
    ["status"],
)

INCIDENTS_ACTIVE_GAUGE = Gauge(
    "incidents_active_count",
    "Number of active (open or investigating) production incidents",
)


def get_prometheus_metrics_response() -> Response:
    """Generates the standard Prometheus exposition format response."""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


async def prometheus_metrics_middleware(request: Request, call_next: Callable) -> Response:
    """Measures request latency and counts requests by route and status code."""
    # Skip measuring /metrics endpoint itself to avoid probe skew
    if request.url.path in ["/metrics", "/api/v1/metrics"]:
        return await call_next(request)

    start_time = time.perf_counter()
    status_code = 500

    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    finally:
        duration = time.perf_counter() - start_time
        # Normalize path pattern if available (e.g. /api/v1/incidents)
        path = request.url.path
        # Group dynamic UUIDs/hashes to avoid cardinality explosion
        parts = path.split("/")
        normalized_parts = []
        for part in parts:
            if len(part) >= 20 or (len(part) > 8 and any(c.isdigit() for c in part) and any(c.isalpha() for c in part)):
                normalized_parts.append(":id")
            else:
                normalized_parts.append(part)
        normalized_path = "/".join(normalized_parts) or "/"

        HTTP_REQUESTS_TOTAL.labels(
            method=request.method,
            endpoint=normalized_path,
            status_code=str(status_code),
        ).inc()

        HTTP_REQUEST_DURATION_SECONDS.labels(
            method=request.method,
            endpoint=normalized_path,
        ).observe(duration)
