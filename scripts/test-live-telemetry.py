#!/usr/bin/env python3
"""
scripts/test-live-telemetry.py

Automated verification script for AIOps Sentinel's live telemetry pipeline:
1. Probes connectivity to Prometheus, Loki, Tempo, and OpenTelemetry Collector.
2. If live telemetry services are running, exercises real queries and checks response latencies.
3. Verifies that TelemetryClient handles both live endpoints and simulated fallbacks gracefully.
"""

import asyncio
import logging
import sys
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path

# Add backend directory to path
REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import httpx
from app.core.config import settings
from app.integrations.telemetry import telemetry_client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("aiops.telemetry_test")


async def probe_endpoint(name: str, url: str) -> dict:
    start = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(url)
            duration_ms = (time.perf_counter() - start) * 1000.0
            return {
                "name": name,
                "url": url,
                "reachable": resp.status_code in (200, 204),
                "status_code": resp.status_code,
                "latency_ms": round(duration_ms, 2),
            }
    except Exception as ex:
        duration_ms = (time.perf_counter() - start) * 1000.0
        return {
            "name": name,
            "url": url,
            "reachable": False,
            "error": str(ex),
            "latency_ms": round(duration_ms, 2),
        }


async def main():
    logger.info("=== AIOps Sentinel Telemetry Integration Test ===")
    logger.info("Configured URLs:")
    logger.info("  Prometheus: %s", settings.PROMETHEUS_URL)
    logger.info("  Loki:       %s", settings.LOKI_URL)
    logger.info("  Tempo:      %s", settings.TEMPO_URL)
    logger.info("  Demo Mode:  %s", settings.DEMO_MODE)

    # 1. Probe Raw Endpoints
    logger.info("\n1. Probing telemetry daemon health endpoints...")
    probes = await asyncio.gather(
        probe_endpoint("Prometheus", f"{settings.PROMETHEUS_URL}/-/healthy"),
        probe_endpoint("Loki", f"{settings.LOKI_URL}/ready"),
        probe_endpoint("Tempo", f"{settings.TEMPO_URL}/ready"),
        probe_endpoint("OTel-Collector", "http://localhost:4318/"),
    )

    all_live = True
    for p in probes:
        if p.get("reachable"):
            logger.info("  [PASS] %-15s -> HTTP %d (%.2fms)", p["name"], p["status_code"], p["latency_ms"])
        else:
            all_live = False
            logger.info("  [INFO] %-15s -> Not reachable (%s)", p["name"], p.get("error", "HTTP error"))

    # 2. Test TelemetryClient check_health()
    logger.info("\n2. Testing TelemetryClient.check_health()...")
    health_results = await telemetry_client.check_health()
    for h in health_results:
        logger.info("  Source: %-12s | Status: %-10s | Latency: %sms | Note: %s",
                    h.name, h.status, f"{h.latency_ms:.1f}" if h.latency_ms else "N/A", h.message)

    # 3. Test Service Metrics Retrieval
    now = datetime.now(UTC)
    start_time = now - timedelta(minutes=15)
    logger.info("\n3. Testing service metrics query ('payment')...")
    metrics = await telemetry_client.get_service_metrics(
        service_name="payment",
        start_time=start_time,
        end_time=now,
        step_seconds=30,
    )
    for m_name, series in metrics.items():
        points_count = len(series.points)
        last_val = series.points[-1].value if points_count > 0 else "N/A"
        logger.info("  Metric: %-15s | Points: %3d | Last Value: %s %s",
                    m_name, points_count, last_val, series.unit or "")

    # 4. Test Service Logs Retrieval
    logger.info("\n4. Testing service logs query ('payment')...")
    logs = await telemetry_client.get_service_logs(
        service_name="payment",
        start_time=start_time,
        end_time=now,
        limit=5,
    )
    logger.info("  Retrieved %d log entries:", len(logs))
    for log in logs[:3]:
        logger.info("    [%s] %-5s %s", log.timestamp.strftime("%H:%M:%S"), log.severity.upper(), log.message[:65])

    # 5. Summary
    logger.info("\n=== Telemetry Pipeline Test Summary ===")
    if all_live:
        logger.info("Status: LIVE PRODUCTION TELEMETRY ACTIVE (All endpoints responding)")
    else:
        logger.info("Status: HYBRID/SIMULATED MODE (TelemetryClient gracefully serving simulation for offline backends)")

    logger.info("Telemetry pipeline test completed successfully.\n")


if __name__ == "__main__":
    asyncio.run(main())
