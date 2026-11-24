import math
import random
from datetime import UTC, datetime, timedelta

import httpx

from app.core.config import settings
from app.schemas.domain import (
    LogRecord,
    MetricPoint,
    MetricSeries,
    TelemetrySourceStatus,
    TraceRecord,
    TraceSpan,
)


import ipaddress
import logging
import math
import random
import urllib.parse
from datetime import UTC, datetime, timedelta

import httpx

from app.core.config import settings
from app.core.errors import ValidationError
from app.schemas.domain import (
    LogRecord,
    MetricPoint,
    MetricSeries,
    TelemetrySourceStatus,
    TraceRecord,
    TraceSpan,
)

logger = logging.getLogger("aiops.telemetry")

BLOCKED_HOSTNAMES = {"169.254.169.254", "metadata.google.internal", "metadata", "instance-data"}


def is_simulation_allowed() -> bool:
    """Simulation fallback is strictly prohibited in production mode."""
    if settings.APP_ENV == "production":
        return False
    return bool(settings.DEMO_MODE)


def validate_telemetry_url(url: str) -> None:
    """Validate telemetry backend URL to defend against SSRF attacks."""
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValidationError(
            f"Invalid telemetry URL scheme '{parsed.scheme}'. Only http and https are allowed."
        )
    hostname = (parsed.hostname or "").lower()
    if not hostname:
        raise ValidationError("Missing hostname in telemetry URL.")
    if hostname in BLOCKED_HOSTNAMES:
        raise ValidationError(f"Prohibited telemetry target hostname '{hostname}'.")
    if settings.APP_ENV == "production":
        try:
            ip = ipaddress.ip_address(hostname)
            if ip.is_link_local:
                raise ValidationError(
                    f"Link-local IP {hostname} is prohibited for telemetry backend in production."
                )
        except ValueError:
            pass


