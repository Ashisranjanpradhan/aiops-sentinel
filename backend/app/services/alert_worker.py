import asyncio
import logging
import os
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.integrations.telemetry import telemetry_client
from app.models.entities import (
    AlertRule,
    Incident,
    IncidentEvent,
    IncidentEvidence,
    Service,
    gen_uuid,
    utcnow,
)

logger = logging.getLogger("aiops.alert_worker")


def evaluate_condition(current_value: float, operator: str, threshold: float) -> bool:
    """Evaluate numeric condition against threshold."""
    if operator == ">":
        return current_value > threshold
    elif operator == ">=":
        return current_value >= threshold
    elif operator == "<":
        return current_value < threshold
    elif operator == "<=":
        return current_value <= threshold
    elif operator in ("==", "="):
        return abs(current_value - threshold) < 1e-6
    elif operator in ("!=", "<>"):
        return abs(current_value - threshold) >= 1e-6
    return False


class DistributedAdvisoryLock:
    """
    Production-grade distributed advisory lock.
    Supports PostgreSQL session-level advisory locking (pg_try_advisory_lock)
    for multi-container/Kubernetes clusters with automatic release on connection drop,
    and fcntl.flock file locking fallback for single-host SQLite development.
    """

    def __init__(self, lock_id: int = 424242, lock_path: str = "/tmp/aiops_sentinel_worker.lock"):
        self.lock_id = lock_id
        self.lock_path = lock_path
        self._is_postgres = "postgresql" in settings.DATABASE_URL.lower()
        self._file_fp = None
        self._acquired = False

    async def acquire(self, db_session: AsyncSession | None = None) -> bool:
        if self._is_postgres and db_session:
            try:
                res = await db_session.execute(text(f"SELECT pg_try_advisory_lock({self.lock_id})"))
                locked = res.scalar()
                self._acquired = bool(locked)
                return self._acquired
            except Exception as e:
                logger.warning("PostgreSQL advisory lock query failed: %s", e)
                return False
        else:
            # File-based locking for SQLite single-host dev
            try:
                import fcntl

                self._file_fp = open(self.lock_path, "w")
                fcntl.flock(self._file_fp, fcntl.LOCK_EX | fcntl.LOCK_NB)
                self._file_fp.write(f"{os.getpid()}\n")
                self._file_fp.flush()
                self._acquired = True
                return True
            except Exception:
                self._acquired = False
                return False

    async def release(self, db_session: AsyncSession | None = None) -> None:
        if self._is_postgres and db_session and self._acquired:
            try:
                await db_session.execute(text(f"SELECT pg_advisory_unlock({self.lock_id})"))
            except Exception as e:
                logger.warning("Error unlocking PostgreSQL advisory lock: %s", e)
        if self._file_fp:
            try:
                import fcntl

                fcntl.flock(self._file_fp, fcntl.LOCK_UN)
                self._file_fp.close()
                if os.path.exists(self.lock_path):
                    os.unlink(self.lock_path)
            except Exception:
                pass
            self._file_fp = None
        self._acquired = False


