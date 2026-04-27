"""
Unit tests for app.core.validations.login_validator.

Covers login payload normalization and OTP code format validation.
"""

import pytest
from fastapi import HTTPException

from app.core.validations.login_validator import (
    validate_login_email,
    validate_login_payload,
    validate_login_otp_code,
)


class TestValidateLoginPayload:
    """Tests for validate_login_payload()."""

    def test_normalizes_email_and_password(self):
        """Valid login payload should normalize email, pass-through password."""
        result = validate_login_payload(
            email="  USER@Gmail.COM  ",
            password="MyPassword123!",
        )
        assert result["email"] == "user@gmail.com"
        assert result["password"] == "MyPassword123!"

    def test_rejects_invalid_email(self):
        """Invalid email should trigger HTTPException."""
        with pytest.raises(HTTPException):
            validate_login_payload("not-an-email", "Password1!")


class TestValidateLoginEmail:
    """Tests for validate_login_email()."""

    def test_lowercases_and_strips(self):
        result = validate_login_email("  Admin@Company.ORG  ")
        assert result == "admin@company.org"

    def test_rejects_empty(self):
        with pytest.raises(HTTPException):
            validate_login_email("")


class TestValidateLoginOtpCode:
    """Tests for validate_login_otp_code()."""

    def test_valid_6_digit_code(self):
        """A 6-digit string should pass."""
        assert validate_login_otp_code("123456") == "123456"

    def test_strips_whitespace(self):
        """Leading/trailing whitespace should be stripped."""
        assert validate_login_otp_code("  654321  ") == "654321"

    def test_rejects_letters(self):
        """Alphabetic characters should be rejected."""
        with pytest.raises(HTTPException) as exc_info:
            validate_login_otp_code("abc123")
        assert exc_info.value.status_code == 400
        assert "6-digit" in exc_info.value.detail

    def test_rejects_5_digits(self):
        """5-digit code should be rejected."""
        with pytest.raises(HTTPException):
            validate_login_otp_code("12345")

    def test_rejects_7_digits(self):
        """7-digit code should be rejected."""
        with pytest.raises(HTTPException):
            validate_login_otp_code("1234567")

    def test_rejects_empty(self):
        """Empty string should be rejected."""
        with pytest.raises(HTTPException) as exc_info:
            validate_login_otp_code("")
        assert exc_info.value.status_code == 400
        assert "required" in exc_info.value.detail

    def test_rejects_special_characters(self):
        """Special characters should be rejected."""
        with pytest.raises(HTTPException):
            validate_login_otp_code("12345!")
