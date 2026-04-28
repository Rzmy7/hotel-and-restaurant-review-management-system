"""
Unit tests for app.core.validations.password_validator.

Verifies the password strength rules: minimum length, uppercase,
digit, and symbol requirements.
"""

import pytest
from fastapi import HTTPException

from app.core.validations.password_validator import validate_password_strength


class TestValidatePasswordStrength:
    """Tests for validate_password_strength()."""

    def test_valid_password_passes(self):
        """A strong password should not raise."""
        validate_password_strength("StrongP@ss1")  # No exception

    def test_valid_password_with_all_requirements(self):
        """A password meeting every requirement should pass."""
        validate_password_strength("Abcdefg1!")

    def test_too_short_raises(self):
        """Password under 8 characters should fail."""
        with pytest.raises(HTTPException) as exc_info:
            validate_password_strength("Sh1!")
        assert exc_info.value.status_code == 400
        assert "8 characters" in exc_info.value.detail

    def test_exactly_8_characters_valid(self):
        """Exactly 8 characters meeting all rules should pass."""
        validate_password_strength("Abcdef1!")

    def test_no_uppercase_raises(self):
        """Missing uppercase letter should fail."""
        with pytest.raises(HTTPException) as exc_info:
            validate_password_strength("weakpass1!")
        assert exc_info.value.status_code == 400
        assert "uppercase" in exc_info.value.detail

    def test_no_digit_raises(self):
        """Missing digit should fail."""
        with pytest.raises(HTTPException) as exc_info:
            validate_password_strength("StrongPass!")
        assert exc_info.value.status_code == 400
        assert "number" in exc_info.value.detail

    def test_no_symbol_raises(self):
        """Missing symbol/special character should fail."""
        with pytest.raises(HTTPException) as exc_info:
            validate_password_strength("StrongPass1")
        assert exc_info.value.status_code == 400
        assert "symbol" in exc_info.value.detail

    def test_all_lowercase_with_number_and_symbol_fails(self):
        """Lowercase only + number + symbol should still fail (no uppercase)."""
        with pytest.raises(HTTPException):
            validate_password_strength("abcdefgh1!")

    def test_various_symbols_accepted(self):
        """Various special characters should be accepted."""
        symbols = ["@", "#", "$", "%", "^", "&", "*", "(", ")", "!", "-", "_"]
        for sym in symbols:
            validate_password_strength(f"Abcdefg1{sym}")
