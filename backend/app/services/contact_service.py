import html
import logging
import time
from collections import defaultdict
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import NotFoundError, RateLimitError, ValidationError
from app.models.entities import ContactEnquiry
from app.schemas.domain import (
    ContactEnquiryCreate,
    ContactEnquiryResponse,
    ContactEnquiryUpdate,
)

logger = logging.getLogger("aiops.contact")


class ContactRateLimiter:
    """Sliding-window rate limiter per client IP for public contact submissions."""

    def __init__(self, max_per_hour: int = 10, window_seconds: int = 3600):
        self.max_per_hour = max_per_hour
        self.window_seconds = window_seconds
        self._requests: dict[str, list[float]] = defaultdict(list)

    def is_rate_limited(self, ip: str) -> tuple[bool, int]:
        now = time.time()
        cutoff = now - self.window_seconds
        # Evict timestamps older than 1 hour
        self._requests[ip] = [t for t in self._requests[ip] if t > cutoff]

        if len(self._requests[ip]) >= self.max_per_hour:
            oldest = self._requests[ip][0]
            retry_after = int(oldest + self.window_seconds - now)
            return True, max(1, retry_after)

        return False, 0

    def record_attempt(self, ip: str) -> None:
        self._requests[ip].append(time.time())

    def reset(self, ip: str) -> None:
        self._requests.pop(ip, None)


contact_rate_limiter = ContactRateLimiter(
    max_per_hour=getattr(settings, "CONTACT_RATE_LIMIT_PER_HOUR", 10)
)


