import pytest

from app.core.errors import ValidationError
from app.db.session import AsyncSessionLocal
from app.models.entities import Service, gen_uuid
from app.schemas.domain import RemediationExecutionRequest
from app.services.remediation_service import remediation_service


@pytest.mark.asyncio
async def test_remediation_list_runbooks():
    runbooks = remediation_service.list_runbooks()
    ids = [r.id for r in runbooks]
    assert "restart_pod" in ids
    assert "rollback_deployment" in ids
    assert "scale_replicas" in ids
    assert "toggle_circuit_breaker" in ids
    assert all(r.requires_approval for r in runbooks)


@pytest.mark.asyncio
async def test_remediation_rejects_unauthorized_runbook():
    async with AsyncSessionLocal() as db_session:
        srv_id = gen_uuid()
        srv = Service(
            id=srv_id,
            name=f"test-remediation-{srv_id[:6]}",
            environment="production",
            health_status="healthy",
        )
        db_session.add(srv)
        await db_session.commit()

        req = RemediationExecutionRequest(
            runbook_id="arbitrary_bash_command",
            human_approval_confirmed=True,
            approval_notes="malicious command",
        )
        with pytest.raises(ValidationError, match="not an authorized remediation runbook"):
            await remediation_service.execute_remediation(
                db=db_session,
                req=req,
                service_id=srv.id,
                current_user_id="user-123",
            )


@pytest.mark.asyncio
async def test_remediation_requires_human_approval():
    async with AsyncSessionLocal() as db_session:
        srv_id = gen_uuid()
        srv = Service(
            id=srv_id,
            name=f"test-remediation-{srv_id[:6]}",
            environment="production",
            health_status="healthy",
        )
        db_session.add(srv)
        await db_session.commit()

        req = RemediationExecutionRequest(
            runbook_id="restart_pod",
            human_approval_confirmed=False,  # Unconfirmed
        )
        with pytest.raises(ValidationError, match="requires explicit human operator confirmation"):
            await remediation_service.execute_remediation(
                db=db_session,
                req=req,
                service_id=srv.id,
                current_user_id="user-123",
            )


@pytest.mark.asyncio
async def test_remediation_requires_approval_notes_for_high_risk():
    async with AsyncSessionLocal() as db_session:
        srv_id = gen_uuid()
        srv = Service(
            id=srv_id,
            name=f"test-remediation-{srv_id[:6]}",
            environment="production",
            health_status="healthy",
        )
        db_session.add(srv)
        await db_session.commit()

        req = RemediationExecutionRequest(
            runbook_id="rollback_deployment",
            human_approval_confirmed=True,
            approval_notes="",  # Empty notes on high-risk runbook
        )
        with pytest.raises(ValidationError, match="requires operational rationale"):
            await remediation_service.execute_remediation(
                db=db_session,
                req=req,
                service_id=srv.id,
                current_user_id="user-123",
            )


@pytest.mark.asyncio
async def test_remediation_parameter_validation():
    async with AsyncSessionLocal() as db_session:
        srv_id = gen_uuid()
        srv = Service(
            id=srv_id,
            name=f"test-remediation-{srv_id[:6]}",
            environment="production",
            health_status="healthy",
        )
        db_session.add(srv)
        await db_session.commit()

        # Scale replicas out of bounds (> 20)
        req = RemediationExecutionRequest(
            runbook_id="scale_replicas",
            parameters={"replicas": 50},
            human_approval_confirmed=True,
            approval_notes="Scale up urgently",
        )
        with pytest.raises(ValidationError, match="between 1 and 20"):
            await remediation_service.execute_remediation(
                db=db_session,
                req=req,
                service_id=srv.id,
                current_user_id="user-123",
            )


@pytest.mark.asyncio
async def test_remediation_successful_execution():
    async with AsyncSessionLocal() as db_session:
        srv_id = gen_uuid()
        srv = Service(
            id=srv_id,
            name=f"payment-gateway-{srv_id[:6]}",
            environment="production",
            health_status="healthy",
        )
        db_session.add(srv)
        await db_session.commit()

        req = RemediationExecutionRequest(
            runbook_id="scale_replicas",
            parameters={"replicas": 5},
            human_approval_confirmed=True,
            approval_notes="Scaling payment-gateway pods to absorb transaction spike",
        )
        res = await remediation_service.execute_remediation(
            db=db_session,
            req=req,
            service_id=srv.id,
            current_user_id="user-operator-1",
        )
        assert res.status == "executed"
        assert res.runbook_id == "scale_replicas"
        assert f"Scaled replicas of service '{srv.name}' to 5 instances." in res.action_summary
        assert res.blast_radius["service_id"] == srv.id
        assert res.audit_event_id is not None
