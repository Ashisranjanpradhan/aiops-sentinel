import uuid
from datetime import UTC, datetime
from typing import Any, Optional

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def utcnow() -> datetime:
    return datetime.now(UTC)


def gen_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="analyst", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class Service(Base):
    __tablename__ = "services"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    environment: Mapped[str] = mapped_column(
        String(50), default="production", index=True, nullable=False
    )
    namespace: Mapped[str] = mapped_column(String(50), default="default", nullable=False)
    health_status: Mapped[str] = mapped_column(
        String(20), default="healthy", index=True, nullable=False
    )
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)

    incidents: Mapped[list["Incident"]] = relationship("Incident", back_populates="primary_service")


class ServiceEdge(Base):
    __tablename__ = "service_edges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    source_service_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("services.id"), nullable=False
    )
    target_service_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("services.id"), nullable=False
    )
    relationship_type: Mapped[str] = mapped_column(String(50), default="calls", nullable=False)
    observed_calls: Mapped[int] = mapped_column(Integer, default=0)
    error_rate: Mapped[float] = mapped_column(Float, default=0.0)
    latency_summary_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    observed_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    observed_to: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    provenance: Mapped[str] = mapped_column(String(50), default="trace-derived")


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    severity: Mapped[str] = mapped_column(String(20), default="high", index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="open", index=True, nullable=False)
    primary_service_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("services.id"), nullable=False
    )
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True
    )
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    detector_name: Mapped[str] = mapped_column(String(100), default="robust_zscore")
    detector_version: Mapped[str] = mapped_column(String(50), default="1.0.0")
    model_run_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    assigned_to_user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    source: Mapped[str] = mapped_column(String(50), default="demo")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    primary_service: Mapped["Service"] = relationship("Service", back_populates="incidents")
    assigned_user: Mapped[Optional["User"]] = relationship("User")
    evidence: Mapped[list["IncidentEvidence"]] = relationship(
        "IncidentEvidence", back_populates="incident", cascade="all, delete-orphan"
    )
    events: Mapped[list["IncidentEvent"]] = relationship(
        "IncidentEvent", back_populates="incident", cascade="all, delete-orphan"
    )
    investigations: Mapped[list["InvestigationJob"]] = relationship(
        "InvestigationJob", back_populates="incident", cascade="all, delete-orphan"
    )


class IncidentEvidence(Base):
    __tablename__ = "incident_evidence"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    incident_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("incidents.id"), index=True, nullable=False
    )
    evidence_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # metric, log, trace, note, deployment
    service_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("services.id"), nullable=True
    )
    source_reference: Mapped[str] = mapped_column(String(255), default="")
    time_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    time_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    summary_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    incident: Mapped["Incident"] = relationship("Incident", back_populates="evidence")


class IncidentEvent(Base):
    __tablename__ = "incident_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    incident_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("incidents.id"), index=True, nullable=False
    )
    actor_user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    previous_value_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    new_value_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    incident: Mapped["Incident"] = relationship("Incident", back_populates="events")
    actor: Mapped[Optional["User"]] = relationship("User")


class InvestigationJob(Base):
    __tablename__ = "investigation_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    incident_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("incidents.id"), index=True, nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), default="queued", index=True, nullable=False
    )  # queued, running, succeeded, failed, cancelled
    progress: Mapped[int] = mapped_column(Integer, default=0)
    model_version: Mapped[str] = mapped_column(String(50), default="rca-baseline-v1")
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    safe_error_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    result_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    incident: Mapped["Incident"] = relationship("Incident", back_populates="investigations")
    candidates: Mapped[list["RootCauseCandidate"]] = relationship(
        "RootCauseCandidate", back_populates="job", cascade="all, delete-orphan"
    )


class RootCauseCandidate(Base):
    __tablename__ = "root_cause_candidates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    investigation_job_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("investigation_jobs.id"), index=True, nullable=False
    )
    service_id: Mapped[str] = mapped_column(String(36), ForeignKey("services.id"), nullable=False)
    rank: Mapped[int] = mapped_column(Integer, nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    calibrated_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    candidate_indicator: Mapped[str] = mapped_column(String(100), default="error_spike")
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    job: Mapped["InvestigationJob"] = relationship("InvestigationJob", back_populates="candidates")
    service: Mapped["Service"] = relationship("Service")


class Dataset(Base):
    __tablename__ = "datasets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    source_url: Mapped[str] = mapped_column(String(255), nullable=False)
    license_note: Mapped[str] = mapped_column(String(255), nullable=False)
    usage_restrictions: Mapped[str] = mapped_column(Text, default="")
    modalities_json: Mapped[list[str]] = mapped_column(JSON, default=list)
    checksum_manifest: Mapped[str] = mapped_column(String(100), default="")
    status: Mapped[str] = mapped_column(String(50), default="registered")
    manifest_path: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    validated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ExperimentRun(Base):
    __tablename__ = "experiment_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    experiment_name: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    model_version: Mapped[str] = mapped_column(String(50), nullable=False)
    dataset_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("datasets.id"), nullable=True
    )
    split_manifest_path: Mapped[str] = mapped_column(String(255), default="")
    config_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    metrics_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    artifact_uri: Mapped[str] = mapped_column(String(255), default="")
    status: Mapped[str] = mapped_column(String(50), default="completed")
    seed: Mapped[int] = mapped_column(Integer, default=42)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    service_scope_json: Mapped[list[str]] = mapped_column(JSON, default=list)
    condition_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    severity: Mapped[str] = mapped_column(String(20), default="high", nullable=False)
    evaluation_interval_seconds: Mapped[int] = mapped_column(Integer, default=60)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by_user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    actor_user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_id: Mapped[str] = mapped_column(String(100), nullable=False)
    request_id: Mapped[str] = mapped_column(String(100), default="")
    details_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class DeploymentEvent(Base):
    __tablename__ = "deployment_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    deployment_id: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    service_id: Mapped[str] = mapped_column(String(36), ForeignKey("services.id"), nullable=False)
    environment: Mapped[str] = mapped_column(String(50), default="production", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="success", nullable=False)
    commit_id: Mapped[str] = mapped_column(String(100), default="")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    details_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)

    service: Mapped["Service"] = relationship("Service")
