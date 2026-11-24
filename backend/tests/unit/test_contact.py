import pytest

from app.core.errors import ValidationError
from app.db.session import AsyncSessionLocal
from app.schemas.domain import ContactEnquiryCreate, ContactEnquiryUpdate
from app.services.contact_service import ContactRateLimiter, ContactService


@pytest.mark.asyncio
async def test_contact_submission_success():
    async with AsyncSessionLocal() as db_session:
        service = ContactService()
        payload = ContactEnquiryCreate(
            name="Dr. Jane Smith",
            email="jane.smith@university.edu",
            subject="Research Collaboration on RCA Benchmarking",
            category="Research Collaboration",
            message="We are interested in benchmarking the topology-aware ranking algorithms against our telemetry datasets.",
        )
        result = await service.submit_enquiry(db_session, payload, client_ip="198.51.100.10")

        assert result.name == "Dr. Jane Smith"
        assert result.email == "jane.smith@university.edu"
        assert result.category == "Research Collaboration"
        assert result.status == "new"
        assert result.id is not None


@pytest.mark.asyncio
async def test_contact_honeypot_spam_rejection():
    async with AsyncSessionLocal() as db_session:
        service = ContactService()
        payload = ContactEnquiryCreate(
            name="Spam Bot",
            email="spambot@example.com",
            subject="Buy Viagra Now",
            category="General Enquiry",
            message="Check out our cheap deals online.",
            website="http://spam-link.ru",  # Honeypot filled
        )
        with pytest.raises(ValidationError, match="anti-spam"):
            await service.submit_enquiry(db_session, payload, client_ip="198.51.100.11")


@pytest.mark.asyncio
async def test_contact_invalid_category_rejection():
    async with AsyncSessionLocal() as db_session:
        payload = ContactEnquiryCreate(
            name="Test User",
            email="test@example.com",
            subject="Invalid Category Test",
            category="NonExistentCategory",
            message="A message with sufficient length for validation testing.",
        )
        service = ContactService()
        with pytest.raises(ValidationError, match="Category must be one of"):
            await service.submit_enquiry(db_session, payload, client_ip="198.51.100.12")


def test_contact_rate_limiter():
    limiter = ContactRateLimiter(max_per_hour=3, window_seconds=60)
    test_ip = "203.0.113.55"
    limiter.reset(test_ip)

    # 3 attempts allowed
    for _ in range(3):
        limited, _ = limiter.is_rate_limited(test_ip)
        assert limited is False
        limiter.record_attempt(test_ip)

    # 4th attempt blocked
    limited, retry_after = limiter.is_rate_limited(test_ip)
    assert limited is True
    assert retry_after > 0

    limiter.reset(test_ip)
    limited_after, _ = limiter.is_rate_limited(test_ip)
    assert limited_after is False


@pytest.mark.asyncio
async def test_contact_admin_lifecycle():
    async with AsyncSessionLocal() as db_session:
        service = ContactService()
        payload = ContactEnquiryCreate(
            name="Support Seeker",
            email="support@client.com",
            subject="OTel Collector Connectivity",
            category="Technical Support",
            message="Our collector exporter is returning connection refused on port 4317.",
        )
        enquiry = await service.submit_enquiry(db_session, payload, client_ip="198.51.100.14")

        # List
        enquiries, total = await service.list_enquiries(
            db_session, category_filter="Technical Support"
        )
        assert total >= 1
        assert any(e.id == enquiry.id for e in enquiries)

        # Update status to in_review then replied
        updated = await service.update_enquiry(
            db_session,
            enquiry.id,
            ContactEnquiryUpdate(status="in_review", internal_notes="Assigned to SRE on-call"),
            actor_user_id="operator-user-1",
        )
        assert updated.status == "in_review"
        assert updated.internal_notes == "Assigned to SRE on-call"

        replied = await service.update_enquiry(
            db_session,
            enquiry.id,
            ContactEnquiryUpdate(status="replied"),
            actor_user_id="operator-user-1",
        )
        assert replied.status == "replied"
        assert replied.replied_at is not None
