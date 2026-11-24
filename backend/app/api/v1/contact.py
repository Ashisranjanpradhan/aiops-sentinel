from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_operator
from app.core.response import make_response
from app.db.session import get_db
from app.models.entities import User
from app.schemas.domain import (
    ContactEnquiryCreate,
    ContactEnquiryUpdate,
)
from app.services.contact_service import contact_service

router = APIRouter(prefix="/contact", tags=["Contact & Enquiries"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def submit_contact_enquiry(
    payload: ContactEnquiryCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Public endpoint for general, support, research, and partnership enquiries.
    Protected by honeypot anti-spam verification and per-IP rate limiting.
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    elif request.client:
        client_ip = request.client.host
    else:
        client_ip = "unknown"

    enquiry = await contact_service.submit_enquiry(db=db, payload=payload, client_ip=client_ip)
    return make_response(enquiry.model_dump())


@router.get("/enquiries", status_code=status.HTTP_200_OK)
async def list_contact_enquiries(
    status_filter: str | None = Query(None, alias="status"),
    category_filter: str | None = Query(None, alias="category"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_operator),
    db: AsyncSession = Depends(get_db),
):
    """
    Administrative review of submitted enquiries.
    Restricted to authorized operators and administrators.
    """
    enquiries, total = await contact_service.list_enquiries(
        db=db,
        status_filter=status_filter,
        category_filter=category_filter,
        page=page,
        page_size=page_size,
    )
    return make_response(
        [e.model_dump() for e in enquiries],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.get("/enquiries/{enquiry_id}", status_code=status.HTTP_200_OK)
async def get_contact_enquiry(
    enquiry_id: str,
    current_user: User = Depends(get_current_operator),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve detailed submission content by ID. Restricted to operators and admins."""
    enquiry = await contact_service.get_enquiry(db=db, enquiry_id=enquiry_id)
    return make_response(enquiry.model_dump())


@router.patch("/enquiries/{enquiry_id}", status_code=status.HTTP_200_OK)
async def update_contact_enquiry(
    enquiry_id: str,
    payload: ContactEnquiryUpdate,
    current_user: User = Depends(get_current_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update review status or internal notes for an enquiry. Restricted to operators and admins."""
    updated = await contact_service.update_enquiry(
        db=db, enquiry_id=enquiry_id, payload=payload, actor_user_id=current_user.id
    )
    return make_response(updated.model_dump())
