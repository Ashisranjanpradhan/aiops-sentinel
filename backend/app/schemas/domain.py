from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field

# ================== Auth & User ==================


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    display_name: str = Field(min_length=2, max_length=100)
    role: str = "analyst"


class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str
    role: str
    is_active: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


# ================== Services & Topology ==================


class ServiceResponse(BaseModel):
    id: str
    name: str
    environment: str
    namespace: str
    health_status: str
    first_seen_at: datetime
    last_seen_at: datetime
    metadata_json: dict[str, Any] = Field(default_factory=dict)
    active_incidents_count: int = 0
    request_rate: float | None = None
    error_rate: float | None = None
    p95_latency_ms: float | None = None


class ServiceCreate(BaseModel):
    name: str
    environment: str = "production"
    namespace: str = "default"
    health_status: str = "healthy"
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class ServiceEdgeResponse(BaseModel):
    id: str
    source_service_id: str
    target_service_id: str
    source_service_name: str | None = None
    target_service_name: str | None = None
    relationship_type: str
    observed_calls: int
    error_rate: float
    latency_summary_json: dict[str, Any]
    provenance: str


class TopologyNode(BaseModel):
    id: str
    name: str
    environment: str
    health_status: str
    request_rate: float
    error_rate: float
    p95_latency_ms: float
    active_incidents: int


class TopologyEdge(BaseModel):
    id: str
    source: str
    target: str
    relationship: str
    call_volume: int
    error_rate: float
    latency_ms: float
    provenance: str


class TopologyResponse(BaseModel):
    nodes: list[TopologyNode]
    edges: list[TopologyEdge]
    observed_window: dict[str, Any]


# ================== Telemetry Data ==================


class MetricPoint(BaseModel):
    timestamp: datetime
    value: float


class MetricSeries(BaseModel):
    metric_name: str
    unit: str
    points: list[MetricPoint]


class ServiceMetricsResponse(BaseModel):
    service_id: str
    service_name: str
    metrics: dict[str, MetricSeries]


class LogRecord(BaseModel):
    id: str
    timestamp: datetime
    severity: str
    message: str
    trace_id: str | None = None
    span_id: str | None = None
    attributes: dict[str, Any] = Field(default_factory=dict)


class ServiceLogsResponse(BaseModel):
    service_id: str
    logs: list[LogRecord]
    total_count: int


class TraceSpan(BaseModel):
    span_id: str
    parent_span_id: str | None = None
    service_name: str
    operation_name: str
    start_time: datetime
    duration_ms: float
    status: str
    attributes: dict[str, Any] = Field(default_factory=dict)


class TraceRecord(BaseModel):
    trace_id: str
    root_service: str
    root_operation: str
    start_time: datetime
    duration_ms: float
    status: str
    spans: list[TraceSpan] = Field(default_factory=list)


class ServiceTracesResponse(BaseModel):
    service_id: str
    traces: list[TraceRecord]
    total_count: int


# ================== Incidents & Evidence ==================


class IncidentEvidenceResponse(BaseModel):
    id: str
    evidence_type: str
    service_id: str | None = None
    service_name: str | None = None
    source_reference: str
    time_start: datetime
    time_end: datetime
    summary_json: dict[str, Any]
    created_at: datetime


class IncidentEventResponse(BaseModel):
    id: str
    event_type: str
    actor_name: str | None = None
    previous_value_json: dict[str, Any] | None = None
    new_value_json: dict[str, Any] | None = None
    reason: str | None = None
    created_at: datetime


class RootCauseCandidateResponse(BaseModel):
    id: str
    service_id: str
    service_name: str
    rank: int
    score: float
    calibrated_confidence: float | None = None
    candidate_indicator: str
    explanation: str
    evidence_ids: list[str]


class InvestigationJobResponse(BaseModel):
    id: str
    incident_id: str
    status: str
    progress: int
    model_version: str
    started_at: datetime | None = None
    completed_at: datetime | None = None
    error_code: str | None = None
    safe_error_summary: str | None = None
    candidates: list[RootCauseCandidateResponse] = Field(default_factory=list)


class IncidentResponse(BaseModel):
    id: str
    title: str
    description: str
    severity: str
    status: str
    primary_service_id: str
    primary_service_name: str | None = None
    detected_at: datetime
    last_seen_at: datetime
    resolved_at: datetime | None = None
    detector_name: str
    detector_version: str
    model_run_id: str | None = None
    confidence: float | None = None
    assigned_to_user_id: str | None = None
    assigned_user_name: str | None = None
    source: str
    created_at: datetime
    updated_at: datetime


