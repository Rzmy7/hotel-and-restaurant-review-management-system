"""
Unit tests for app.core.db_utils — shared database utility functions.

Tests pure helper functions (growth calculation, date manipulation,
SQL literal conversion, identifier validation, timestamp formatting).
No actual database connection needed.
"""

from datetime import date, datetime, timedelta

import pytest

from app.core.db_utils import (
    growth,
    month_start,
    shift_month,
    _sql_literal,
    is_valid_sql_identifier,
    to_relative_timestamp,
    to_datetime,
    normalize_string_list,
)



# ── growth() ─────────────────────────────────────────────────────────


class TestGrowth:
    """Tests for growth() — percentage growth calculation."""

    def test_zero_previous_with_current(self):
        """When previous is 0 but current > 0, growth should be 100%."""
        assert growth(5, 0) == 100.0

    def test_zero_both(self):
        """When both are 0, growth should be 0%."""
        assert growth(0, 0) == 0.0

    def test_positive_growth(self):
        """50% increase: 10 → 15."""
        assert growth(15, 10) == 50.0

    def test_negative_growth(self):
        """50% decrease: 10 → 5."""
        assert growth(5, 10) == -50.0

    def test_no_change(self):
        """Same value should return 0.0%."""
        assert growth(10, 10) == 0.0

    def test_double_growth(self):
        """Doubling: 5 → 10 should be 100%."""
        assert growth(10, 5) == 100.0

    def test_result_is_rounded(self):
        """Result should be rounded to 1 decimal place."""
        result = growth(1, 3)  # -66.666...%
        assert result == -66.7


# ── month_start() ────────────────────────────────────────────────────


class TestMonthStart:
    """Tests for month_start()."""

    def test_replaces_day_with_one(self):
        assert month_start(date(2026, 4, 15)) == date(2026, 4, 1)

    def test_already_first_day(self):
        assert month_start(date(2026, 1, 1)) == date(2026, 1, 1)

    def test_last_day_of_month(self):
        assert month_start(date(2026, 3, 31)) == date(2026, 3, 1)


# ── shift_month() ────────────────────────────────────────────────────


class TestShiftMonth:
    """Tests for shift_month()."""

    def test_forward_one_month(self):
        """January → February."""
        assert shift_month(date(2026, 1, 15), 1) == date(2026, 2, 1)

    def test_backward_one_month(self):
        """February → January."""
        assert shift_month(date(2026, 2, 10), -1) == date(2026, 1, 1)

    def test_year_wrap_forward(self):
        """December + 1 → January next year."""
        assert shift_month(date(2026, 12, 1), 1) == date(2027, 1, 1)

    def test_year_wrap_backward(self):
        """January - 1 → December previous year."""
        assert shift_month(date(2026, 1, 1), -1) == date(2025, 12, 1)

    def test_multi_month_shift(self):
        """Shift forward 6 months."""
        assert shift_month(date(2026, 3, 1), 6) == date(2026, 9, 1)


# ── _sql_literal() ───────────────────────────────────────────────────


class TestSqlLiteral:
    """Tests for _sql_literal() — SQL value escaping."""

    def test_none_returns_null(self):
        assert _sql_literal(None) == "NULL"

    def test_string_quoted(self):
        assert _sql_literal("hello") == "'hello'"

    def test_string_single_quote_escaped(self):
        """Single quotes in strings should be doubled."""
        result = _sql_literal("it's")
        assert result == "'it''s'"

    def test_integer(self):
        assert _sql_literal(42) == "42"

    def test_float(self):
        assert _sql_literal(3.14) == "3.14"

    def test_bool_true(self):
        assert _sql_literal(True) == "1"

    def test_bool_false(self):
        assert _sql_literal(False) == "0"

    def test_datetime_formatted(self):
        dt = datetime(2026, 4, 15, 10, 30, 0)
        assert _sql_literal(dt) == "'2026-04-15 10:30:00'"

    def test_date_formatted(self):
        d = date(2026, 4, 15)
        assert _sql_literal(d) == "'2026-04-15'"


# ── is_valid_sql_identifier() ────────────────────────────────────────


