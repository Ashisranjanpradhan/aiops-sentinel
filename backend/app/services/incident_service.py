from datetime import UTC, datetime

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import ConflictError, NotFoundError, ValidationError
from app.models.entities import (
    Incident,
    IncidentEvent,
    IncidentEvidence,
    InvestigationJob,
    RootCauseCandidate,
    Service,
)
from app.schemas.domain import (
    IncidentCreate,
    IncidentDetailResponse,
    IncidentEventResponse,
    IncidentEvidenceResponse,
    IncidentResponse,
    IncidentUpdate,
    InvestigationJobResponse,
    NoteCreate,
    RootCauseCandidateResponse,
)

VALID_STATUS_TRANSITIONS = {
    "open": ["acknowledged", "investigating", "resolved", "closed"],
    "acknowledged": ["investigating", "resolved", "closed", "open"],
    "investigating": ["resolved", "closed", "acknowledged"],
    "resolved": ["closed", "open"],  # Can reopen if problem recurs
    "closed": ["open"],  # Reopen
}


class IncidentService:
    async def list_incidents(
        self,
        db: AsyncSession,
        search: str | None = None,
        severity: str | None = None,
        status: str | None = None,
        service_id: str | None = None,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "detected_at",
        sort_order: str = "desc",
    ) -> tuple[list[IncidentResponse], int]:
        query = select(Incident).options(
            selectinload(Incident.primary_service), selectinload(Incident.assigned_user)
        )

        if search:
            search_pattern = f"%{search.strip()}%"
            query = query.join(Service, Incident.primary_service_id == Service.id).where(
                or_(
                    Incident.id.ilike(search_pattern),
                    Incident.title.ilike(search_pattern),
                    Service.name.ilike(search_pattern),
                )
            )

        if severity:
            query = query.where(Incident.severity == severity)
        if status:
            query = query.where(Incident.status == status)
        if service_id:
            query = query.where(Incident.primary_service_id == service_id)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_res = await db.execute(count_query)
        total = total_res.scalar_one()

        # Sorting
        sort_col = getattr(Incident, sort_by, Incident.detected_at)
        if sort_order.lower() == "desc":
            query = query.order_by(sort_col.desc())
        else:
            query = query.order_by(sort_col.asc())

        # Pagination
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        incidents = result.scalars().all()

        responses = [
            IncidentResponse(
                id=inc.id,
                title=inc.title,
                description=inc.description,
                severity=inc.severity,
                status=inc.status,
                primary_service_id=inc.primary_service_id,
                primary_service_name=inc.primary_service.name if inc.primary_service else None,
                detected_at=inc.detected_at,
                last_seen_at=inc.last_seen_at,
                resolved_at=inc.resolved_at,
                detector_name=inc.detector_name,
                detector_version=inc.detector_version,
                model_run_id=inc.model_run_id,
                confidence=inc.confidence,
                assigned_to_user_id=inc.assigned_to_user_id,
                assigned_user_name=inc.assigned_user.display_name if inc.assigned_user else None,
                source=inc.source,
                created_at=inc.created_at,
                updated_at=inc.updated_at,
            )
            for inc in incidents
        ]

        return responses, total

    async def get_incident(self, db: AsyncSession, incident_id: str) -> IncidentDetailResponse:
        query = (
            select(Incident)
            .where(Incident.id == incident_id)
            .options(
                selectinload(Incident.primary_service),
                selectinload(Incident.assigned_user),
                selectinload(Incident.evidence),
                selectinload(Incident.events).selectinload(IncidentEvent.actor),
                selectinload(Incident.investigations)
                .selectinload(InvestigationJob.candidates)
                .selectinload(RootCauseCandidate.service),
            )
        )
        result = await db.execute(query)
        inc = result.scalar_one_or_none()
        if not inc:
            raise NotFoundError("Incident", incident_id)

        evidence_res = [
            IncidentEvidenceResponse(
                id=ev.id,
                evidence_type=ev.evidence_type,
                service_id=ev.service_id,
                service_name=inc.primary_service.name if inc.primary_service else None,
                source_reference=ev.source_reference,
                time_start=ev.time_start,
                time_end=ev.time_end,
                summary_json=ev.summary_json,
                created_at=ev.created_at,
            )
            for ev in inc.evidence
        ]

        events_res = [
            IncidentEventResponse(
                id=ev.id,
                event_type=ev.event_type,
                actor_name=ev.actor.display_name if ev.actor else "System",
                previous_value_json=ev.previous_value_json,
                new_value_json=ev.new_value_json,
                reason=ev.reason,
                created_at=ev.created_at,
            )
            for ev in sorted(inc.events, key=lambda x: x.created_at, reverse=True)
        ]

        jobs_res = []
        for job in sorted(inc.investigations, key=lambda x: x.created_at, reverse=True):
            cand_res = [
                RootCauseCandidateResponse(
                    id=c.id,
                    service_id=c.service_id,
                    service_name=c.service.name if c.service else "Unknown",
                    rank=c.rank,
                    score=c.score,
                    calibrated_confidence=c.calibrated_confidence,
                    candidate_indicator=c.candidate_indicator,
                    explanation=c.explanation,
                    evidence_ids=c.evidence_ids or [],
                )
                for c in sorted(job.candidates, key=lambda x: x.rank)
            ]
            jobs_res.append(
                InvestigationJobResponse(
                    id=job.id,
                    incident_id=job.incident_id,
                    status=job.status,
                    progress=job.progress,
                    model_version=job.model_version,
                    started_at=job.started_at,
                    completed_at=job.completed_at,
                    error_code=job.error_code,
                    safe_error_summary=job.safe_error_summary,
                    candidates=cand_res,
                )
            )

        latest_job = jobs_res[0] if jobs_res else None

        return IncidentDetailResponse(
            id=inc.id,
            title=inc.title,
            description=inc.description,
            severity=inc.severity,
            status=inc.status,
            primary_service_id=inc.primary_service_id,
            primary_service_name=inc.primary_service.name if inc.primary_service else None,
            detected_at=inc.detected_at,
            last_seen_at=inc.last_seen_at,
            resolved_at=inc.resolved_at,
            detector_name=inc.detector_name,
            detector_version=inc.detector_version,
            model_run_id=inc.model_run_id,
            confidence=inc.confidence,
            assigned_to_user_id=inc.assigned_to_user_id,
            assigned_user_name=inc.assigned_user.display_name if inc.assigned_user else None,
            source=inc.source,
            created_at=inc.created_at,
            updated_at=inc.updated_at,
            evidence=evidence_res,
            events=events_res,
            investigations=jobs_res,
            latest_investigation=latest_job,
        )

    async def create_incident(
        self, db: AsyncSession, data: IncidentCreate, actor_user_id: str | None = None
    ) -> Incident:
        # Check service existence
        srv = await db.execute(select(Service).where(Service.id == data.primary_service_id))
        if not srv.scalar_one_or_none():
            raise NotFoundError("Service", data.primary_service_id)

        now = datetime.now(UTC)
        incident = Incident(
            title=data.title,
            description=data.description,
            severity=data.severity,
            status="open",
            primary_service_id=data.primary_service_id,
            detected_at=now,
            last_seen_at=now,
            detector_name=data.detector_name,
            detector_version=data.detector_version,
            source=data.source,
        )
        db.add(incident)
        await db.flush()

        # Add creation event
        event = IncidentEvent(
            incident_id=incident.id,
            actor_user_id=actor_user_id,
            event_type="created",
            new_value_json={"status": "open", "severity": data.severity},
            reason="Incident created",
        )
        db.add(event)

        # Add initial evidence if provided
        if data.evidence_items:
            for item in data.evidence_items:
                ev = IncidentEvidence(
                    incident_id=incident.id,
                    evidence_type=item.get("evidence_type", "metric"),
                    service_id=item.get("service_id", data.primary_service_id),
                    source_reference=item.get("source_reference", "detector"),
                    time_start=item.get("time_start", now),
                    time_end=item.get("time_end", now),
                    summary_json=item.get("summary_json", {}),
                )
                db.add(ev)

        await db.commit()
        await db.refresh(incident)
        return incident

    async def update_incident(
        self,
        db: AsyncSession,
        incident_id: str,
        data: IncidentUpdate,
        actor_user_id: str | None = None,
    ) -> Incident:
        result = await db.execute(select(Incident).where(Incident.id == incident_id))
        incident = result.scalar_one_or_none()
        if not incident:
            raise NotFoundError("Incident", incident_id)

        now = datetime.now(UTC)

        # Handle status transition validation (Section 7.3 E & 8.4)
        if data.status and data.status != incident.status:
            allowed = VALID_STATUS_TRANSITIONS.get(incident.status, [])
            if data.status not in allowed:
                raise ConflictError(
                    f"Invalid status transition from '{incident.status}' to '{data.status}'. "
                    f"Allowed transitions: {allowed}"
                )

            old_status = incident.status
            incident.status = data.status
            if data.status == "resolved":
                incident.resolved_at = now
            elif old_status == "resolved" and data.status == "open":
                incident.resolved_at = None

            event = IncidentEvent(
                incident_id=incident.id,
                actor_user_id=actor_user_id,
                event_type="status_change",
                previous_value_json={"status": old_status},
                new_value_json={"status": data.status},
                reason=data.reason or f"Status changed to {data.status}",
            )
            db.add(event)

        # Handle assignment
        if (
            data.assigned_to_user_id is not None
            and data.assigned_to_user_id != incident.assigned_to_user_id
        ):
            old_assigned = incident.assigned_to_user_id
            incident.assigned_to_user_id = data.assigned_to_user_id

            event = IncidentEvent(
                incident_id=incident.id,
                actor_user_id=actor_user_id,
                event_type="assignment",
                previous_value_json={"assigned_to_user_id": old_assigned},
                new_value_json={"assigned_to_user_id": data.assigned_to_user_id},
                reason=data.reason or "Incident assignee updated",
            )
            db.add(event)

        # Handle severity update
        if data.severity and data.severity != incident.severity:
            old_sev = incident.severity
            incident.severity = data.severity
            event = IncidentEvent(
                incident_id=incident.id,
                actor_user_id=actor_user_id,
                event_type="severity_change",
                previous_value_json={"severity": old_sev},
                new_value_json={"severity": data.severity},
                reason=data.reason or "Severity updated",
            )
            db.add(event)

        incident.updated_at = now
        await db.commit()
        await db.refresh(incident)
        return incident

    async def add_note(
        self, db: AsyncSession, incident_id: str, data: NoteCreate, actor_user_id: str | None = None
    ) -> IncidentEvent:
        result = await db.execute(select(Incident).where(Incident.id == incident_id))
        incident = result.scalar_one_or_none()
        if not incident:
            raise NotFoundError("Incident", incident_id)

        note_text = data.note.strip()
        if not note_text:
            raise ValidationError("Note cannot be empty")

        event = IncidentEvent(
            incident_id=incident.id,
            actor_user_id=actor_user_id,
            event_type="note",
            new_value_json={"note": note_text},
            reason="Analyst note added",
        )
        db.add(event)
        incident.updated_at = datetime.now(UTC)
        await db.commit()
        await db.refresh(event)
        return event


incident_service = IncidentService()
