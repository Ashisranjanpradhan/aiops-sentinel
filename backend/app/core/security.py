import re
import time
import uuid
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.core.config import settings

_ph = PasswordHasher(time_cost=2, memory_cost=19456, parallelism=1)


class LoginRateLimiter:
    """In-memory sliding-window rate limiter and lockout tracker for login attempts."""

    def __init__(self):
        self._failures: dict[str, list[float]] = defaultdict(list)
        self._lockouts: dict[str, float] = {}

    def is_locked(self, key: str) -> tuple[bool, int]:
        now = time.time()
        lockout_until = self._lockouts.get(key, 0.0)
        if now < lockout_until:
            remaining = int(lockout_until - now)
            return True, max(1, remaining)

        # Clear expired attempts
        window = float(settings.LOGIN_RATE_LIMIT_WINDOW_SECONDS)
        cutoff = now - window
        self._failures[key] = [t for t in self._failures[key] if t > cutoff]
        return False, 0

    def record_failure(self, key: str) -> None:
        now = time.time()
        self._failures[key].append(now)
        if len(self._failures[key]) >= settings.LOGIN_RATE_LIMIT_MAX_ATTEMPTS:
            self._lockouts[key] = now + float(settings.LOGIN_LOCKOUT_SECONDS)

    def reset(self, key: str) -> None:
        self._failures.pop(key, None)
        self._lockouts.pop(key, None)


login_rate_limiter = LoginRateLimiter()


def validate_password_policy(password: str) -> tuple[bool, str]:
    """Enforce standard enterprise password complexity."""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r"\d", password):
        return False, "Password must contain at least one numerical digit."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter."
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>\-_+=\[\]~`]", password):
        return False, "Password must contain at least one special character."
    return True, ""


def hash_password(password: str) -> str:
    """Hash a plaintext password with Argon2id."""
    return _ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against an Argon2id hash."""
    try:
        return _ph.verify(hashed_password, plain_password)
    except VerifyMismatchError:
        return False
    except Exception:
        return False


def create_access_token(
    subject: str, extra_claims: dict[str, Any] | None = None, expires_delta: timedelta | None = None
) -> str:
    """Create a signed JWT session token."""
    now = datetime.now(UTC)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode: dict[str, Any] = {
        "sub": subject,
        "jti": str(uuid.uuid4()),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    if extra_claims:
        to_encode.update(extra_claims)

    encoded_jwt = jwt.encode(to_encode, settings.SESSION_SECRET, algorithm="HS256")
    return encoded_jwt


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decode and validate a signed JWT session token."""
    try:
        payload = jwt.decode(token, settings.SESSION_SECRET, algorithms=["HS256"])
        if payload.get("type") == "refresh":
            return None  # Disallow using refresh token as access token
        return payload
    except jwt.PyJWTError:
        return None


def create_refresh_token(subject: str, expires_delta: timedelta | None = None) -> str:
    """Create a cryptographically signed refresh token for secure session extension."""
    now = datetime.now(UTC)
    expire = now + (expires_delta or timedelta(days=7))

    to_encode: dict[str, Any] = {
        "sub": subject,
        "type": "refresh",
        "jti": str(uuid.uuid4()),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(to_encode, settings.SESSION_SECRET, algorithm="HS256")


def decode_refresh_token(token: str) -> dict[str, Any] | None:
    """Decode and validate a refresh token."""
    try:
        payload = jwt.decode(token, settings.SESSION_SECRET, algorithms=["HS256"])
        if payload.get("type") != "refresh":
            return None
        return payload
    except jwt.PyJWTError:
        return None
