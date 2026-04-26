"""
Schema validation tests for auth Pydantic models.

Tests the accept/reject boundaries of SignupModel, LoginModel,
LoginTwoFactorModel, EmailModel, and ResetModel.
"""

import pytest
from pydantic import ValidationError

from app.modules.auth.schemas.auth_schemas import (
    SignupModel,
    LoginModel,
    LoginTwoFactorModel,
    EmailModel,
    ResetModel,
)


class TestSignupModel:
    """Tests for SignupModel schema."""

    def test_valid_signup(self):
        """Well-formed data should be accepted."""
        model = SignupModel(
            name="John Doe",
            email="john@example.com",
            password="ValidPass1!",
        )
        assert model.name == "John Doe"
        assert model.email == "john@example.com"

    def test_rejects_blank_name(self):
        """Whitespace-only name should be rejected."""
        with pytest.raises(ValidationError):
            SignupModel(name="   ", email="john@example.com", password="ValidPass1!")

    def test_rejects_short_name(self):
        """Name shorter than 2 chars should be rejected."""
        with pytest.raises(ValidationError):
            SignupModel(name="J", email="john@example.com", password="ValidPass1!")

    def test_rejects_long_name(self):
        """Name longer than 100 chars should be rejected."""
        with pytest.raises(ValidationError):
            SignupModel(name="A" * 101, email="john@example.com", password="ValidPass1!")

    def test_rejects_short_password(self):
        """Password under 8 chars should be rejected."""
        with pytest.raises(ValidationError):
            SignupModel(name="John Doe", email="john@example.com", password="short")

    def test_rejects_long_password(self):
        """Password over 72 chars should be rejected."""
        with pytest.raises(ValidationError):
            SignupModel(name="John Doe", email="john@example.com", password="A" * 73)

    def test_rejects_invalid_email(self):
        """Malformed email should be rejected."""
        with pytest.raises(ValidationError):
            SignupModel(name="John Doe", email="not-an-email", password="ValidPass1!")

    def test_accepts_email_with_plus(self):
        """Plus-tagged emails should be accepted."""
        model = SignupModel(name="John Doe", email="john+tag@example.com", password="ValidPass1!")
        assert "+" in model.email


class TestLoginModel:
    """Tests for LoginModel schema."""

    def test_valid_login(self):
        model = LoginModel(email="user@example.com", password="Password1!")
        assert model.email == "user@example.com"

    def test_rejects_invalid_email(self):
        with pytest.raises(ValidationError):
            LoginModel(email="bad-email", password="Password1!")

    def test_rejects_short_password(self):
        with pytest.raises(ValidationError):
            LoginModel(email="user@example.com", password="short")

    def test_rejects_missing_email(self):
        with pytest.raises(ValidationError):
            LoginModel(password="Password1!")

    def test_rejects_missing_password(self):
        with pytest.raises(ValidationError):
            LoginModel(email="user@example.com")


class TestLoginTwoFactorModel:
    """Tests for LoginTwoFactorModel schema."""

    def test_valid_2fa(self):
        model = LoginTwoFactorModel(email="user@example.com", code="123456")
        assert model.code == "123456"

    def test_rejects_short_code(self):
        with pytest.raises(ValidationError):
            LoginTwoFactorModel(email="user@example.com", code="12345")

    def test_rejects_long_code(self):
        with pytest.raises(ValidationError):
            LoginTwoFactorModel(email="user@example.com", code="1234567")

    def test_rejects_missing_code(self):
        with pytest.raises(ValidationError):
            LoginTwoFactorModel(email="user@example.com")


class TestEmailModel:
    """Tests for EmailModel schema."""

    def test_valid_email(self):
        model = EmailModel(email="user@example.com")
        assert model.email == "user@example.com"

    def test_rejects_invalid(self):
        with pytest.raises(ValidationError):
            EmailModel(email="not-valid")


class TestResetModel:
    """Tests for ResetModel schema."""

    def test_valid_password(self):
        model = ResetModel(new_password="NewPass123!")
        assert model.new_password == "NewPass123!"

    def test_rejects_empty_password(self):
        with pytest.raises(ValidationError):
            ResetModel(new_password="")

    def test_rejects_long_password(self):
        with pytest.raises(ValidationError):
            ResetModel(new_password="A" * 73)
