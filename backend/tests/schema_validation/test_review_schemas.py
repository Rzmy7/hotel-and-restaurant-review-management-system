"""
Schema validation tests for review module Pydantic models.

Tests ReviewModel, ReviewSummaryModel, PaginatedReviewResponse,
ReplyGenerationRequest, and ReplyGenerationResponse.
"""

import uuid
from datetime import date, datetime

import pytest
from pydantic import ValidationError

from app.modules.reviews.schemas import (
    ReviewModel,
    ReviewSummaryModel,
    PaginatedReviewResponse,
    PaginatedReviewSummaryResponse,
    PhotoModel,
    BookingScrapeRequest,
    ReplyGenerationRequest,
    ReplyGenerationResponse,
)


class TestPhotoModel:
    """Tests for PhotoModel schema."""

    def test_valid_photo(self):
        model = PhotoModel(src="https://example.com/photo.jpg")
        assert model.src == "https://example.com/photo.jpg"
        assert model.alt == ""  # default

    def test_with_alt_text(self):
        model = PhotoModel(src="img.jpg", alt="Hotel lobby")
        assert model.alt == "Hotel lobby"

    def test_rejects_missing_src(self):
        with pytest.raises(ValidationError):
            PhotoModel()


class TestReviewModel:
    """Tests for ReviewModel schema."""

    def test_valid_review(self):
        model = ReviewModel(
            id="rev-1",
            rating=4.5,
            reviewerName="Alice",
            userName="Alice",
            text="Great hotel!",
            reviewText="Great hotel!",
        )
        assert model.id == "rev-1"
        assert model.rating == 4.5
        assert model.reviewerName == "Alice"

    def test_default_sentiment(self):
        """Sentiment should default to 'Neutral'."""
        model = ReviewModel(
            id="rev-2",
            rating=3.0,
            reviewerName="Bob",
            userName="Bob",
            text="Average stay.",
            reviewText="Average stay.",
        )
        assert model.sentiment == "Neutral"

    def test_default_language(self):
        """Language should default to 'English'."""
        model = ReviewModel(
            id="rev-3",
            rating=5.0,
            reviewerName="Charlie",
            userName="Charlie",
            text="Excellent!",
            reviewText="Excellent!",
        )
        assert model.language == "English"

    def test_default_status(self):
        """Status should default to 'pending'."""
        model = ReviewModel(
            id="rev-4",
            rating=2.0,
            reviewerName="Dave",
            userName="Dave",
            text="Poor service.",
            reviewText="Poor service.",
        )
        assert model.status == "pending"

    def test_empty_categories_and_keyphrases(self):
        """Categories and keyPhrases should default to empty lists."""
        model = ReviewModel(
            id="rev-5",
            rating=4.0,
            reviewerName="Eve",
            userName="Eve",
            text="Good.",
            reviewText="Good.",
        )
        assert model.categories == []
        assert model.keyPhrases == []

    def test_with_photos(self):
        model = ReviewModel(
            id="rev-6",
            rating=5.0,
            reviewerName="Frank",
            userName="Frank",
            text="Beautiful view!",
            reviewText="Beautiful view!",
            photos=[{"src": "photo.jpg", "alt": "View"}],
        )
        assert len(model.photos) == 1

    def test_nullable_text(self):
        """Text can be None."""
        model = ReviewModel(
            id="rev-7",
            rating=3.0,
            reviewerName="Grace",
            userName="Grace",
            text=None,
            reviewText=None,
        )
        assert model.text is None

    def test_with_ai_metadata(self):
        """AI processing fields should be accepted."""
        model = ReviewModel(
            id="rev-8",
            rating=4.0,
            reviewerName="Heidi",
            userName="Heidi",
            text="Nice place.",
            reviewText="Nice place.",
            positive_text="Clean rooms",
            negative_text="Slow WiFi",
            retry_count=2,
            ai_reply="Thank you for your review!",
        )
        assert model.positive_text == "Clean rooms"
        assert model.retry_count == 2


class TestReviewSummaryModel:
    """Tests for ReviewSummaryModel schema."""

    def test_valid_summary(self):
        model = ReviewSummaryModel(
            id="rev-1",
            rating=4.0,
            reviewerName="Alice",
            text="Great!",
        )
        assert model.id == "rev-1"
        assert model.sentiment == "Neutral"


class TestPaginatedReviewResponse:
    """Tests for PaginatedReviewResponse schema."""

    def test_valid_response(self):
        model = PaginatedReviewResponse(
            data=[],
            total=0,
            page=1,
            limit=10,
            totalPages=0,
        )
        assert model.total == 0
        assert model.page == 1

    def test_with_data(self):
        review = ReviewModel(
            id="r1",
            rating=5.0,
            reviewerName="Test",
            userName="Test",
            text="Great!",
            reviewText="Great!",
        )
        model = PaginatedReviewResponse(
            data=[review],
            total=1,
            page=1,
            limit=10,
            totalPages=1,
        )
        assert len(model.data) == 1


class TestReplyGenerationRequest:
    """Tests for ReplyGenerationRequest schema."""

    def test_valid_request(self):
        model = ReplyGenerationRequest(
            reviewId="rev-1",
            reviewText="Great hotel, loved the pool!",
        )
        assert model.reviewId == "rev-1"
        assert model.userName == "Guest"  # default
        assert model.tone == "standard"
        assert model.length == "standard"

    def test_with_custom_options(self):
        model = ReplyGenerationRequest(
            reviewId=42,
            reviewText="Excellent service!",
            tone="friendly",
            length="long",
            userName="Alice",
            sentiment="Positive",
            language="English",
        )
        assert model.tone == "friendly"
        assert model.userName == "Alice"

    def test_rejects_empty_review_text(self):
        """reviewText must be at least 1 character."""
        with pytest.raises(ValidationError):
            ReplyGenerationRequest(reviewId="rev-1", reviewText="")

    def test_rejects_missing_review_text(self):
        with pytest.raises(ValidationError):
            ReplyGenerationRequest(reviewId="rev-1")


class TestReplyGenerationResponse:
    """Tests for ReplyGenerationResponse schema."""

    def test_valid_response(self):
        model = ReplyGenerationResponse(
            reply="Thank you for your review!",
            provider="google",
            similarReviewsUsed=3,
            rulesUsed=2,
        )
        assert model.provider == "google"
        assert model.similarReviewsUsed == 3

    def test_with_error(self):
        model = ReplyGenerationResponse(
            reply="Fallback reply",
            provider="google",
            similarReviewsUsed=0,
            rulesUsed=0,
            providerError="API rate limit exceeded",
        )
        assert model.providerError is not None


class TestBookingScrapeRequest:
    """Tests for BookingScrapeRequest schema."""

    def test_valid_url(self):
        model = BookingScrapeRequest(url="https://www.booking.com/hotel/lk/test")
        assert model.headless is True  # default

    def test_headless_false(self):
        model = BookingScrapeRequest(
            url="https://www.booking.com/hotel/lk/test",
            headless=False,
        )
        assert model.headless is False
