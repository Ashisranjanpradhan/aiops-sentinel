import pytest

from app.core.config import settings
from app.core.errors import ValidationError
from app.integrations.telemetry import (
    TelemetryClient,
    is_simulation_allowed,
    validate_telemetry_url,
)


def test_telemetry_ssrf_validation():
    # Valid external/internal http(s) endpoints
    validate_telemetry_url("http://prometheus:9090")
    validate_telemetry_url("https://metrics.company.com/api/v1")

    # Invalid schemes
    with pytest.raises(ValidationError, match="Invalid telemetry URL scheme"):
        validate_telemetry_url("file:///etc/passwd")

    with pytest.raises(ValidationError, match="Invalid telemetry URL scheme"):
        validate_telemetry_url("ftp://ftp.example.com")

    # Cloud metadata SSRF targets
    with pytest.raises(ValidationError, match="Prohibited telemetry target hostname"):
        validate_telemetry_url("http://169.254.169.254/latest/meta-data/")

    with pytest.raises(ValidationError, match="Prohibited telemetry target hostname"):
        validate_telemetry_url("http://metadata.google.internal/computeMetadata/v1/")


def test_simulation_allowed_only_in_demo_mode():
    original_env = settings.APP_ENV
    original_demo = settings.DEMO_MODE

    try:
        # In production, simulation MUST be disallowed
        settings.APP_ENV = "production"
        settings.DEMO_MODE = False
        assert is_simulation_allowed() is False

        # In development with DEMO_MODE=True, simulation is permitted
        settings.APP_ENV = "development"
        settings.DEMO_MODE = True
        assert is_simulation_allowed() is True

        # In development with DEMO_MODE=False, simulation is disallowed
        settings.DEMO_MODE = False
        assert is_simulation_allowed() is False
    finally:
        settings.APP_ENV = original_env
        settings.DEMO_MODE = original_demo


@pytest.mark.asyncio
async def test_production_telemetry_truthfulness_no_fabrication():
    original_env = settings.APP_ENV
    original_demo = settings.DEMO_MODE
    client = TelemetryClient()

    try:
        settings.APP_ENV = "production"
        settings.DEMO_MODE = False

        # Check health: since local Prometheus is not running, must be "unavailable", NEVER "simulated"
        health = await client.check_health()
        for source in health:
            assert source.status == "unavailable"
            assert "simulated" not in source.status.lower()

        # Metrics: must return empty dict, NEVER synthetic numbers
        from datetime import UTC, datetime

        now = datetime.now(UTC)
        metrics = await client.get_service_metrics("checkout", now, now)
        assert metrics == {}

        # Logs: must return empty list
        logs = await client.get_service_logs("checkout", now, now)
        assert logs == []

        # Traces: must return empty list
        traces = await client.get_service_traces("checkout", now, now)
        assert traces == []
    finally:
        settings.APP_ENV = original_env
        settings.DEMO_MODE = original_demo
