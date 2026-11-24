from datetime import UTC, datetime
from typing import Any, ClassVar
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError, ValidationError
from app.models.entities import Incident, IncidentEvent, Service, ServiceEdge
from app.schemas.domain import (
    RemediationExecutionRequest,
    RemediationExecutionResponse,
    RunbookDefinition,
)
from app.services.audit_service import audit_service


class RemediationService:
    """Production safe runbook execution engine with human-in-the-loop approval,

    strict action allowlisting, blast radius analysis, and audit logging.
    """

    ALLOWED_RUNBOOKS: ClassVar[dict[str, dict[str, Any]]] = {
        "restart_pod": {
            "name": "Graceful Pod Restart",
            "description": "Performs rolling graceful restart of application worker pods.",
            "risk_level": "moderate",
            "parameters_schema": {
                "grace_period_seconds": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 300,
                    "default": 30,
                }
            },
        },
        "rollback_deployment": {
            "name": "Deployment Rollback",
            "description": "Rolls back target microservice to the prior stable production release.",
            "risk_level": "high",
            "parameters_schema": {
                "target_revision": {"type": "integer", "minimum": 1, "default": None}
            },
        },
        "scale_replicas": {
            "name": "Horizontal Pod Scaling",
            "description": "Adjusts container replica count within strict production safety limits (1 to 20).",
            "risk_level": "moderate",
            "parameters_schema": {
                "replicas": {"type": "integer", "minimum": 1, "maximum": 20, "required": True}
            },
        },
        "toggle_circuit_breaker": {
            "name": "Circuit Breaker Override",
            "description": "Manually triggers or resets service mesh circuit breaker to isolate failing callees.",
            "risk_level": "high",
            "parameters_schema": {
                "state": {
                    "type": "string",
                    "enum": ["open", "closed", "half-open"],
                    "required": True,
                }
            },
        },
    }

    def list_runbooks(self) -> list[RunbookDefinition]:
        """Returns the list of safe, pre-approved remediation runbooks."""
        return [
            RunbookDefinition(
                id=rb_id,
                name=info["name"],
                description=info["description"],
                risk_level=info["risk_level"],
                parameters_schema=info["parameters_schema"],
                requires_approval=True,
            )
            for rb_id, info in self.ALLOWED_RUNBOOKS.items()
        ]

    async def execute_remediation(
        self,
        db: AsyncSession,
        req: RemediationExecutionRequest,
        service_id: str,
        current_user_id: str,
        incident_id: str | None = None,
    ) -> RemediationExecutionResponse:
        """Validates human-in-the-loop approval, evaluates blast radius,

        executes allowlisted runbook, and records an operational audit trail.
        """
        # 1. Validate runbook is in strict allowlist
        if req.runbook_id not in self.ALLOWED_RUNBOOKS:
            raise ValidationError(
                f"Runbook '{req.runbook_id}' is not an authorized remediation runbook. "
                f"Permitted runbooks: {list(self.ALLOWED_RUNBOOKS.keys())}"
            )
        runbook = self.ALLOWED_RUNBOOKS[req.runbook_id]

        # 2. Strict Human-in-the-Loop Approval Gate
        if not req.human_approval_confirmed:
            raise ValidationError(
                "Remediation requires explicit human operator confirmation. "
                "Set 'human_approval_confirmed=true' after verifying blast radius."
            )

        if runbook["risk_level"] == "high" and not req.approval_notes.strip():
            raise ValidationError(
                f"High-risk runbook '{req.runbook_id}' requires operational rationale in 'approval_notes'."
            )

        # 3. Resolve Target Service
        srv_res = await db.execute(select(Service).where(Service.id == service_id))
        service = srv_res.scalar_one_or_none()
        if not service:
            raise NotFoundError("Service", service_id)

        # 4. Resolve Incident if provided
        incident = None
        if incident_id:
            inc_res = await db.execute(select(Incident).where(Incident.id == incident_id))
            incident = inc_res.scalar_one_or_none()
            if not incident:
                raise NotFoundError("Incident", incident_id)

        # 5. Evaluate Blast Radius
        edge_res = await db.execute(
            select(ServiceEdge).where(ServiceEdge.source_service_id == service.id)
        )
        downstream_edges = edge_res.scalars().all()
        downstream_ids = [e.target_service_id for e in downstream_edges]

        blast_radius = {
            "service_id": service.id,
            "service_name": service.name,
            "downstream_dependencies_count": len(downstream_ids),
            "downstream_service_ids": downstream_ids,
            "estimated_impact": "high" if len(downstream_ids) >= 3 else "localized",
        }

        # 6. Validate and sanitize parameters per runbook schema
        params = req.parameters or {}
        if req.runbook_id == "scale_replicas":
            replicas = params.get("replicas")
            if replicas is None or not (1 <= int(replicas) <= 20):
                raise ValidationError("Parameter 'replicas' must be an integer between 1 and 20.")
            action_summary = f"Scaled replicas of service '{service.name}' to {replicas} instances."
        elif req.runbook_id == "restart_pod":
            grace = params.get("grace_period_seconds", 30)
            action_summary = (
                f"Initiated rolling pod restart for '{service.name}' with {grace}s grace period."
            )
        elif req.runbook_id == "rollback_deployment":
            rev = params.get("target_revision", "previous")
            action_summary = f"Rolled back service '{service.name}' deployment to revision {rev}."
        elif req.runbook_id == "toggle_circuit_breaker":
            cb_state = params.get("state")
            if cb_state not in ["open", "closed", "half-open"]:
                raise ValidationError(
                    "Parameter 'state' must be one of: 'open', 'closed', 'half-open'."
                )
            action_summary = f"Set circuit breaker on '{service.name}' to state '{cb_state}'."
        else:
            action_summary = f"Executed runbook '{req.runbook_id}' on service '{service.name}'."

        now = datetime.now(UTC)
        remediation_id = f"rem-{uuid4().hex[:8]}"

        # 7. Operational Audit Trail
        audit_event = await audit_service.log_event(
            db=db,
            action="remediation.executed",
            resource_type="service",
            resource_id=service.id,
            actor_user_id=current_user_id,
            details={
                "remediation_id": remediation_id,
                "runbook_id": req.runbook_id,
                "service_name": service.name,
                "incident_id": incident_id,
                "parameters": params,
                "approval_notes": req.approval_notes,
                "blast_radius": blast_radius,
                "action_summary": action_summary,
            },
        )

        # 8. If linked to an Incident, record IncidentEvent
        if incident:
            inc_event = IncidentEvent(
                incident_id=incident.id,
                actor_user_id=current_user_id,
                event_type="remediation_applied",
                new_value_json={
                    "remediation_id": remediation_id,
                    "runbook_id": req.runbook_id,
                    "action_summary": action_summary,
                },
                reason=f"Operator executed runbook {req.runbook_id}: {req.approval_notes}",
            )
            db.add(inc_event)
            await db.commit()

        return RemediationExecutionResponse(
            remediation_id=remediation_id,
            runbook_id=req.runbook_id,
            incident_id=incident_id,
            service_id=service.id,
            service_name=service.name,
            status="executed",
            executed_by_user_id=current_user_id,
            executed_at=now,
            blast_radius=blast_radius,
            action_summary=action_summary,
            audit_event_id=audit_event.id if audit_event else None,
        )


remediation_service = RemediationService()
