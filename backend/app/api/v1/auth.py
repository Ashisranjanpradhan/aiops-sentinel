from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.errors import ValidationError
from app.core.response import make_response
from app.core.security import hash_password, verify_password
from app.db.session import get_db
from app.models.entities import User
from app.schemas.domain import (
    ChangePasswordRequest,
    LoginRequest,
    UserResponse,
)
from app.services.auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login")
async def login(payload: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    token_resp = await auth_service.authenticate_user(db, payload.email, payload.password)

    # Set secure, HTTP-only session cookie (Section 8.2 & 12.1)
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=token_resp.access_token,
        max_age=settings.SESSION_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite=settings.SESSION_COOKIE_SAMESITE,
        path="/",
    )

    return make_response(token_resp.model_dump())


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key=settings.SESSION_COOKIE_NAME, path="/")
    return make_response({"message": "Successfully logged out"})


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    user_resp = UserResponse(
        id=current_user.id,
        email=current_user.email,
        display_name=current_user.display_name,
        role=current_user.role,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
    )
    return make_response(user_resp.model_dump())


@router.post("/password")
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise ValidationError("Current password does not match")

    current_user.password_hash = hash_password(payload.new_password)
    await db.commit()
    return make_response({"message": "Password updated successfully"})
