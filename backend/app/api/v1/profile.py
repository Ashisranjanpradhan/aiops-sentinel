from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.response import make_response
from app.db.session import get_db
from app.models.entities import User
from app.schemas.domain import ProfileUpdate

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("")
async def get_profile(current_user: User = Depends(get_current_user)):
    return make_response(
        {
            "id": current_user.id,
            "email": current_user.email,
            "display_name": current_user.display_name,
            "role": current_user.role,
            "time_zone": settings.DEFAULT_TIMEZONE,
            "is_active": current_user.is_active,
            "created_at": current_user.created_at.isoformat(),
        }
    )


@router.patch("")
async def update_profile(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.display_name:
        current_user.display_name = payload.display_name.strip()
    await db.commit()
    await db.refresh(current_user)

    return make_response(
        {
            "id": current_user.id,
            "email": current_user.email,
            "display_name": current_user.display_name,
            "role": current_user.role,
            "time_zone": payload.time_zone or settings.DEFAULT_TIMEZONE,
            "is_active": current_user.is_active,
            "created_at": current_user.created_at.isoformat(),
        }
    )
