"""
Integration tests for FastAPI dependency injection — get_current_user
and get_optional_user.

Tests the JWT-based authentication dependencies directly by simulating
HTTP Bearer tokens.
"""

import os
from datetime import datetime, timedelta
from unittest.mock import patch

import pytest
from jose import jwt
from fastapi import HTTPException

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests")
os.environ.setdefault("DATABASE_URL", "sqlite:///test.db")

from app.core.dependencies import get_current_user, get_optional_user


# ── Helpers ──────────────────────────────────────────────────────────

SECRET = os.environ["JWT_SECRET_KEY"]
ALGORITHM = "HS256"


class FakeCredentials:
    """Simulates the HTTPBearer credentials object."""

    def __init__(self, token: str):
        self.credentials = token


def _make_token(user_id="u1", role="Tenant", org_id="org-1", expire_minutes=60):
    payload = {
        "user_id": user_id,
        "role": role,
        "organization_id": org_id,
        "exp": datetime.utcnow() + timedelta(minutes=expire_minutes),
    }
    return jwt.encode(payload, SECRET, algorithm=ALGORITHM)


def _make_expired_token():
    payload = {
        "user_id": "u1",
        "role": "Tenant",
        "organization_id": None,
        "exp": datetime.utcnow() - timedelta(minutes=10),
    }
    return jwt.encode(payload, SECRET, algorithm=ALGORITHM)


# ── get_current_user ─────────────────────────────────────────────────


class TestGetCurrentUser:
    """Tests for get_current_user() dependency."""

    def test_valid_token_returns_user_dict(self):
        """A valid JWT should return the user claims."""
        token = _make_token(user_id="user-42", role="Admin", org_id="org-99")
        result = get_current_user(FakeCredentials(token))
        assert result["user_id"] == "user-42"
        assert result["role"] == "Admin"
        assert result["organization_id"] == "org-99"

    def test_invalid_token_raises_401(self):
        """A malformed JWT should raise HTTPException 401."""
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(FakeCredentials("header.payload.invalid-sig"))
        assert exc_info.value.status_code == 401

    def test_non_jwt_string_raises_401(self):
        """A raw user_id (no dots) should raise 401 with helpful message."""
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(FakeCredentials("just-a-user-id"))
        assert exc_info.value.status_code == 401
        assert "JWT" in exc_info.value.detail or "token" in exc_info.value.detail.lower()

    def test_expired_token_raises_401(self):
        """An expired token should raise 401."""
        token = _make_expired_token()
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(FakeCredentials(token))
        assert exc_info.value.status_code == 401

    def test_bearer_prefix_stripped(self):
        """If the token accidentally starts with 'Bearer ', it should be stripped."""
        raw_token = _make_token(user_id="u-strip")
        prefixed = f"Bearer {raw_token}"
        result = get_current_user(FakeCredentials(prefixed))
        assert result["user_id"] == "u-strip"

    def test_wrong_secret_raises_401(self):
        """A token signed with a different secret should raise 401."""
        payload = {
            "user_id": "u1",
            "role": "Tenant",
            "organization_id": None,
            "exp": datetime.utcnow() + timedelta(minutes=60),
        }
        token = jwt.encode(payload, "wrong-secret", algorithm=ALGORITHM)
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(FakeCredentials(token))
        assert exc_info.value.status_code == 401


# ── get_optional_user ────────────────────────────────────────────────


class TestGetOptionalUser:
    """Tests for get_optional_user() dependency."""

    def test_no_credentials_returns_none(self):
        """When no Bearer header is present, return None."""
        result = get_optional_user(None)
        assert result is None

    def test_valid_token_returns_user(self):
        """A valid JWT should return the user claims."""
        token = _make_token(user_id="u-opt", role="Tenant")
        result = get_optional_user(FakeCredentials(token))
        assert result["user_id"] == "u-opt"
        assert result["role"] == "Tenant"

    def test_invalid_token_returns_none(self):
        """An invalid JWT should return None (not raise)."""
        result = get_optional_user(FakeCredentials("bad.token.here"))
        assert result is None

    def test_non_jwt_string_returns_none(self):
        """A non-JWT string (no dots) should return None."""
        result = get_optional_user(FakeCredentials("just-an-id"))
        assert result is None

    def test_expired_token_returns_none(self):
        """Expired token should return None (not raise)."""
        token = _make_expired_token()
        result = get_optional_user(FakeCredentials(token))
        assert result is None

    def test_bearer_prefix_stripped(self):
        """'Bearer ' prefix should be stripped and token still work."""
        raw_token = _make_token(user_id="u-opt-strip")
        prefixed = f"Bearer {raw_token}"
        result = get_optional_user(FakeCredentials(prefixed))
        assert result["user_id"] == "u-opt-strip"
