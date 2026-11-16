from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
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
