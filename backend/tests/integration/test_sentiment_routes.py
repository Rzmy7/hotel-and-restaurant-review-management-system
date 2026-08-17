"""
Integration tests for the Sentiment routes (/api/reviews/sentiment/*).
Covers stats, timeline, single analyze, and batch analyze.
"""

import os
import uuid
from unittest.mock import MagicMock, patch
from contextlib import asynccontextmanager

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", "sqlite:///test.db")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests")

TEST_USER_ID = "11111111-1111-1111-1111-111111111111"
TEST_OWNED_ORG_ID = "22222222-2222-2222-2222-222222222222"

RegularUser = {
    "user_id": TEST_USER_ID,
    "role": "Tenant",
    "organization_id": TEST_OWNED_ORG_ID,
}


@pytest.fixture(scope="module")
def sentiment_client():
    """TestClient for sentiment routes with mocked db + auth."""
    @asynccontextmanager
    async def _noop_lifespan(app):
        yield

    with patch("app.database.session.engine", None), patch("app.main.engine", None):
        import app.main as main_module

        original_lifespan = main_module.app.router.lifespan_context
        main_module.app.router.lifespan_context = _noop_lifespan

        from app.database.session import get_db
        from app.database import get_db as get_db_core
        from app.core.dependencies import get_current_user as core_get_user
        from app.modules.auth.utils.auth_utils import get_current_user as auth_get_user

        mock_session = MagicMock()

        def _override_get_db():
            yield mock_session

        def _override_get_user():
            return RegularUser

        main_module.app.dependency_overrides[get_db] = _override_get_db
        main_module.app.dependency_overrides[get_db_core] = _override_get_db
        main_module.app.dependency_overrides[core_get_user] = _override_get_user
        main_module.app.dependency_overrides[auth_get_user] = _override_get_user

        with TestClient(main_module.app, raise_server_exceptions=False) as c:
            yield c

        main_module.app.dependency_overrides.clear()
        main_module.app.router.lifespan_context = original_lifespan


class TestSentimentStats:
    def test_stats_success(self, sentiment_client):
        stats = {
            "distribution": {"Positive": 10, "Neutral": 4, "Negative": 2},
            "percentages": {"Positive": 62.5, "Neutral": 25.0, "Negative": 12.5},
            "averageScore": 4.1,
        }
        with patch(
            "app.modules.reviews.routes.sentiment.get_sentiment_stats",
            return_value=stats,
        ):
            resp = sentiment_client.get(
                f"/api/reviews/sentiment/stats/{TEST_OWNED_ORG_ID}?period_days=30"
            )
        assert resp.status_code == 200
        body = resp.json()
        assert body["distribution"]["Positive"] == 10
        assert body["averageScore"] == 4.1

    def test_stats_service_error_returns_500(self, sentiment_client):
        with patch(
            "app.modules.reviews.routes.sentiment.get_sentiment_stats",
            side_effect=RuntimeError("boom"),
        ):
            resp = sentiment_client.get(
                f"/api/reviews/sentiment/stats/{TEST_OWNED_ORG_ID}"
            )
        assert resp.status_code == 500


class TestSentimentTimeline:
    def test_timeline_success_wraps_data(self, sentiment_client):
        timeline = [
            {"week": "2026-08-10", "positivePct": 70.0, "negativePct": 10.0,
             "neutralPct": 20.0, "total": 10, "avgScore": 4.0}
        ]
        with patch(
            "app.modules.reviews.routes.sentiment.get_sentiment_timeline",
            return_value=timeline,
        ):
            resp = sentiment_client.get(
                f"/api/reviews/sentiment/timeline/{TEST_OWNED_ORG_ID}?period_days=30&bucket_days=7"
            )
        assert resp.status_code == 200
        body = resp.json()
        assert body["org_id"] == TEST_OWNED_ORG_ID
        assert body["period_days"] == 30
        assert body["bucket_days"] == 7
        assert body["data"][0]["avgScore"] == 4.0

    def test_timeline_service_error_returns_500(self, sentiment_client):
        with patch(
            "app.modules.reviews.routes.sentiment.get_sentiment_timeline",
            side_effect=RuntimeError("boom"),
        ):
            resp = sentiment_client.get(
                f"/api/reviews/sentiment/timeline/{TEST_OWNED_ORG_ID}"
            )
        assert resp.status_code == 500


class TestAnalyzeSentiment:
    def test_analyze_success(self, sentiment_client):
        result = {
            "sentiment": "Negative",
            "sentiment_score": 1.5,
            "categories": [{"name": "Cleanliness", "score": 30}],
            "keyPhrases": ["dirty room"],
        }
        with patch(
            "app.modules.reviews.routes.sentiment.analyze_single_sentiment",
            return_value=result,
        ):
            resp = sentiment_client.post(
                "/api/reviews/sentiment/analyze",
                json={"text": "Room was dirty", "rating": 1},
            )
        assert resp.status_code == 200
        assert resp.json()["sentiment"] == "Negative"

    def test_analyze_requires_text(self, sentiment_client):
        resp = sentiment_client.post("/api/reviews/sentiment/analyze", json={"text": ""})
        assert resp.status_code == 400
        assert "text is required" in resp.json()["detail"]

    def test_analyze_service_error_returns_500(self, sentiment_client):
        with patch(
            "app.modules.reviews.routes.sentiment.analyze_single_sentiment",
            side_effect=RuntimeError("boom"),
        ):
            resp = sentiment_client.post(
                "/api/reviews/sentiment/analyze", json={"text": "Great stay"}
            )
        assert resp.status_code == 500


class TestBatchAnalyzeSentiment:
    def test_batch_success(self, sentiment_client):
        result = [
            {"sentiment": "Positive", "sentiment_score": 4.5},
            {"sentiment": "Negative", "sentiment_score": 1.0},
        ]
        with patch(
            "app.modules.reviews.routes.sentiment.batch_analyze_sentiment",
            return_value=result,
        ):
            resp = sentiment_client.post(
                "/api/reviews/sentiment/batch-analyze",
                json={"reviews": [{"text": "Lovely"}, {"text": "Noisy"}]},
            )
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_batch_requires_reviews_array(self, sentiment_client):
        resp = sentiment_client.post("/api/reviews/sentiment/batch-analyze", json={})
        assert resp.status_code == 400
        assert "reviews array is required" in resp.json()["detail"]

    def test_batch_rejects_over_10(self, sentiment_client):
        reviews = [{"text": f"review {i}"} for i in range(11)]
        resp = sentiment_client.post(
            "/api/reviews/sentiment/batch-analyze", json={"reviews": reviews}
        )
        assert resp.status_code == 400
        assert "Maximum 10" in resp.json()["detail"]

    def test_batch_rejects_missing_text(self, sentiment_client):
        resp = sentiment_client.post(
            "/api/reviews/sentiment/batch-analyze",
            json={"reviews": [{"rating": 3}, {"text": "ok"}]},
        )
        assert resp.status_code == 400
        assert "index 0" in resp.json()["detail"]
