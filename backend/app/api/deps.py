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


async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise ForbiddenError("Administrator access required")
    return current_user
