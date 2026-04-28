"""
Schema validation tests for Pydantic request models in app.main.

Tests accept/reject boundaries for ReviewItem, BatchEmbedRequest,
SearchRequest, RuleItem, BatchRuleEmbedRequest, and ThresholdConfig.
"""

import pytest
from pydantic import ValidationError

from app.main import (
    ReviewItem,
    BatchEmbedRequest,
    SearchRequest,
    RuleItem,
    BatchRuleEmbedRequest,
    ThresholdConfig,
)



# ── ReviewItem ───────────────────────────────────────────────────────


class TestReviewItemSchema:
    """Tests for ReviewItem model."""

    def test_valid(self):
        item = ReviewItem(review_id="rev-1", text="Nice place")
        assert item.review_id == "rev-1"

    def test_rejects_missing_review_id(self):
        with pytest.raises(ValidationError):
            ReviewItem(text="Hello")

    def test_rejects_missing_text(self):
        with pytest.raises(ValidationError):
            ReviewItem(review_id="rev-1")


# ── BatchEmbedRequest ────────────────────────────────────────────────


class TestBatchEmbedRequestSchema:
    """Tests for BatchEmbedRequest model."""

    def test_valid_batch(self):
        batch = BatchEmbedRequest(
            source_id="src-1",
            reviews=[
                ReviewItem(review_id="r1", text="Great!"),
                ReviewItem(review_id="r2", text="Good!"),
            ],
        )
        assert batch.source_id == "src-1"
        assert len(batch.reviews) == 2

    def test_empty_reviews_accepted(self):
        batch = BatchEmbedRequest(source_id="src-1", reviews=[])
        assert len(batch.reviews) == 0

    def test_rejects_missing_source_id(self):
        with pytest.raises(ValidationError):
            BatchEmbedRequest(
                reviews=[ReviewItem(review_id="r1", text="Hello")],
            )

    def test_rejects_missing_reviews(self):
        with pytest.raises(ValidationError):
            BatchEmbedRequest(source_id="src-1")

    def test_large_batch(self):
        """100 reviews should be accepted."""
        batch = BatchEmbedRequest(
            source_id="src-1",
            reviews=[ReviewItem(review_id=f"r{i}", text=f"Review {i}") for i in range(100)],
        )
        assert len(batch.reviews) == 100


# ── SearchRequest ────────────────────────────────────────────────────


class TestSearchRequestSchema:
    """Tests for SearchRequest model."""

    def test_valid_search(self):
        sr = SearchRequest(query="pool", source_ids=["src-1"])
        assert sr.query == "pool"
        assert sr.top_k == 3  # default

    def test_custom_top_k(self):
        sr = SearchRequest(query="service", source_ids=["src-1"], top_k=10)
        assert sr.top_k == 10

    def test_multiple_source_ids(self):
        sr = SearchRequest(query="clean", source_ids=["src-1", "src-2", "src-3"])
        assert len(sr.source_ids) == 3

    def test_rejects_missing_query(self):
        with pytest.raises(ValidationError):
            SearchRequest(source_ids=["src-1"])

    def test_rejects_missing_source_ids(self):
        with pytest.raises(ValidationError):
            SearchRequest(query="pool")

    def test_empty_source_ids_accepted(self):
        """Empty list is structurally valid (business logic handles it)."""
        sr = SearchRequest(query="pool", source_ids=[])
        assert len(sr.source_ids) == 0



# ── RuleItem ─────────────────────────────────────────────────────────


class TestRuleItemSchema:
    """Tests for RuleItem model."""

    def test_valid(self):
        item = RuleItem(rule_id="rule-1", text="Be polite")
        assert item.rule_id == "rule-1"

    def test_rejects_missing_fields(self):
        with pytest.raises(ValidationError):
            RuleItem(rule_id="rule-1")
        with pytest.raises(ValidationError):
            RuleItem(text="Be polite")


# ── BatchRuleEmbedRequest ────────────────────────────────────────────


class TestBatchRuleEmbedRequestSchema:
    """Tests for BatchRuleEmbedRequest model."""

    def test_valid_batch(self):
        batch = BatchRuleEmbedRequest(
            source_id="src-1",
            rules=[
                RuleItem(rule_id="r1", text="Always apologize"),
                RuleItem(rule_id="r2", text="Offer compensation"),
            ],
        )
        assert len(batch.rules) == 2

    def test_empty_rules_accepted(self):
        batch = BatchRuleEmbedRequest(source_id="src-1", rules=[])
        assert len(batch.rules) == 0

    def test_rejects_missing_source_id(self):
        with pytest.raises(ValidationError):
            BatchRuleEmbedRequest(rules=[RuleItem(rule_id="r1", text="Hello")])

    def test_rejects_missing_rules(self):
        with pytest.raises(ValidationError):
            BatchRuleEmbedRequest(source_id="src-1")


# ── ThresholdConfig ──────────────────────────────────────────────────


class TestThresholdConfigSchema:
    """Tests for ThresholdConfig model."""

    def test_valid_thresholds(self):
        tc = ThresholdConfig(oneWord=1.3, twoWords=1.2, threeOrMore=1.1)
        assert tc.oneWord == 1.3
        assert tc.twoWords == 1.2
        assert tc.threeOrMore == 1.1

    def test_float_values(self):
        tc = ThresholdConfig(oneWord=0.5, twoWords=0.4, threeOrMore=0.3)
        assert isinstance(tc.oneWord, float)

    def test_rejects_missing_oneWord(self):
        with pytest.raises(ValidationError):
            ThresholdConfig(twoWords=1.2, threeOrMore=1.1)

    def test_rejects_missing_twoWords(self):
        with pytest.raises(ValidationError):
            ThresholdConfig(oneWord=1.3, threeOrMore=1.1)

    def test_rejects_missing_threeOrMore(self):
        with pytest.raises(ValidationError):
            ThresholdConfig(oneWord=1.3, twoWords=1.2)

    def test_zero_values_accepted(self):
        tc = ThresholdConfig(oneWord=0.0, twoWords=0.0, threeOrMore=0.0)
        assert tc.oneWord == 0.0

    def test_high_values_accepted(self):
        """Values up to 2.0 are valid (business rule enforced in route)."""
        tc = ThresholdConfig(oneWord=2.0, twoWords=2.0, threeOrMore=2.0)
        assert tc.threeOrMore == 2.0

    def test_integer_coerced_to_float(self):
        tc = ThresholdConfig(oneWord=1, twoWords=1, threeOrMore=1)
        assert isinstance(tc.oneWord, (int, float))
