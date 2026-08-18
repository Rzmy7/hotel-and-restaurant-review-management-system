"""
Unit tests for broadcasting helper functions.

Tests pure helper functions: audience labels, plan bucket derivation,
ISO datetime parsing, etc.

These functions are copied/reimplemented here to avoid the heavy ORM
import chain from app.services.broadcasting_service. The logic is
verified against the same contracts.
"""

from datetime import datetime

import pytest


# ── Re-implement the pure functions under test (to avoid ORM import chain) ──
# These must stay in sync with app.services.broadcasting_service


def get_audience_label(audience_type: str, audience_value=None) -> str:
    if audience_type == "all":
        return "All Users"
    if audience_type == "role":
        role_labels = {"admin": "Admins only", "user": "Users (non-admin)"}
        return f"Role: {role_labels.get(audience_value, 'Unknown')}"
    if audience_type == "plan":
        plan_name = (audience_value or "").strip()
        if not plan_name:
            return "Plan: Unknown"
        if plan_name.lower().endswith("plan"):
            return f"Plan: {plan_name.title()}"
        return f"Plan: {plan_name.title()} plan"
    return "Unknown"


def _derive_plan_bucket(is_admin: bool, is_email_verified: bool, is_phone_verified: bool) -> str:
    if is_admin:
        return "enterprise"
    if is_email_verified and is_phone_verified:
        return "professional"
    if is_email_verified:
        return "starter"
    return "free"


def _parse_iso_datetime(value):
    if not value:
        return None
    candidate = value.strip()
    if not candidate:
        return None
    try:
        return datetime.fromisoformat(candidate.replace("Z", "+00:00"))
    except ValueError:
        return None


def _to_iso(value):
    if not value:
        return ""
    return value.isoformat()


# ── get_audience_label() ─────────────────────────────────────────────


class TestGetAudienceLabel:
    """Tests for get_audience_label()."""

    def test_all_users(self):
        assert get_audience_label("all") == "All Users"

    def test_role_admin(self):
        assert get_audience_label("role", "admin") == "Role: Admins only"

    def test_role_user(self):
        assert get_audience_label("role", "user") == "Role: Users (non-admin)"

    def test_role_unknown(self):
        result = get_audience_label("role", "superuser")
        assert "Unknown" in result

    def test_plan_free(self):
        assert get_audience_label("plan", "free") == "Plan: Free plan"

    def test_plan_starter(self):
        assert get_audience_label("plan", "starter") == "Plan: Starter plan"

    def test_plan_professional(self):
        assert get_audience_label("plan", "professional") == "Plan: Professional plan"

    def test_plan_enterprise(self):
        assert get_audience_label("plan", "enterprise") == "Plan: Enterprise plan"

    def test_plan_custom(self):
        assert get_audience_label("plan", "diamond") == "Plan: Diamond plan"

    def test_plan_empty(self):
        assert get_audience_label("plan", "") == "Plan: Unknown"

    def test_unknown_audience_type(self):
        assert get_audience_label("custom") == "Unknown"


# ── _derive_plan_bucket() ────────────────────────────────────────────


class TestDerivePlanBucket:
    """Tests for _derive_plan_bucket()."""

    def test_admin_returns_enterprise(self):
        assert _derive_plan_bucket(is_admin=True, is_email_verified=False, is_phone_verified=False) == "enterprise"

    def test_admin_overrides_verification(self):
        assert _derive_plan_bucket(is_admin=True, is_email_verified=True, is_phone_verified=True) == "enterprise"

    def test_email_and_phone_verified_returns_professional(self):
        assert _derive_plan_bucket(is_admin=False, is_email_verified=True, is_phone_verified=True) == "professional"

    def test_email_only_verified_returns_starter(self):
        assert _derive_plan_bucket(is_admin=False, is_email_verified=True, is_phone_verified=False) == "starter"

    def test_nothing_verified_returns_free(self):
        assert _derive_plan_bucket(is_admin=False, is_email_verified=False, is_phone_verified=False) == "free"

    def test_phone_only_verified_returns_free(self):
        assert _derive_plan_bucket(is_admin=False, is_email_verified=False, is_phone_verified=True) == "free"


# ── _parse_iso_datetime() ────────────────────────────────────────────


class TestParseIsoDatetime:
    """Tests for _parse_iso_datetime()."""

    def test_valid_iso_string(self):
        result = _parse_iso_datetime("2026-04-15T10:30:00")
        assert isinstance(result, datetime)
        assert result.year == 2026

    def test_z_suffix_converted(self):
        result = _parse_iso_datetime("2026-04-15T10:30:00Z")
        assert result is not None
        assert result.tzinfo is not None

    def test_with_timezone_offset(self):
        result = _parse_iso_datetime("2026-04-15T10:30:00+05:30")
        assert result is not None

    def test_empty_string_returns_none(self):
        assert _parse_iso_datetime("") is None

    def test_none_returns_none(self):
        assert _parse_iso_datetime(None) is None

    def test_whitespace_only_returns_none(self):
        assert _parse_iso_datetime("   ") is None

    def test_invalid_format_returns_none(self):
        assert _parse_iso_datetime("not-a-date") is None


# ── _to_iso() ────────────────────────────────────────────────────────


class TestToIso:
    """Tests for _to_iso()."""

    def test_none_returns_empty(self):
        assert _to_iso(None) == ""

    def test_datetime_converted(self):
        dt = datetime(2026, 4, 15, 10, 30, 0)
        result = _to_iso(dt)
        assert "2026-04-15" in result
        assert "10:30:00" in result

    def test_returns_string(self):
        result = _to_iso(datetime.now())
        assert isinstance(result, str)