class IncidentDetailResponse(IncidentResponse):
    evidence: list[IncidentEvidenceResponse] = Field(default_factory=list)
    events: list[IncidentEventResponse] = Field(default_factory=list)
    investigations: list[InvestigationJobResponse] = Field(default_factory=list)
    latest_investigation: InvestigationJobResponse | None = None


class IncidentCreate(BaseModel):
    title: str
    description: str = ""
    severity: str = "high"
    primary_service_id: str
    detector_name: str = "manual"
    detector_version: str = "1.0.0"
    source: str = "manual"
    evidence_items: list[dict[str, Any]] | None = None


class IncidentUpdate(BaseModel):
    status: str | None = None
    severity: str | None = None
    assigned_to_user_id: str | None = None
    reason: str | None = None


class NoteCreate(BaseModel):
    note: str = Field(min_length=1, max_length=2000)


# ================== Deployments ==================


class DeploymentResponse(BaseModel):
    id: str
    deployment_id: str
    service_id: str
    service_name: str | None = None
    environment: str
    status: str
    commit_id: str
    started_at: datetime
    completed_at: datetime | None = None
    details_json: dict[str, Any]
    correlated_incidents_count: int = 0


class DeploymentCreate(BaseModel):
    deployment_id: str
    service_id: str
    environment: str = "production"
    status: str = "success"
    commit_id: str = ""
    details_json: dict[str, Any] = Field(default_factory=dict)


# ================== Experiments ==================


class ExperimentRunResponse(BaseModel):
    id: str
    experiment_name: str
    model_name: str
    model_version: str
    dataset_id: str | None = None
    dataset_name: str | None = None
    split_manifest_path: str
    config_json: dict[str, Any]
    metrics_json: dict[str, Any]
    artifact_uri: str
    status: str
    seed: int
    started_at: datetime
    completed_at: datetime | None = None


class ExperimentRunCreate(BaseModel):
    experiment_name: str
    model_name: str
    model_version: str = "1.0.0"
    dataset_id: str | None = None
    split_manifest_path: str = ""
    config_json: dict[str, Any] = Field(default_factory=dict)
    seed: int = 42


# ================== Datasets ==================


class DatasetResponse(BaseModel):
    id: str
    name: str
    version: str
    source_url: str
    license_note: str
    usage_restrictions: str
    modalities_json: list[str]
    checksum_manifest: str
    status: str
    manifest_path: str
    created_at: datetime
    validated_at: datetime | None = None


class DatasetCreate(BaseModel):
    name: str
    version: str
    source_url: str
    license_note: str
    usage_restrictions: str = ""
    modalities_json: list[str] = Field(default_factory=lambda: ["metrics"])
    checksum_manifest: str = ""
    manifest_path: str = ""


# ================== Alert Rules ==================


class AlertRuleResponse(BaseModel):
    id: str
    name: str
    description: str
    service_scope_json: list[str]
    condition_json: dict[str, Any]
    severity: str
    evaluation_interval_seconds: int
    is_enabled: bool
    created_by_user_id: str | None = None
    created_at: datetime
    updated_at: datetime


class AlertRuleCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: str = ""
    service_scope_json: list[str] = Field(default_factory=list)
    condition_json: dict[str, Any] = Field(default_factory=dict)
    severity: str = "high"
    evaluation_interval_seconds: int = Field(default=60, ge=10, le=86400)
    is_enabled: bool = True


class AlertRuleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    service_scope_json: list[str] | None = None
    condition_json: dict[str, Any] | None = None
    severity: str | None = None
    evaluation_interval_seconds: int | None = None
    is_enabled: bool | None = None


# ================== Overview & Settings ==================


class TelemetrySourceStatus(BaseModel):
    name: str
    type: str  # metrics, logs, traces, database, queue
    status: str  # healthy, degraded, unavailable
    latency_ms: float | None = None
    last_query_at: datetime | None = None
    message: str | None = None


class OverviewSummaryResponse(BaseModel):
    total_services: int
    healthy_services: int
    warning_services: int
    critical_services: int
    active_incidents_count: int
    critical_incidents_count: int
    high_incidents_count: int
    medium_incidents_count: int
    recent_incidents: list[IncidentResponse]
    service_health_summary: list[ServiceResponse]
    telemetry_sources: list[TelemetrySourceStatus]
    anomaly_trend: list[dict[str, Any]]
    last_ingestion_time: datetime
    is_demo_mode: bool = True


class ProfileUpdate(BaseModel):
    display_name: str | None = None
    time_zone: str | None = None


class DataSourceConfigUpdate(BaseModel):
    prometheus_url: str | None = None
    loki_url: str | None = None
    tempo_url: str | None = None
