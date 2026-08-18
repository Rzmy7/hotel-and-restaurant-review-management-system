"""
Unit tests for app.modules.reviews.repository.get_review_options.

Verifies categories data processing including:
- case-insensitive deduplication
- preserved first-occurrence casing
- alphabetical sorting
- ignoring None, empty, and whitespace-only values
"""

import pytest
from unittest.mock import MagicMock
from app.modules.reviews.repository import get_review_options


class TestGetReviewOptions:
    """Tests for get_review_options database queries and Python-side category sanitization."""

    def test_get_review_options_sanitization(self):
        """Verify the parsing and deduplication of categories returned from SQL Server."""
        # Setup mock db and query returns
        mock_db = MagicMock()
        
        # 1. Mock sources query
        mock_query = mock_db.query.return_value
        mock_join = mock_query.join.return_value
        mock_filter = mock_join.filter.return_value
        mock_distinct = mock_filter.distinct.return_value
        mock_distinct.all.return_value = [("Google",), ("TripAdvisor",)]

        # 2. Mock execute for categories
        # We simulate the exact rows that would be returned by the SQL query:
        # SELECT DISTINCT CASE WHEN c.type = 5 THEN JSON_VALUE(c.value, '$.name') ELSE c.value END
        # This matches the user's explicit category dataset test cases:
        mock_db.execute.return_value.fetchall.return_value = [
            ("Food",),                   # from ["Food"]
            ("Food",),                   # from [{"name": "Food"}] (Mixed object + string duplicate)
            (" food ",),                 # from " food " (needs trimming)
            ("Food",),                   # from "Food"
            ("food",),                   # from "food" (case-insensitive duplicate)
            (None,),                     # from null / empty / missing "name" property
            ("",),                       # empty string
            ("   ",),                    # whitespace-only
            ("WiFi",),                   # preserves special casing
            ("AI Generated",),           # preserves special casing without bad title() normalization
        ]

        # Call function
        result = get_review_options(organization_id="test_org_123", db=mock_db)

        # Expected category processing:
        # - "Food" (first occurrence preserved, case-insensitive)
        # - " food " trimmed to "Food", matched with "Food"
        # - "food" matches "Food" (casefold), ignored
        # - None, empty string, whitespace-only ignored
        # - "WiFi" preserved
        # - "AI Generated" preserved
        # - Sorted alphabetically case-insensitively: "AI Generated", "Food", "WiFi"
        assert result["sources"] == ["Google", "TripAdvisor"]
        assert result["categories"] == ["AI Generated", "Food", "WiFi"]

        # Ensure correct org_id was passed to queries
        mock_join.filter.assert_called_once()
        call_args = mock_db.execute.call_args
        assert call_args.args[1] == {"org_id": "test_org_123"}
