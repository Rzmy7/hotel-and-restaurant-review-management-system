"""
Unit tests for app.core.validations.signup_validator.

Covers email normalization, name validation, realistic domain
checks, and full signup payload validation.
"""

import pytest
from fastapi import HTTPException

from app.core.validations.signup_validator import (
    normalize_signup_email,
    validate_signup_name,
    validate_signup_payload,
    is_realistic_domain,
)


# ── Email normalization ─────────────────────────────────────────────


class TestNormalizeSignupEmail:
    """Tests for normalize_signup_email()."""

    def test_lowercases_email(self):
        """Mixed-case email should be lowered."""
        assert normalize_signup_email("USER@Gmail.COM") == "user@gmail.com"

    def test_strips_whitespace(self):
        """Leading/trailing whitespace should be stripped."""
        assert normalize_signup_email("  user@gmail.com  ") == "user@gmail.com"

    def test_rejects_empty_string(self):
        """Empty or whitespace-only input should fail."""
        with pytest.raises(HTTPException) as exc_info:
            normalize_signup_email("   ")
        assert exc_info.value.status_code == 400
        assert "required" in exc_info.value.detail

    def test_rejects_no_at_sign(self):
        """Email without @ should fail."""
        with pytest.raises(HTTPException) as exc_info:
            normalize_signup_email("usergmail.com")
        assert exc_info.value.status_code == 400

    def test_rejects_unrealistic_tld(self):
        """TLD not in common list (e.g. .kaa) should be rejected."""
        with pytest.raises(HTTPException) as exc_info:
            normalize_signup_email("kalani@kaa.com")
        assert exc_info.value.status_code == 400
        assert "recognized domain" in exc_info.value.detail

    def test_rejects_consecutive_dots_in_local(self):
        """Consecutive dots in local part should be rejected."""
        with pytest.raises(HTTPException) as exc_info:
            normalize_signup_email("user..name@example.com")
        assert exc_info.value.status_code == 400

    def test_rejects_leading_dot_in_local(self):
        """Leading dot in local part should be rejected."""
        with pytest.raises(HTTPException) as exc_info:
            normalize_signup_email(".username@example.com")
        assert exc_info.value.status_code == 400

    def test_rejects_trailing_dot_in_local(self):
        """Trailing dot in local part should be rejected."""
        with pytest.raises(HTTPException) as exc_info:
            normalize_signup_email("username.@example.com")
        assert exc_info.value.status_code == 400

    def test_accepts_valid_gmail(self):
        """Standard Gmail address should pass."""
        assert normalize_signup_email("john@gmail.com") == "john@gmail.com"

    def test_accepts_plus_tag(self):
        """Plus-tagged email should be accepted."""
        result = normalize_signup_email("user+tag@gmail.com")
        assert result == "user+tag@gmail.com"

    def test_accepts_valid_org_domain(self):
        """Valid .org email should pass."""
        result = normalize_signup_email("contact@company.org")
        assert result == "contact@company.org"

    def test_accepts_valid_edu_domain(self):
        """Valid .edu email should pass."""
        result = normalize_signup_email("student@university.edu")
        assert result == "student@university.edu"


# ── Realistic domain check ──────────────────────────────────────────


class TestIsRealisticDomain:
    """Tests for is_realistic_domain()."""

    def test_gmail_is_realistic(self):
        assert is_realistic_domain("gmail.com") is True

    def test_example_com_is_realistic(self):
        assert is_realistic_domain("example.com") is True

    def test_short_domain_rejected(self):
        """Single-letter domain labels should be rejected."""
        assert is_realistic_domain("x.z") is False

    def test_unknown_tld_rejected(self):
        """Non-common TLD should be rejected."""
        assert is_realistic_domain("example.kaa") is False

    def test_subdomain_accepted(self):
        """Subdomains should be accepted if main domain is valid."""
        assert is_realistic_domain("mail.company.com") is True

    def test_empty_string_rejected(self):
        assert is_realistic_domain("") is False

    def test_consecutive_dots_rejected(self):
        assert is_realistic_domain("example..com") is False


# ── Name validation ──────────────────────────────────────────────────


class TestValidateSignupName:
    """Tests for validate_signup_name()."""

    def test_strips_whitespace(self):
        """Leading/trailing whitespace should be stripped."""
        assert validate_signup_name("  Jane Doe  ") == "Jane Doe"

    def test_rejects_empty(self):
        with pytest.raises(HTTPException) as exc_info:
            validate_signup_name("")
        assert exc_info.value.status_code == 400

    def test_rejects_digits(self):
        """Names with digits should be rejected."""
        with pytest.raises(HTTPException) as exc_info:
            validate_signup_name("John123")
        assert exc_info.value.status_code == 400
        assert "letters" in exc_info.value.detail

    def test_accepts_hyphenated_name(self):
        """Hyphenated names should be accepted."""
        assert validate_signup_name("Jean-Pierre") == "Jean-Pierre"

    def test_accepts_apostrophe(self):
        """Names with apostrophes should be accepted."""
        assert validate_signup_name("O'Brien") == "O'Brien"

    def test_rejects_too_short(self):
        """Single character name should be rejected."""
        with pytest.raises(HTTPException):
            validate_signup_name("A")

    def test_rejects_too_long(self):
        """Name over 100 chars should be rejected."""
        with pytest.raises(HTTPException):
            validate_signup_name("A" * 101)

    def test_accepts_two_chars(self):
        """Exactly two character name should be accepted."""
        assert validate_signup_name("Jo") == "Jo"


# ── Full payload validation ──────────────────────────────────────────


class TestValidateSignupPayload:
    """Tests for validate_signup_payload()."""

    def test_happy_path(self):
        """Valid input should return normalized dict."""
        result = validate_signup_payload(
            name="  John Doe  ",
            email="  JOHN.DOE@Example.COM  ",
            password="ValidPass1!",
        )
        assert result["name"] == "John Doe"
        assert result["email"] == "john.doe@example.com"
        assert result["password"] == "ValidPass1!"

    def test_rejects_weak_password(self):
        """Weak password should trigger HTTPException."""
        with pytest.raises(HTTPException) as exc_info:
            validate_signup_payload("John Doe", "john@example.com", "weak")
        assert exc_info.value.status_code == 400

    def test_rejects_bad_email(self):
        """Invalid email should trigger HTTPException."""
        with pytest.raises(HTTPException):
            validate_signup_payload("John Doe", "not-an-email", "ValidPass1!")

    def test_rejects_bad_name(self):
        """Invalid name should trigger HTTPException."""
        with pytest.raises(HTTPException):
            validate_signup_payload("123", "john@example.com", "ValidPass1!")
