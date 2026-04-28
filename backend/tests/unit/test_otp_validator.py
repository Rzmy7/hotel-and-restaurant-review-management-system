"""
Unit tests for app.core.validations.otp_validator.

Covers the standalone OTP format validation function.
"""

import pytest
from fastapi import HTTPException

from app.core.validations.otp_validator import validate_otp_format


class TestValidateOtpFormat:
    """Tests for validate_otp_format()."""

    def test_valid_6_digit_otp(self):
        """A 6-digit string should not raise."""
        validate_otp_format("123456")  # No exception expected

    def test_valid_all_zeros(self):
        """All zeros should be accepted."""
        validate_otp_format("000000")

    def test_valid_all_nines(self):
        """All nines should be accepted."""
        validate_otp_format("999999")

    def test_5_digit_rejected(self):
        """5-digit OTP should be rejected."""
        with pytest.raises(HTTPException) as exc_info:
            validate_otp_format("12345")
        assert exc_info.value.status_code == 400
        assert "6 digits" in exc_info.value.detail

    def test_7_digit_rejected(self):
        """7-digit OTP should be rejected."""
        with pytest.raises(HTTPException) as exc_info:
            validate_otp_format("1234567")
        assert exc_info.value.status_code == 400

    def test_alphabetic_rejected(self):
        """Non-numeric characters should be rejected."""
        with pytest.raises(HTTPException):
            validate_otp_format("abcdef")

    def test_mixed_alphanumeric_rejected(self):
        """Mix of letters and digits should be rejected."""
        with pytest.raises(HTTPException):
            validate_otp_format("12ab56")

    def test_empty_rejected(self):
        """Empty string should be rejected."""
        with pytest.raises(HTTPException):
            validate_otp_format("")

    def test_whitespace_only_rejected(self):
        """Whitespace-only input should be rejected."""
        with pytest.raises(HTTPException):
            validate_otp_format("      ")
