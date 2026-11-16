from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError, UnauthorizedError
from app.core.security import create_access_token, verify_password
from app.models.entities import User
from app.schemas.domain import TokenResponse, UserResponse


class AuthService:
    async def authenticate_user(self, db: AsyncSession, email: str, password: str) -> TokenResponse:
        result = await db.execute(select(User).where(User.email == email.strip().lower()))
        user = result.scalar_one_or_none()

        if not user or not verify_password(password, user.password_hash):
            # Safe generic error message preventing user enumeration (Section 7.3 A)
            raise UnauthorizedError("Invalid email or password")

        if not user.is_active:
            raise UnauthorizedError("Account is inactive. Please contact administrator.")

        token = create_access_token(
            subject=user.id, extra_claims={"email": user.email, "role": user.role}
        )

        user_resp = UserResponse(
            id=user.id,
            email=user.email,
            display_name=user.display_name,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
        )

        return TokenResponse(access_token=token, token_type="bearer", user=user_resp)

    async def get_user_by_id(self, db: AsyncSession, user_id: str) -> User:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundError("User", user_id)
        return user


auth_service = AuthService()