class TestIsValidSqlIdentifier:
    """Tests for is_valid_sql_identifier()."""

    def test_valid_simple(self):
        assert is_valid_sql_identifier("user_name") is True

    def test_valid_starts_with_underscore(self):
        assert is_valid_sql_identifier("_temp") is True

    def test_valid_uppercase(self):
        assert is_valid_sql_identifier("TableName") is True

    def test_invalid_starts_with_digit(self):
        assert is_valid_sql_identifier("1table") is False

    def test_invalid_contains_space(self):
        assert is_valid_sql_identifier("my table") is False

    def test_invalid_sql_injection(self):
        assert is_valid_sql_identifier("table; DROP TABLE") is False

    def test_invalid_special_chars(self):
        assert is_valid_sql_identifier("table-name") is False

    def test_empty_string(self):
        assert is_valid_sql_identifier("") is False


# ── to_relative_timestamp() ──────────────────────────────────────────


class TestToRelativeTimestamp:
    """Tests for to_relative_timestamp()."""

    def test_none_returns_just_now(self):
        assert to_relative_timestamp(None) == "just now"

    def test_recent_returns_just_now(self):
        """A timestamp from a few seconds ago should return 'just now'."""
        recent = datetime.now() - timedelta(seconds=30)
        assert to_relative_timestamp(recent) == "just now"

    def test_minutes_ago(self):
        """A timestamp from 5 minutes ago."""
        past = datetime.now() - timedelta(minutes=5)
        result = to_relative_timestamp(past)
        assert "minute" in result

    def test_hours_ago(self):
        """A timestamp from 3 hours ago."""
        past = datetime.now() - timedelta(hours=3)
        result = to_relative_timestamp(past)
        assert "hour" in result

    def test_days_ago(self):
        """A timestamp from 2 days ago."""
        past = datetime.now() - timedelta(days=2)
        result = to_relative_timestamp(past)
        assert "day" in result

    def test_singular_minute(self):
        """Exactly 1 minute ago should use singular form."""
        past = datetime.now() - timedelta(minutes=1, seconds=5)
        result = to_relative_timestamp(past)
        assert "1 minute ago" in result

    def test_date_object_converted(self):
        """A date (not datetime) should be handled gracefully."""
        d = date.today() - timedelta(days=1)
        result = to_relative_timestamp(d)
        assert "day" in result


# ── to_datetime() ────────────────────────────────────────────────────


class TestToDatetime:
    """Tests for to_datetime()."""

    def test_none_returns_none(self):
        assert to_datetime(None) is None

    def test_datetime_passthrough(self):
        dt = datetime(2026, 4, 15, 10, 30)
        assert to_datetime(dt) == dt

    def test_date_converted_to_datetime(self):
        d = date(2026, 4, 15)
        result = to_datetime(d)
        assert isinstance(result, datetime)
        assert result.year == 2026
        assert result.month == 4
        assert result.day == 15

    def test_string_returns_none(self):
        """Non-date/datetime types should return None."""
        assert to_datetime("2026-04-15") is None

    def test_int_returns_none(self):
        assert to_datetime(12345) is None


# ── normalize_string_list() ──────────────────────────────────────────


class TestNormalizeStringList:
    """Tests for normalize_string_list()."""

    def test_none_or_empty_returns_empty_list(self):
        assert normalize_string_list(None) == []
        assert normalize_string_list("") == []

    def test_already_list_of_strings(self):
        """If input is already a list of strings, return it as-is."""
        assert normalize_string_list(["Cleanliness", "Comfort"]) == ["Cleanliness", "Comfort"]

    def test_already_list_of_mixed_objects_and_strings(self):
        """Mixed parsed list with dicts and strings should be normalized."""
        inp = [{"name": "Comfort", "score": 95}, "Cleanliness", None, {"score": 80}]
        assert normalize_string_list(inp) == ["Comfort", "Cleanliness"]

    def test_json_string_list_of_strings(self):
        """Stringified JSON representing a list of strings."""
        assert normalize_string_list('["Cleanliness", "Comfort"]') == ["Cleanliness", "Comfort"]

    def test_json_string_list_of_objects(self):
        """Stringified JSON representing a list of dict objects."""
        inp = '[{"name": "Comfort", "score": 90}, {"name": "Staff", "score": 85}]'
        assert normalize_string_list(inp) == ["Comfort", "Staff"]

    def test_json_string_mixed_objects_and_strings(self):
        """Stringified JSON representing mixed dicts and strings."""
        inp = '[{"name": "Comfort", "score": 90}, "Staff", null, {"score": 80}]'
        assert normalize_string_list(inp) == ["Comfort", "Staff"]

    def test_invalid_json_returns_empty_list(self):
        assert normalize_string_list('["Cleanliness", "Comfort') == []

    def test_json_not_a_list_returns_empty_list(self):
        assert normalize_string_list('{"name": "Comfort"}') == []
        assert normalize_string_list("12345") == []