class AlertEvaluatorWorker:
    """Background worker that periodically evaluates active alert rules against live or simulated telemetry."""

    def __init__(self, cooldown_seconds: int = 180) -> None:
        self._running = False
        self._task: asyncio.Task[None] | None = None
        self._firing_incidents: dict[tuple[str, str], str] = {}  # (rule_id, service_id) -> incident_id
        self._cooldown_tracker: dict[tuple[str, str], datetime] = {}
        self.cooldown_seconds = cooldown_seconds

    @property
    def is_running(self) -> bool:
        return self._running

    def start(self, interval_seconds: int = 15) -> None:
        """Start the background alert evaluation loop."""
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._run_loop(interval_seconds))
        logger.info("AlertEvaluatorWorker started with interval %ds", interval_seconds)

    async def stop(self) -> None:
        """Stop the background alert evaluation loop gracefully."""
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self._task = None
        logger.info("AlertEvaluatorWorker stopped")

    async def _run_loop(self, interval_seconds: int) -> None:
        while self._running:
            try:
                async with AsyncSessionLocal() as db:
                    await self.evaluate_once(db)
            except asyncio.CancelledError:
                break
            except Exception:
                logger.exception("Error during alert evaluation cycle")

            try:
                await asyncio.sleep(interval_seconds)
            except asyncio.CancelledError:
                break

    async def evaluate_once(self, db: AsyncSession) -> list[dict[str, Any]]:
        """Run a single evaluation pass across all enabled alert rules."""
        rules_res = await db.execute(select(AlertRule).where(AlertRule.is_enabled.is_(True)))
        rules = rules_res.scalars().all()
        results: list[dict[str, Any]] = []

        for rule in rules:
            rule_results = await self._evaluate_rule(db, rule)
            results.extend(rule_results)

        await db.commit()
        return results

    async def _evaluate_rule(self, db: AsyncSession, rule: AlertRule) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
        cond = rule.condition_json or {}
        metric_name = cond.get("metric", "error_rate")
        operator = cond.get("operator", ">")
        threshold = float(cond.get("threshold", 0.0))

        # Determine services in scope
        scope = rule.service_scope_json or []
        query = select(Service)
        if scope and "*" not in scope:
            query = query.where(Service.name.in_(scope) | Service.id.in_(scope))
        services_res = await db.execute(query)
        services = services_res.scalars().all()

        now = datetime.now(UTC)
        for service in services:
            # Extract metric value: check recent telemetry points or metadata fallback
            current_value = await self._get_service_metric_value(service, metric_name, now)
            if current_value is None:
                continue

            breached = evaluate_condition(current_value, operator, threshold)
            pair_key = (rule.id, service.id)

            if breached:
                incident_id = await self._handle_breach(
                    db, rule, service, metric_name, operator, threshold, current_value, pair_key
                )
                results.append(
                    {
                        "rule_id": rule.id,
                        "rule_name": rule.name,
                        "service_id": service.id,
                        "service_name": service.name,
                        "status": "firing",
                        "metric": metric_name,
                        "value": current_value,
                        "threshold": threshold,
                        "incident_id": incident_id,
                    }
                )
            else:
                # If previously firing, resolve
                if pair_key in self._firing_incidents:
                    await self._handle_recovery(
                        db, rule, service, metric_name, current_value, pair_key
                    )
                    results.append(
                        {
                            "rule_id": rule.id,
                            "rule_name": rule.name,
                            "service_id": service.id,
                            "service_name": service.name,
                            "status": "resolved",
                            "metric": metric_name,
                            "value": current_value,
                            "threshold": threshold,
                        }
                    )

        return results

    async def _get_service_metric_value(
        self, service: Service, metric_name: str, now: datetime
    ) -> float | None:
        """Fetch the most recent metric value for a service."""
        # Check service metadata first for explicit state override
        meta = service.metadata_json or {}
        if metric_name in meta:
            try:
                return float(meta[metric_name])
            except (ValueError, TypeError):
                pass

        if metric_name in ("p95_latency", "p95_latency_ms") and "p95_latency_ms" in meta:
            try:
                return float(meta["p95_latency_ms"])
            except (ValueError, TypeError):
                pass

        # Query telemetry client
        try:
            metrics_dict = await telemetry_client.get_service_metrics(
                service_name=service.name,
                start_time=now - timedelta(minutes=5),
                end_time=now,
                step_seconds=30,
            )
            if metric_name in metrics_dict and metrics_dict[metric_name].points:
                return metrics_dict[metric_name].points[-1].value
        except Exception as e:
            logger.debug("Failed to fetch metric %s from telemetry_client: %s", metric_name, e)

        if metric_name == "error_rate":
            return float(meta.get("error_rate", 0.005))
        elif metric_name in ("p95_latency", "p95_latency_ms"):
            return float(meta.get("p95_latency_ms", 45.0))
        elif metric_name == "request_rate":
            return float(meta.get("request_rate", 85.0))
        return None

    async def _handle_breach(
        self,
        db: AsyncSession,
        rule: AlertRule,
        service: Service,
        metric_name: str,
        operator: str,
        threshold: float,
        current_value: float,
        pair_key: tuple[str, str],
    ) -> str:
        """Handle a breached condition: deduplicate or create new incident."""
        existing_incident_id = self._firing_incidents.get(pair_key)

        # Check if active incident already exists in DB
        if existing_incident_id:
            inc_res = await db.execute(
                select(Incident).where(
                    Incident.id == existing_incident_id,
                    Incident.status.in_(["open", "investigating"]),
                )
            )
            incident = inc_res.scalar_one_or_none()
            if incident:
                incident.last_seen_at = utcnow()
                return incident.id

        # Search DB for open incident created by this rule on this service
        query = select(Incident).where(
            Incident.primary_service_id == service.id,
            Incident.status.in_(["open", "investigating"]),
            Incident.title.ilike(f"%{rule.name}%"),
        )
        existing_db_inc = (await db.execute(query)).scalar_one_or_none()
        if existing_db_inc:
            existing_db_inc.last_seen_at = utcnow()
            self._firing_incidents[pair_key] = existing_db_inc.id
            return existing_db_inc.id

        # Check flapping cooldown before creating a new incident
        now_dt = datetime.now(UTC)
        if pair_key in self._cooldown_tracker:
            last_event_time = self._cooldown_tracker[pair_key]
            elapsed = (now_dt - last_event_time).total_seconds()
            if elapsed < self.cooldown_seconds:
                logger.info(
                    "Alert breach suppressed for rule %s on service %s due to active cooldown (%.1fs remaining)",
                    rule.name,
                    service.name,
                    self.cooldown_seconds - elapsed,
                )
                return "cooldown_suppressed"

        self._cooldown_tracker[pair_key] = now_dt

        # Create new incident
        incident_id = gen_uuid()
        incident = Incident(
            id=incident_id,
            title=f"Alert: {rule.name} breached on {service.name}",
            description=(
                f"Alert rule '{rule.name}' triggered on service '{service.name}'. "
                f"Metric '{metric_name}' is {current_value:.4f}, which violates condition '{operator} {threshold}'."
            ),
            severity=rule.severity,
            status="open",
            primary_service_id=service.id,
            detector_name=f"alert_rule_{rule.id[:8]}",
            detector_version="1.0.0",
            confidence=0.95,
            source="live" if not settings.DEMO_MODE else "demo",
            detected_at=utcnow(),
            last_seen_at=utcnow(),
        )
        db.add(incident)

        # Add event
        event = IncidentEvent(
            incident_id=incident_id,
            event_type="alert_triggered",
            new_value_json={
                "rule_id": rule.id,
                "rule_name": rule.name,
                "metric": metric_name,
                "value": current_value,
                "threshold": threshold,
                "operator": operator,
            },
            reason=f"Alert condition {operator} {threshold} met with value {current_value:.4f}",
        )
        db.add(event)

        # Add evidence
        evidence = IncidentEvidence(
            incident_id=incident_id,
            evidence_type="metric",
            service_id=service.id,
            source_reference=f"alert_rule:{rule.id}",
            time_start=utcnow() - timedelta(minutes=2),
            time_end=utcnow(),
            summary_json={
                "metric_name": metric_name,
                "trigger_value": current_value,
                "threshold": threshold,
                "operator": operator,
            },
        )
        db.add(evidence)

        # Update service health
        if rule.severity == "critical":
            service.health_status = "critical"
        elif rule.severity == "high" and service.health_status != "critical":
            service.health_status = "warning"

        self._firing_incidents[pair_key] = incident_id
        logger.warning(
            "Incident %s created for alert rule %s on service %s",
            incident_id,
            rule.name,
            service.name,
        )
        return incident_id

    async def _handle_recovery(
        self,
        db: AsyncSession,
        rule: AlertRule,
        service: Service,
        metric_name: str,
        current_value: float,
        pair_key: tuple[str, str],
    ) -> None:
        """Handle recovery when metric returns to normal."""
        incident_id = self._firing_incidents.pop(pair_key, None)
        if not incident_id:
            return

        inc_res = await db.execute(select(Incident).where(Incident.id == incident_id))
        incident = inc_res.scalar_one_or_none()
        if incident and incident.status in ("open", "investigating"):
            incident.status = "resolved"
            incident.resolved_at = utcnow()
            event = IncidentEvent(
                incident_id=incident.id,
                event_type="alert_cleared",
                new_value_json={"metric": metric_name, "value": current_value},
                reason=f"Metric returned within thresholds (current: {current_value:.4f}). Auto-resolved.",
            )
            db.add(event)

            # Check if other open incidents exist on this service
            other_inc_count_res = await db.execute(
                select(func.count(Incident.id)).where(
                    Incident.primary_service_id == service.id,
                    Incident.status.in_(["open", "investigating"]),
                    Incident.id != incident.id,
                )
            )
            other_active = other_inc_count_res.scalar_one()
            if other_active == 0:
                service.health_status = "healthy"

        self._cooldown_tracker[pair_key] = datetime.now(UTC)
        logger.info("Alert %s on service %s recovered and resolved", rule.name, service.name)


alert_evaluator_worker = AlertEvaluatorWorker()