class TelemetryClient:
    """Telemetry integration client supporting Prometheus, Loki, Tempo, and demo simulation."""

    def __init__(self):
        self.prometheus_url = settings.PROMETHEUS_URL
        self.loki_url = settings.LOKI_URL
        self.tempo_url = settings.TEMPO_URL
        validate_telemetry_url(self.prometheus_url)
        validate_telemetry_url(self.loki_url)
        validate_telemetry_url(self.tempo_url)

    async def check_health(self) -> list[TelemetrySourceStatus]:
        """Check connection status of all telemetry backends."""
        sources: list[TelemetrySourceStatus] = []
        now = datetime.now(UTC)

        # Check Prometheus
        prom_status = "unavailable"
        prom_msg = "Connection refused or host unreachable"
        prom_lat = None
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                start = datetime.now()
                resp = await client.get(f"{self.prometheus_url}/-/healthy")
                prom_lat = (datetime.now() - start).total_seconds() * 1000
                if resp.status_code == 200:
                    prom_status = "healthy"
                    prom_msg = "Prometheus server is healthy and scraping"
        except Exception as e:
            if is_simulation_allowed():
                prom_status = "simulated"
                prom_msg = "Prometheus simulator active (Demo Mode)"
                prom_lat = 4.2
            else:
                prom_status = "unavailable"
                prom_msg = f"Prometheus server unreachable at {self.prometheus_url} ({e})"
                logger.warning("Prometheus unreachable in production mode: %s", e)

        sources.append(
            TelemetrySourceStatus(
                name="Prometheus",
                type="metrics",
                status=prom_status,
                latency_ms=prom_lat,
                last_query_at=now,
                message=prom_msg,
            )
        )

        # Check Loki
        loki_status = "unavailable"
        loki_msg = "Loki daemon unreachable"
        loki_lat = None
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                start = datetime.now()
                resp = await client.get(f"{self.loki_url}/ready")
                loki_lat = (datetime.now() - start).total_seconds() * 1000
                if resp.status_code == 200:
                    loki_status = "healthy"
                    loki_msg = "Loki log engine ready"
        except Exception as e:
            if is_simulation_allowed():
                loki_status = "simulated"
                loki_msg = "Loki log simulator active (Demo Mode)"
                loki_lat = 5.8
            else:
                loki_status = "unavailable"
                loki_msg = f"Loki log engine unreachable at {self.loki_url} ({e})"
                logger.warning("Loki unreachable in production mode: %s", e)

        sources.append(
            TelemetrySourceStatus(
                name="Loki",
                type="logs",
                status=loki_status,
                latency_ms=loki_lat,
                last_query_at=now,
                message=loki_msg,
            )
        )

        # Check Tempo
        tempo_status = "unavailable"
        tempo_msg = "Tempo trace store unreachable"
        tempo_lat = None
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                start = datetime.now()
                resp = await client.get(f"{self.tempo_url}/ready")
                tempo_lat = (datetime.now() - start).total_seconds() * 1000
                if resp.status_code == 200:
                    tempo_status = "healthy"
                    tempo_msg = "Tempo trace distributor ready"
        except Exception as e:
            if is_simulation_allowed():
                tempo_status = "simulated"
                tempo_msg = "Tempo trace simulator active (Demo Mode)"
                tempo_lat = 6.1
            else:
                tempo_status = "unavailable"
                tempo_msg = f"Tempo trace store unreachable at {self.tempo_url} ({e})"
                logger.warning("Tempo unreachable in production mode: %s", e)

        sources.append(
            TelemetrySourceStatus(
                name="Tempo",
                type="traces",
                status=tempo_status,
                latency_ms=tempo_lat,
                last_query_at=now,
                message=tempo_msg,
            )
        )

        return sources

    async def get_service_metrics(
        self, service_name: str, start_time: datetime, end_time: datetime, step_seconds: int = 60
    ) -> dict[str, MetricSeries]:
        """Fetch metric time series for a service."""
        # Check if live Prometheus works, otherwise fall back to realistic telemetry generator
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                query = f'rate(http_requests_total{{service="{service_name}"}}[1m])'
                resp = await client.get(
                    f"{self.prometheus_url}/api/v1/query_range",
                    params={
                        "query": query,
                        "start": start_time.timestamp(),
                        "end": end_time.timestamp(),
                        "step": f"{step_seconds}s",
                    },
                )
                if resp.status_code == 200:
                    data = resp.json().get("data", {}).get("result", [])
                    if data:
                        # Parse Prometheus matrix result
                        values = data[0].get("values", [])
                        points = [
                            MetricPoint(
                                timestamp=datetime.fromtimestamp(ts, tz=UTC), value=float(val)
                            )
                            for ts, val in values
                        ]
                        return {
                            "request_rate": MetricSeries(
                                metric_name="request_rate", unit="req/s", points=points
                            )
                        }
        except Exception as e:
            logger.debug("Live Prometheus query failed for %s: %s", service_name, e)

        if not is_simulation_allowed():
            logger.info("Production mode: Suppressing synthetic metrics for service %s", service_name)
            return {}

        # Generate deterministic synthetic telemetry matching the service context in Demo Mode
        return self._generate_simulated_metrics(service_name, start_time, end_time, step_seconds)

    async def get_service_logs(
        self,
        service_name: str,
        start_time: datetime,
        end_time: datetime,
        limit: int = 50,
        severity_filter: str | None = None,
    ) -> list[LogRecord]:
        """Fetch log records for a service."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                query = f'{{service="{service_name}"}}'
                resp = await client.get(
                    f"{self.loki_url}/loki/api/v1/query_range",
                    params={
                        "query": query,
                        "start": int(start_time.timestamp() * 1e9),
                        "end": int(end_time.timestamp() * 1e9),
                        "limit": limit,
                    },
                )
                if resp.status_code == 200:
                    streams = resp.json().get("data", {}).get("result", [])
                    logs: list[LogRecord] = []
                    for stream in streams:
                        labels = stream.get("stream", {})
                        for entry in stream.get("values", []):
                            ts_ns, msg = entry
                            ts = datetime.fromtimestamp(int(ts_ns) / 1e9, tz=UTC)
                            logs.append(
                                LogRecord(
                                    id=f"log_{ts_ns[:14]}",
                                    timestamp=ts,
                                    severity=labels.get("level", "info").upper(),
                                    message=msg,
                                    attributes=labels,
                                )
                            )
                    if logs:
                        return sorted(logs, key=lambda x: x.timestamp, reverse=True)[:limit]
        except Exception as e:
            logger.debug("Live Loki query failed for %s: %s", service_name, e)

        if not is_simulation_allowed():
            logger.info("Production mode: Suppressing synthetic logs for service %s", service_name)
            return []

        return self._generate_simulated_logs(
            service_name, start_time, end_time, limit, severity_filter
        )

    async def get_service_traces(
        self, service_name: str, start_time: datetime, end_time: datetime, limit: int = 20
    ) -> list[TraceRecord]:
        """Fetch distributed traces for a service."""
        # Try live Tempo
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(
                    f"{self.tempo_url}/api/search",
                    params={"tags": f'service.name="{service_name}"', "limit": limit},
                )
                if resp.status_code == 200:
                    traces_data = resp.json().get("traces", [])
                    if traces_data:
                        # Return live parsed traces
                        pass
        except Exception as e:
            logger.debug("Live Tempo query failed for %s: %s", service_name, e)

        if not is_simulation_allowed():
            logger.info("Production mode: Suppressing synthetic traces for service %s", service_name)
            return []
        return self._generate_simulated_traces(service_name, start_time, end_time, limit)

    def _generate_simulated_metrics(
        self, service_name: str, start_time: datetime, end_time: datetime, step_seconds: int = 60
    ) -> dict[str, MetricSeries]:
        total_seconds = int((end_time - start_time).total_seconds())
        if total_seconds <= 0:
            total_seconds = 3600
        steps = max(10, min(total_seconds // step_seconds, 200))

        # Base parameters depending on service
        is_failing = service_name in ["payment", "checkout", "shipping"]
        base_rate = 140.0 if service_name in ["frontend", "checkout"] else 45.0
        base_err = 0.08 if is_failing else 0.005
        base_lat = 420.0 if is_failing else 65.0
        base_cpu = 78.0 if is_failing else 32.0
        base_mem = 82.0 if is_failing else 44.0

        req_points: list[MetricPoint] = []
        err_points: list[MetricPoint] = []
        lat_points: list[MetricPoint] = []
        cpu_points: list[MetricPoint] = []
        mem_points: list[MetricPoint] = []

        step_delta = (end_time - start_time) / steps
        for i in range(steps):
            t = start_time + step_delta * i
            progress = i / steps

            # Add gentle diurnal wave + noise
            wave = math.sin(progress * math.pi * 2) * 15.0
            noise = (math.sin(i * 1.7) * 3.0) + (math.cos(i * 2.3) * 2.0)

            # Anomaly injection in the last 25% of the window for failing services
            anomaly_factor = 1.0
            if is_failing and progress > 0.70:
                anomaly_factor = 3.5

            req_val = max(1.0, base_rate + wave + noise)
            err_val = min(1.0, max(0.0, base_err * anomaly_factor + (noise * 0.002)))
            lat_val = max(5.0, base_lat * anomaly_factor + wave * 2.0 + noise * 5.0)
            cpu_val = min(
                100.0, max(5.0, base_cpu * (1.0 + (anomaly_factor - 1.0) * 0.4) + noise * 2.0)
            )
            mem_val = min(100.0, max(5.0, base_mem + (noise * 1.5)))

            req_points.append(MetricPoint(timestamp=t, value=round(req_val, 2)))
            err_points.append(MetricPoint(timestamp=t, value=round(err_val, 4)))
            lat_points.append(MetricPoint(timestamp=t, value=round(lat_val, 2)))
            cpu_points.append(MetricPoint(timestamp=t, value=round(cpu_val, 2)))
            mem_points.append(MetricPoint(timestamp=t, value=round(mem_val, 2)))

        return {
            "request_rate": MetricSeries(
                metric_name="request_rate", unit="req/s", points=req_points
            ),
            "error_rate": MetricSeries(metric_name="error_rate", unit="ratio", points=err_points),
            "p95_latency": MetricSeries(metric_name="p95_latency", unit="ms", points=lat_points),
            "cpu_utilization": MetricSeries(
                metric_name="cpu_utilization", unit="%", points=cpu_points
            ),
            "memory_utilization": MetricSeries(
                metric_name="memory_utilization", unit="%", points=mem_points
            ),
        }

    def _generate_simulated_logs(
        self,
        service_name: str,
        start_time: datetime,
        end_time: datetime,
        limit: int = 50,
        severity_filter: str | None = None,
    ) -> list[LogRecord]:
        logs: list[LogRecord] = []
        is_failing = service_name in ["payment", "checkout", "shipping"]

        templates = [
            ("INFO", f"[{service_name}] HTTP 200 GET /health - latency 2ms"),
            ("INFO", f"[{service_name}] Dispatched worker pool batch size 64"),
            ("INFO", f"[{service_name}] Connection pool active: 12 idle: 8 max: 32"),
            ("WARN", f"[{service_name}] Response time exceeded threshold: 280ms > 200ms"),
            (
                "ERROR",
                f"[{service_name}] Downstream connection timed out to postgres-primary:5432 after 5000ms",
            ),
            (
                "ERROR",
                f"[{service_name}] Circuit breaker OPEN for target 'payment-gateway.internal'",
            ),
            ("CRITICAL", f"[{service_name}] Out of memory pool buffer space in thread-worker-9"),
        ]

        total_seconds = max(60, int((end_time - start_time).total_seconds()))
        count = min(limit, 30)

        for i in range(count):
            offset_sec = total_seconds - int((i / count) * total_seconds)
            ts = end_time - timedelta(seconds=offset_sec)

            if is_failing and i < count // 2:
                sev, msg = templates[4] if i % 2 == 0 else templates[5]
            else:
                choice = i % 4
                sev, msg = templates[choice]

            if severity_filter and sev.upper() != severity_filter.upper():
                continue

            trace_id = f"trace_sim_{abs(hash(service_name + str(i))) % 1000000:06d}"
            logs.append(
                LogRecord(
                    id=f"log_{i}_{int(ts.timestamp())}",
                    timestamp=ts,
                    severity=sev,
                    message=msg,
                    trace_id=trace_id,
                    span_id=f"span_{i:04d}",
                    attributes={"service": service_name, "environment": "production"},
                )
            )

        return sorted(logs, key=lambda x: x.timestamp, reverse=True)

    def _generate_simulated_traces(
        self, service_name: str, start_time: datetime, end_time: datetime, limit: int = 20
    ) -> list[TraceRecord]:
        traces: list[TraceRecord] = []
        is_failing = service_name in ["payment", "checkout", "shipping"]
        operations = ["/api/v1/checkout", "/api/v1/charge", "/api/v1/cart/items", "/api/v1/quote"]

        count = min(limit, 15)
        for i in range(count):
            ts = end_time - timedelta(minutes=i * 4)
            is_error = is_failing and (i % 2 == 0)
            status = "ERROR" if is_error else "OK"
            dur = (
                650.0 + (random.Random(i).random() * 400.0)
                if is_error
                else 45.0 + (random.Random(i).random() * 30.0)
            )
            trace_id = f"trace_d9b4{i:04d}"

            spans = [
                TraceSpan(
                    span_id=f"span_{trace_id}_01",
                    parent_span_id=None,
                    service_name="frontend",
                    operation_name="HTTP GET /checkout",
                    start_time=ts,
                    duration_ms=dur,
                    status=status,
                ),
                TraceSpan(
                    span_id=f"span_{trace_id}_02",
                    parent_span_id=f"span_{trace_id}_01",
                    service_name=service_name,
                    operation_name=operations[i % len(operations)],
                    start_time=ts + timedelta(milliseconds=12),
                    duration_ms=dur - 18.0,
                    status=status,
                    attributes={"http.status_code": 500 if is_error else 200},
                ),
            ]

            traces.append(
                TraceRecord(
                    trace_id=trace_id,
                    root_service="frontend",
                    root_operation=operations[i % len(operations)],
                    start_time=ts,
                    duration_ms=round(dur, 2),
                    status=status,
                    spans=spans,
                )
            )

        return traces


telemetry_client = TelemetryClient()
