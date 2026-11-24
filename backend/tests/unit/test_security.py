import pytest

from app.api.deps import ROLE_HIERARCHY
from app.core.config import Settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    decode_refresh_token,
    hash_password,
    login_rate_limiter,
    validate_password_policy,
    verify_password,
)


def test_password_hashing():
    pw = "secret123"
    hashed = hash_password(pw)
    assert hashed != pw
    assert verify_password(pw, hashed) is True
    assert verify_password("wrong_password", hashed) is False


def test_jwt_token_creation_and_decoding():
    user_id = "user_test_uuid"
    token = create_access_token(user_id, extra_claims={"role": "admin"})
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == user_id
    assert payload["role"] == "admin"


def test_jwt_invalid_token():
    assert decode_access_token("invalid.token.payload") is None


def test_password_policy_validation():
    # Valid passwords
    valid, msg = validate_password_policy("StrongPassword123!")
    assert valid is True
    assert msg == ""

    valid, msg = validate_password_policy("Sentinel#2026_Secure")
    assert valid is True
    assert msg == ""

    # Invalid passwords
    valid, msg = validate_password_policy("Short1!")
    assert valid is False
    assert "at least 8 characters" in msg

    valid, msg = validate_password_policy("lowercase123!")
    assert valid is False
    assert "one uppercase" in msg

    valid, msg = validate_password_policy("UPPERCASE123!")
    assert valid is False
    assert "one lowercase" in msg

    valid, msg = validate_password_policy("NoDigitsHere!")
    assert valid is False
    assert "one numerical digit" in msg

    valid, msg = validate_password_policy("NoSpecialChar123")
    assert valid is False
    assert "one special" in msg


def test_login_rate_limiting_lockout():
    key = "test_rate_limited_ip"
    login_rate_limiter.reset(key)

    for _ in range(5):
        login_rate_limiter.record_failure(key)

    is_locked, rem = login_rate_limiter.is_locked(key)
    assert is_locked is True
    assert rem > 0

    login_rate_limiter.reset(key)
    is_locked_after, _ = login_rate_limiter.is_locked(key)
    assert is_locked_after is False


def test_role_hierarchy():
    assert ROLE_HIERARCHY["admin"] > ROLE_HIERARCHY["operator"]
    assert ROLE_HIERARCHY["operator"] > ROLE_HIERARCHY["analyst"]
    assert ROLE_HIERARCHY["analyst"] > ROLE_HIERARCHY["viewer"]


def test_refresh_token_creation_and_validation():
    user_id = "user_refresh_uuid"
    refresh_tok = create_refresh_token(user_id)
    payload = decode_refresh_token(refresh_tok)
    assert payload is not None
    assert payload["sub"] == user_id
    assert payload["type"] == "refresh"

    # Refresh token cannot be decoded as an access token
    assert decode_access_token(refresh_tok) is None


def test_production_environment_validation_fail_fast():
    # 1. Staging/Prod with default secret fails
    with pytest.raises(ValueError, match="SESSION_SECRET must be at least 32 characters"):
        Settings(
            APP_ENV="staging",
            SESSION_SECRET="replace-with-a-long-random-local-secret-32-chars-minimum",
        )

    # 2. Prod with SQLite fails
    with pytest.raises(ValueError, match="SQLite is not permitted in production"):
        Settings(
            APP_ENV="production",
            SESSION_SECRET="a" * 32,
            DATABASE_URL="sqlite+aiosqlite:///./prod.db",
            DEMO_MODE=False,
        )

    # 3. Prod with DEMO_MODE fails
    with pytest.raises(ValueError, match="DEMO_MODE must be False in production"):
        Settings(
            APP_ENV="production",
            SESSION_SECRET="a" * 32,
            DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/db",
            DEMO_MODE=True,
        )

    # 4. Valid production settings succeed
    valid_prod = Settings(
        APP_ENV="production",
        SESSION_SECRET="a" * 32,
        DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/db",
        DEMO_MODE=False,
        PROMETHEUS_URL="http://prometheus:9090",
        LOKI_URL="http://loki:3100",
        TEMPO_URL="http://tempo:3200",
    )
    assert valid_prod.APP_ENV == "production"
