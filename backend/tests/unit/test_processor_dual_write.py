"""
Unit tests for the processor dual-write: per-category scores are synced
to BOTH dbo.review_category and dbo.review_aspects with identical rows.
"""

import uuid

from app.modules.reviews.services.processor import _update_review_success


class RecordingCursor:
    """Cursor that records every execute(sql, *params) call."""

    def __init__(self):
        self.calls = []
        self.rowcount = 1

    def execute(self, sql, *params):
        self.calls.append((sql, tuple(params)))
        return self


REVIEW_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"


def _original_review(**overrides):
    review = {
        "id": REVIEW_ID,
        "positive_text": None,
        "negative_text": None,
    }
    review.update(overrides)
    return review


def _analysis(**overrides):
    analysis = {
        "sentiment": "Positive",
        "sentiment_score": 4.2,
        "language": "English",
        "categories": [
            {"name": "Staff", "score": 85},
            {"name": "Cleanliness", "value": 60},
            "Location",
            {"name": ""},  # skipped: empty name
            {"name": "Food", "score": "not-a-number"},  # coerced to 50.0
        ],
        "keyPhrases": ["friendly staff"],
        "summary": "Great experience.",
        "ai_reply": "Thanks!",
    }
    analysis.update(overrides)
    return analysis


def _calls_for_table(calls, table):
    return [c for c in calls if table in c[0]]


class TestDualWrite:
    def test_both_tables_updated_identically(self):
        cursor = RecordingCursor()
        result = _update_review_success(
            cursor, _original_review(), _analysis()
        )
        assert result is True

        cat_calls = _calls_for_table(cursor.calls, "review_category")
        asp_calls = _calls_for_table(cursor.calls, "review_aspects")

        # One DELETE + inserts into each table
        assert sum("DELETE" in sql for sql, _ in cat_calls) == 1
        assert sum("DELETE" in sql for sql, _ in asp_calls) == 1
        inserts_cat = [c for c in cat_calls if "INSERT" in c[0]]
        inserts_asp = [c for c in asp_calls if "INSERT" in c[0]]
        assert len(inserts_cat) == len(inserts_asp) == 4  # Staff, Cleanliness, Location, Food

        # Identical (review_id, name, score) params in both tables
        params_cat = [(p[0], p[1], p[2]) for sql, p in inserts_cat]
        params_asp = [(p[0], p[1], p[2]) for sql, p in inserts_asp]
        assert params_cat == params_asp

        # Spot-check normalization: dict 'value' key, string default, bad float -> 50.0
        by_name = {p[1]: p[2] for p in params_cat}
        assert by_name["Staff"] == 85.0
        assert by_name["Cleanliness"] == 60.0
        assert by_name["Location"] == 420.0  # sentiment_score * 100 fallback
        assert by_name["Food"] == 50.0

    def test_primary_update_runs_first(self):
        cursor = RecordingCursor()
        _update_review_success(cursor, _original_review(), _analysis())

        first_sql = cursor.calls[0][0]
        assert first_sql.strip().upper().startswith("UPDATE DBO.PROCESSED_REVIEW")

    def test_empty_categories_no_inserts(self):
        cursor = RecordingCursor()
        _update_review_success(
            cursor, _original_review(), _analysis(categories=[])
        )

        cat_calls = _calls_for_table(cursor.calls, "review_category")
        asp_calls = _calls_for_table(cursor.calls, "review_aspects")
        assert sum("DELETE" in sql for sql, _ in cat_calls) == 1
        assert sum("INSERT" in sql for sql, _ in cat_calls) == 0
        assert sum("DELETE" in sql for sql, _ in asp_calls) == 1
        assert sum("INSERT" in sql for sql, _ in asp_calls) == 0

    def test_string_only_categories_default_score(self):
        cursor = RecordingCursor()
        _update_review_success(
            cursor, _original_review(), _analysis(categories=["Staff", "Cleanliness"])
        )

        cat_calls = _calls_for_table(cursor.calls, "review_category")
        inserts = [c for c in cat_calls if "INSERT" in c[0]]
        assert len(inserts) == 2
        for sql, p in inserts:
            assert p[2] == 420.0  # sentiment_score fallback for missing scores

    def test_cursor_rowcount_false_returns_false(self):
        cursor = RecordingCursor()
        cursor.rowcount = 0
        assert _update_review_success(cursor, _original_review(), _analysis()) is False

    def test_works_with_real_uuid_review_id(self):
        cursor = RecordingCursor()
        review_id = str(uuid.uuid4())
        ok = _update_review_success(
            cursor, _original_review(id=review_id), _analysis(categories=["Staff"])
        )
        assert ok is True
        inserts_cat = _calls_for_table(cursor.calls, "review_category")
        insert = [c for c in inserts_cat if "INSERT" in c[0]][0]
        assert insert[1][0] == review_id
