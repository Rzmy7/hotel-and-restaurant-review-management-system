"""
Unit tests for app.core.security — password hashing and JWT tokens.

Tests pure functions with no database or network I/O.
"""

import os
from datetime import datetime, timedelta
from unittest.mock import patch

import pytest
from jose import jwt, JWTError

# Ensure test env vars are set before importing app code
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests")

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)


# ── Password Hashing ───────────────────────────────────────────────


class TestHashPassword:
    """Tests for hash_password()."""

    def test_returns_bcrypt_hash(self):
        """Output should be a bcrypt hash starting with '$2b$'."""
        result = hash_password("MySecret123!")
        assert result.startswith("$2b$")

    def test_different_calls_produce_different_hashes(self):
        """bcrypt uses a random salt, so two calls should differ."""
        h1 = hash_password("SamePassword1!")
        h2 = hash_password("SamePassword1!")
        assert h1 != h2

    def test_hash_is_string(self):
        """Return type should be str, not bytes."""
        result = hash_password("Test1234!")
        assert isinstance(result, str)


class TestVerifyPassword:
    """Tests for verify_password()."""

    def test_correct_password_returns_true(self):
        """Matching password should return True."""
        hashed = hash_password("CorrectHorse1!")
        assert verify_password("CorrectHorse1!", hashed) is True

    def test_wrong_password_returns_false(self):
        """Mismatched password should return False."""
        hashed = hash_password("CorrectHorse1!")
        assert verify_password("WrongPassword1!", hashed) is False

    def test_bad_hash_format_returns_false(self):
        """Garbage hash string should return False, not crash."""
        assert verify_password("anything", "not-a-bcrypt-hash") is False

    def test_empty_password_returns_false(self):
        """Empty plaintext should return False against a real hash."""
        hashed = hash_password("RealPassword1!")
        assert verify_password("", hashed) is False


# ── JWT Tokens ──────────────────────────────────────────────────────


class TestCreateAccessToken:
    """Tests for create_access_token()."""

    @patch("app.core.security._resolve_token_expiry_minutes", return_value=60)
    def test_token_contains_expected_claims(self, _mock_expiry):
        """Decoded token should contain user_id, role, organization_id, exp."""
        token = create_access_token(
            user_id="user-123",
            role="Tenant",
            organization_id="org-456",
        )
        payload = jwt.decode(
            token,
            os.environ["JWT_SECRET_KEY"],
            algorithms=["HS256"],
        )
        assert payload["user_id"] == "user-123"
        assert payload["role"] == "Tenant"
        assert payload["organization_id"] == "org-456"
        assert "exp" in payload

    @patch("app.core.security._resolve_token_expiry_minutes", return_value=60)
    def test_token_is_string(self, _mock_expiry):
        """Return value should be a string."""
        token = create_access_token("u1", "Admin")
        assert isinstance(token, str)

    @patch("app.core.security._resolve_token_expiry_minutes", return_value=60)
    def test_token_has_three_segments(self, _mock_expiry):
        """JWT should have header.payload.signature format."""
        token = create_access_token("u1", "Tenant")
        assert token.count(".") == 2

    @patch("app.core.security._resolve_token_expiry_minutes", return_value=60)
    def test_organization_id_defaults_to_none(self, _mock_expiry):
        """When organization_id is not passed, it should be None in the token."""
        token = create_access_token("u1", "Admin")
        payload = jwt.decode(
            token,
            os.environ["JWT_SECRET_KEY"],
            algorithms=["HS256"],
        )
        assert payload["organization_id"] is None


class TestDecodeAccessToken:
    """Tests for decode_access_token()."""

    @patch("app.core.security._resolve_token_expiry_minutes", return_value=60)
    def test_roundtrip(self, _mock_expiry):
        """Encoding then decoding should recover the same claims."""
        token = create_access_token("u-99", "Tenant", "org-77")
        payload = decode_access_token(token)
        assert payload["user_id"] == "u-99"
        assert payload["role"] == "Tenant"
        assert payload["organization_id"] == "org-77"

    def test_expired_token_raises(self):
        """An expired token should raise JWTError / ExpiredSignatureError."""
        expired_payload = {
            "user_id": "u1",
            "role": "Tenant",
            "organization_id": None,
            "exp": datetime.utcnow() - timedelta(minutes=10),
        }
        token = jwt.encode(
            expired_payload,
            os.environ["JWT_SECRET_KEY"],
            algorithm="HS256",
        )
        with pytest.raises(Exception):
            decode_access_token(token)

    def test_invalid_signature_raises(self):
        """Token signed with a different secret should raise."""
        payload = {
            "user_id": "u1",
            "role": "Tenant",
            "exp": datetime.utcnow() + timedelta(minutes=60),
        }
        token = jwt.encode(payload, "wrong-secret", algorithm="HS256")
        with pytest.raises(Exception):
            decode_access_token(token)
