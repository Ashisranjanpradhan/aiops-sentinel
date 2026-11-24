from fastapi import Cookie, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ForbiddenError, UnauthorizedError
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.entities import User
from app.services.auth_service import auth_service


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    authorization: str | None = Header(None),
    aiops_session: str | None = Cookie(None),
) -> User:
    token: str | None = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
    elif aiops_session:
        token = aiops_session.strip()

    if not token:
        raise UnauthorizedError("Missing authentication token or session cookie")

    payload = decode_access_token(token)
    if not payload:
        raise UnauthorizedError("Invalid or expired session token")

    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedError("Invalid session payload")

    user = await auth_service.get_user_by_id(db, user_id)
    if not user.is_active:
        raise ForbiddenError("User account is inactive")

    return user


ROLE_HIERARCHY = {
    "viewer": 1,
    "analyst": 2,
    "operator": 3,
    "admin": 4,
}


def require_roles(*allowed_roles: str):
    """Enforce server-side Role-Based Access Control (RBAC). Admin always has superuser access."""

    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = (current_user.role or "viewer").lower()
        if user_role not in allowed_roles and user_role != "admin":
            allowed_str = ", ".join(allowed_roles)
            raise ForbiddenError(
                f"Operation requires one of the following roles: [{allowed_str}]. Your role is '{user_role}'."
            )
        return current_user

    return role_checker


get_current_admin = require_roles("admin")
get_current_operator = require_roles("admin", "operator")
get_current_analyst = require_roles("admin", "operator", "analyst")
