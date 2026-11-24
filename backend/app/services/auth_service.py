from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import (
    ConflictError,
    NotFoundError,
    RateLimitError,
    UnauthorizedError,
    ValidationError,
)
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    login_rate_limiter,
    validate_password_policy,
    verify_password,
)
from app.models.entities import User
from app.schemas.domain import TokenResponse, UserResponse
from app.services.audit_service import audit_service


class AuthService:
    async def authenticate_user(
        self, db: AsyncSession, email: str, password: str, client_ip: str = "unknown"
    ) -> TokenResponse:
        norm_email = email.strip().lower()
        rate_key = f"{client_ip}:{norm_email}"

        # 1. Check rate limit & lockout
        is_locked, remaining = login_rate_limiter.is_locked(rate_key)
        if is_locked:
            raise RateLimitError(
                f"Too many failed authentication attempts. Account access locked for {remaining} seconds.",
                retry_after_seconds=remaining,
            )

        result = await db.execute(select(User).where(User.email == norm_email))
        user = result.scalar_one_or_none()

        if not user or not verify_password(password, user.password_hash):
            login_rate_limiter.record_failure(rate_key)
            try:
                await audit_service.log_event(
                    db=db,
                    action="auth.login.failure",
                    resource_type="User",
                    resource_id=norm_email,
                    details={"client_ip": client_ip, "reason": "invalid_credentials"},
                )
            except Exception:
                pass
            # Safe generic error message preventing user enumeration (Section 7.3 A)
            raise UnauthorizedError("Invalid email or password")

        if not user.is_active:
            raise UnauthorizedError("Account is inactive. Please contact administrator.")

        # Reset failed attempts on valid login
        login_rate_limiter.reset(rate_key)

        token = create_access_token(
            subject=user.id, extra_claims={"email": user.email, "role": user.role}
        )
        refresh_token = create_refresh_token(subject=user.id)

        try:
            await audit_service.log_event(
                db=db,
                action="auth.login.success",
                resource_type="User",
                resource_id=user.id,
                actor_user_id=user.id,
                details={"client_ip": client_ip},
            )
        except Exception:
            pass

        user_resp = UserResponse(
            id=user.id,
            email=user.email,
            display_name=user.display_name,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
        )

        return TokenResponse(
            access_token=token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=user_resp,
        )

    async def register_user(
        self,
        db: AsyncSession,
        email: str,
        password: str,
        display_name: str,
        role: str = "analyst",
        is_admin_creator: bool = False,
    ) -> TokenResponse:
        # Enforce enterprise password policy
        is_valid, msg = validate_password_policy(password)
        if not is_valid:
            raise ValidationError(msg)

        # Enforce least privilege: self-registration cannot grant admin/operator
        assigned_role = role if is_admin_creator else "analyst"
        if assigned_role not in ["viewer", "analyst", "operator", "admin"]:
            assigned_role = "analyst"

        norm_email = email.strip().lower()
        existing = await db.execute(select(User).where(User.email == norm_email))
        if existing.scalar_one_or_none():
            raise ConflictError("An account with this email already exists.")

        hashed = hash_password(password)
        new_user = User(
            email=norm_email,
            display_name=display_name.strip(),
            password_hash=hashed,
            role=assigned_role,
            is_active=True,
        )
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)

        token = create_access_token(
            subject=new_user.id, extra_claims={"email": new_user.email, "role": new_user.role}
        )
        refresh_token = create_refresh_token(subject=new_user.id)

        try:
            await audit_service.log_event(
                db=db,
                action="auth.register.success",
                resource_type="User",
                resource_id=new_user.id,
                actor_user_id=new_user.id,
                details={"role": assigned_role},
            )
        except Exception:
            pass

        user_resp = UserResponse(
            id=new_user.id,
            email=new_user.email,
            display_name=new_user.display_name,
            role=new_user.role,
            is_active=new_user.is_active,
            created_at=new_user.created_at,
        )

        return TokenResponse(
            access_token=token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=user_resp,
        )

    async def refresh_tokens(self, db: AsyncSession, refresh_token_str: str) -> TokenResponse:
        """Validate an active refresh token and issue rotated access and refresh credentials."""
        payload = decode_refresh_token(refresh_token_str)
        if not payload or not payload.get("sub"):
            raise UnauthorizedError("Invalid or expired refresh token")

        user = await self.get_user_by_id(db, payload["sub"])
        if not user.is_active:
            raise UnauthorizedError("User account is inactive")

        new_access_token = create_access_token(
            subject=user.id, extra_claims={"email": user.email, "role": user.role}
        )
        new_refresh_token = create_refresh_token(subject=user.id)

        try:
            await audit_service.log_event(
                db=db,
                action="auth.token.refresh",
                resource_type="User",
                resource_id=user.id,
                actor_user_id=user.id,
            )
        except Exception:
            pass

        user_resp = UserResponse(
            id=user.id,
            email=user.email,
            display_name=user.display_name,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
        )
        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            user=user_resp,
        )

    async def get_user_by_id(self, db: AsyncSession, user_id: str) -> User:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundError("User", user_id)
        return user


auth_service = AuthService()