class ContactService:
    """Handles submission, validation, anti-spam, persistence, and review of enquiries."""

    async def submit_enquiry(
        self, db: AsyncSession, payload: ContactEnquiryCreate, client_ip: str = "unknown"
    ) -> ContactEnquiryResponse:
        # 1. Honeypot check
        if payload.website:
            logger.warning(
                "Spam honeypot triggered by IP %s (website field: %s)", client_ip, payload.website
            )
            raise ValidationError("Form submission failed anti-spam verification.")

        # 2. Timing check (if client timestamp passed, must take >= 1.5s to type/submit)
        if payload.client_timestamp:
            submission_duration = time.time() - payload.client_timestamp
            if 0 < submission_duration < 1.0:
                logger.warning(
                    "Automated sub-second submission detected from IP %s (%.2fs)",
                    client_ip,
                    submission_duration,
                )
                raise ValidationError("Automated bot submission detected.")

        # 3. Rate limiting check
        limited, retry_after = contact_rate_limiter.is_rate_limited(client_ip)
        if limited:
            raise RateLimitError(
                f"Too many enquiries submitted from this IP. Please wait {retry_after} seconds before trying again.",
                retry_after_seconds=retry_after,
            )

        # 4. Payload validation
        payload.validate_submission_payload()

        # 5. Sanitize text fields
        clean_name = html.escape(payload.name.strip())
        clean_subject = html.escape(payload.subject.strip())
        clean_category = payload.category.strip()
        clean_message = payload.message.strip()

        # 6. Persist enquiry
        enquiry = ContactEnquiry(
            name=clean_name,
            email=str(payload.email).strip().lower(),
            subject=clean_subject,
            category=clean_category,
            message=clean_message,
            client_ip=client_ip,
            status="new",
        )
        db.add(enquiry)
        await db.commit()
        await db.refresh(enquiry)

        contact_rate_limiter.record_attempt(client_ip)
        logger.info(
            "New contact enquiry [%s] created from IP %s for category '%s'",
            enquiry.id,
            client_ip,
            clean_category,
        )

        # 7. Safe notification dispatch
        self._dispatch_safe_notification(enquiry)

        return self._to_response(enquiry)

    @staticmethod
    def _to_response(enquiry: ContactEnquiry) -> ContactEnquiryResponse:
        return ContactEnquiryResponse(
            id=enquiry.id,
            name=enquiry.name,
            email=enquiry.email,
            subject=enquiry.subject,
            category=enquiry.category,
            message=enquiry.message,
            status=enquiry.status,
            internal_notes=enquiry.internal_notes,
            replied_at=enquiry.replied_at,
            replied_by_user_id=enquiry.replied_by_user_id,
            created_at=enquiry.created_at,
            updated_at=enquiry.updated_at,
        )

    def _dispatch_safe_notification(self, enquiry: ContactEnquiry) -> None:
        """Asynchronously dispatches an alert email if SMTP is configured. Never throws."""
        smtp_host = getattr(settings, "SMTP_HOST", None)
        target_email = getattr(settings, "CONTACT_NOTIFICATION_EMAIL", None)

        if not smtp_host or not target_email:
            logger.info(
                "SMTP or CONTACT_NOTIFICATION_EMAIL not configured. "
                "Enquiry '%s' safely persisted to database; email dispatch skipped.",
                enquiry.id,
            )
            return

        try:
            import smtplib
            from email.mime.text import MIMEText

            msg = MIMEText(
                f"New Contact Enquiry Received:\n\n"
                f"ID: {enquiry.id}\n"
                f"Name: {enquiry.name}\n"
                f"Email: {enquiry.email}\n"
                f"Category: {enquiry.category}\n"
                f"Subject: {enquiry.subject}\n\n"
                f"Message:\n{enquiry.message}\n"
            )
            msg["Subject"] = f"[AIOps Sentinel Enquiry] {enquiry.subject}"
            msg["From"] = settings.SMTP_FROM_EMAIL
            msg["To"] = target_email

            with smtplib.SMTP(smtp_host, settings.SMTP_PORT, timeout=5.0) as server:
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.starttls()
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
            logger.info("Notification email dispatched for enquiry '%s'", enquiry.id)
        except Exception as ex:
            logger.warning("Failed to dispatch contact notification email: %s", ex)

    async def list_enquiries(
        self,
        db: AsyncSession,
        status_filter: str | None = None,
        category_filter: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[ContactEnquiryResponse], int]:
        query = select(ContactEnquiry)

        if status_filter:
            query = query.where(ContactEnquiry.status == status_filter)
        if category_filter:
            query = query.where(ContactEnquiry.category == category_filter)

        count_query = select(func.count()).select_from(query.subquery())
        total_res = await db.execute(count_query)
        total = total_res.scalar_one()

        query = (
            query.order_by(ContactEnquiry.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        res = await db.execute(query)
        enquiries = res.scalars().all()

        return [self._to_response(e) for e in enquiries], total

    async def get_enquiry(self, db: AsyncSession, enquiry_id: str) -> ContactEnquiryResponse:
        res = await db.execute(select(ContactEnquiry).where(ContactEnquiry.id == enquiry_id))
        enquiry = res.scalar_one_or_none()
        if not enquiry:
            raise NotFoundError("ContactEnquiry", enquiry_id)
        return self._to_response(enquiry)

    async def update_enquiry(
        self,
        db: AsyncSession,
        enquiry_id: str,
        payload: ContactEnquiryUpdate,
        actor_user_id: str,
    ) -> ContactEnquiryResponse:
        res = await db.execute(select(ContactEnquiry).where(ContactEnquiry.id == enquiry_id))
        enquiry = res.scalar_one_or_none()
        if not enquiry:
            raise NotFoundError("ContactEnquiry", enquiry_id)

        if payload.status:
            enquiry.status = payload.status
            if payload.status == "replied":
                enquiry.replied_at = datetime.now(UTC)
                enquiry.replied_by_user_id = actor_user_id

        if payload.internal_notes is not None:
            enquiry.internal_notes = payload.internal_notes.strip()

        enquiry.updated_at = datetime.now(UTC)
        await db.commit()
        await db.refresh(enquiry)

        logger.info(
            "Enquiry '%s' updated by user '%s' (status=%s)",
            enquiry_id,
            actor_user_id,
            enquiry.status,
        )
        return self._to_response(enquiry)


contact_service = ContactService()
