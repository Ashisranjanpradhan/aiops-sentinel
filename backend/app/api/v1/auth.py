from fastapi import APIRouter, Cookie, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.errors import UnauthorizedError, ValidationError
from app.core.response import make_response
from app.core.security import hash_password, validate_password_policy, verify_password
from app.db.session import get_db
from app.models.entities import User
from app.schemas.domain import (
    ChangePasswordRequest,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    UserResponse,
)
from app.services.audit_service import audit_service
from app.services.auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register")
async def register(
    payload: RegisterRequest, response: Response, db: AsyncSession = Depends(get_db)
):
    token_resp = await auth_service.register_user(
        db=db,
        email=payload.email,
        password=payload.password,
        display_name=payload.display_name,
        role=payload.role,
        is_admin_creator=False,
    )

    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=token_resp.access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite=settings.SESSION_COOKIE_SAMESITE,
        path="/",
    )
    if token_resp.refresh_token:
        response.set_cookie(
            key="aiops_refresh",
            value=token_resp.refresh_token,
            max_age=7 * 24 * 3600,
            httponly=True,
            secure=settings.SESSION_COOKIE_SECURE,
            samesite=settings.SESSION_COOKIE_SAMESITE,
            path="/api/v1/auth",
        )

    return make_response(token_resp.model_dump())


@router.post("/login")
async def login(
    payload: LoginRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db)
):
    client_ip = request.client.host if request.client else "unknown"
    token_resp = await auth_service.authenticate_user(
        db=db, email=payload.email, password=payload.password, client_ip=client_ip
    )

    # Set secure, HTTP-only session cookies
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=token_resp.access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite=settings.SESSION_COOKIE_SAMESITE,
        path="/",
    )
    if token_resp.refresh_token:
        response.set_cookie(
            key="aiops_refresh",
            value=token_resp.refresh_token,
            max_age=7 * 24 * 3600,
            httponly=True,
            secure=settings.SESSION_COOKIE_SECURE,
            samesite=settings.SESSION_COOKIE_SAMESITE,
            path="/api/v1/auth",
        )

    return make_response(token_resp.model_dump())


@router.post("/refresh")
async def refresh_session(
    payload: RefreshTokenRequest | None = None,
    aiops_refresh: str | None = Cookie(None),
    response: Response = None,
    db: AsyncSession = Depends(get_db),
):
    """Rotate credentials using active refresh token in body or HttpOnly cookie."""
    token_candidate = (payload.refresh_token if payload else None) or aiops_refresh
    if not token_candidate:
        raise UnauthorizedError("No refresh token supplied")

    token_resp = await auth_service.refresh_tokens(db=db, refresh_token_str=token_candidate)

    if response:
        response.set_cookie(
            key=settings.SESSION_COOKIE_NAME,
            value=token_resp.access_token,
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            httponly=True,
            secure=settings.SESSION_COOKIE_SECURE,
            samesite=settings.SESSION_COOKIE_SAMESITE,
            path="/",
        )
        if token_resp.refresh_token:
            response.set_cookie(
                key="aiops_refresh",
                value=token_resp.refresh_token,
                max_age=7 * 24 * 3600,
                httponly=True,
                secure=settings.SESSION_COOKIE_SECURE,
                samesite=settings.SESSION_COOKIE_SAMESITE,
                path="/api/v1/auth",
            )

    return make_response(token_resp.model_dump())


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key=settings.SESSION_COOKIE_NAME, path="/")
    response.delete_cookie(key="aiops_refresh", path="/api/v1/auth")
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

    is_valid, msg = validate_password_policy(payload.new_password)
    if not is_valid:
        raise ValidationError(msg)

    current_user.password_hash = hash_password(payload.new_password)
    await db.commit()

    try:
        await audit_service.log_event(
            db=db,
            action="auth.password.change",
            resource_type="User",
            resource_id=current_user.id,
            actor_user_id=current_user.id,
        )
    except Exception:
        pass

    return make_response({"message": "Password updated successfully"})
