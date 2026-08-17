"""
Integration tests for the ML endpoints (/ml/analyze, /ml/reply).

All POST endpoints require the X-Internal-API-Key header (verify_internal_api_key);
health checks stay open. Services are patched at the route layer.
"""

import os
from unittest.mock import patch
from contextlib import asynccontextmanager

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", "sqlite:///test.db")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests")

# Valid key resolved from config (env BACKEND_API_KEYS / INTERNAL_API_KEY)
from app.core.config import BACKEND_API_KEYS  # noqa: E402

INTERNAL_HEADERS = {"X-Internal-API-Key": BACKEND_API_KEYS[0]}


@pytest.fixture(scope="module")
def ml_client():
    """TestClient over the app with a noop lifespan."""
    @asynccontextmanager
    async def _noop_lifespan(app):
        yield

    with patch("app.database.session.engine", None), patch("app.main.engine", None):
        import app.main as main_module

        original_lifespan = main_module.app.router.lifespan_context
        main_module.app.router.lifespan_context = _noop_lifespan

        with TestClient(main_module.app, raise_server_exceptions=False) as c:
            yield c

        main_module.app.router.lifespan_context = original_lifespan


ANALYZE_RESULT = {
    "sentiment": "Negative",
    "sentiment_score": 1.5,
    "categories": [{"name": "Cleanliness", "score": 30}],
    "keyPhrases": ["dirty room"],
    "summary": "Guest was unhappy with cleanliness.",
}


class TestMLAnalyze:
    def test_health_open_without_auth(self, ml_client):
        resp = ml_client.get("/ml/analyze/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"
        assert resp.json()["service"] == "ml-analyze"

    def test_analyze_requires_internal_key(self, ml_client):
        resp = ml_client.post(
            "/ml/analyze",
            json={"text": "Room was dirty and staff rude", "rating": 1},
        )
        assert resp.status_code == 401

    def test_analyze_rejects_wrong_internal_key(self, ml_client):
        resp = ml_client.post(
            "/ml/analyze",
            json={"text": "Room was dirty and staff rude", "rating": 1},
            headers={"X-Internal-API-Key": "wrong-key"},
        )
        assert resp.status_code == 401

    def test_analyze_success(self, ml_client):
        with patch(
            "app.modules.ml.routes.analyze.analyze_single_sentiment",
            return_value=ANALYZE_RESULT,
        ):
            resp = ml_client.post(
                "/ml/analyze",
                json={"text": "Room was dirty and staff rude", "rating": 1},
                headers=INTERNAL_HEADERS,
            )
        assert resp.status_code == 200
        assert resp.json()["sentiment"] == "Negative"
        assert resp.json()["keyPhrases"] == ["dirty room"]

    def test_analyze_requires_text(self, ml_client):
        resp = ml_client.post(
            "/ml/analyze", json={"text": "  "}, headers=INTERNAL_HEADERS
        )
        assert resp.status_code == 400
        assert "text is required" in resp.json()["detail"]

    def test_analyze_batch_requires_internal_key(self, ml_client):
        resp = ml_client.post(
            "/ml/analyze/batch", json={"reviews": [{"text": "Dirty room"}]}
        )
        assert resp.status_code == 401

    def test_analyze_batch_success(self, ml_client):
        with patch(
            "app.modules.ml.routes.analyze.batch_analyze_sentiment",
            return_value=[ANALYZE_RESULT, {"sentiment": "Positive", "sentiment_score": 4.2}],
        ):
            resp = ml_client.post(
                "/ml/analyze/batch",
                json={"reviews": [{"text": "Dirty room"}, {"text": "Great stay"}]},
                headers=INTERNAL_HEADERS,
            )
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_analyze_batch_rejects_missing_text(self, ml_client):
        resp = ml_client.post(
            "/ml/analyze/batch",
            json={"reviews": [{"rating": 3}, {"text": "ok"}]},
            headers=INTERNAL_HEADERS,
        )
        assert resp.status_code == 400
        assert "index 0" in resp.json()["detail"]

    def test_analyze_batch_rejects_over_10(self, ml_client):
        reviews = [{"text": f"review {i}"} for i in range(11)]
        resp = ml_client.post(
            "/ml/analyze/batch", json={"reviews": reviews}, headers=INTERNAL_HEADERS
        )
        assert resp.status_code == 400
        assert "Maximum 10" in resp.json()["detail"]

    def test_analyze_raw_success(self, ml_client):
        with patch(
            "app.modules.ml.routes.analyze.analyze_reviews_batch",
            return_value={"raw-analysis": {"sentiment": "Neutral"}},
        ):
            resp = ml_client.post(
                "/ml/analyze/raw",
                json={"text": "Okay stay"},
                headers=INTERNAL_HEADERS,
            )
        assert resp.status_code == 200
        assert resp.json()["analysis"] == {"sentiment": "Neutral"}

    def test_analyze_raw_requires_text(self, ml_client):
        resp = ml_client.post(
            "/ml/analyze/raw", json={"text": ""}, headers=INTERNAL_HEADERS
        )
        assert resp.status_code == 400


class TestMLReply:
    def test_health_open_without_auth(self, ml_client):
        resp = ml_client.get("/ml/reply/health")
        assert resp.status_code == 200
        assert resp.json()["service"] == "ml-reply"

    def test_reply_requires_internal_key(self, ml_client):
        resp = ml_client.post(
            "/ml/reply",
            json={"reviewText": "The bed was uncomfortable", "sentiment": "Negative"},
        )
        assert resp.status_code == 401

    def test_reply_success(self, ml_client):
        with patch(
            "app.modules.ml.routes.reply.generate_review_reply",
            return_value={"reply": "We're sorry to hear that...", "provider": "test-model",
                          "similarReviewsUsed": 2, "rulesUsed": 1},
        ):
            resp = ml_client.post(
                "/ml/reply",
                json={"reviewText": "The bed was uncomfortable", "sentiment": "Negative"},
                headers=INTERNAL_HEADERS,
            )
        assert resp.status_code == 200
        body = resp.json()
        assert body["reply"].startswith("We're sorry")
        assert body["provider"] == "test-model"

    def test_reply_requires_review_text(self, ml_client):
        resp = ml_client.post(
            "/ml/reply", json={"reviewText": ""}, headers=INTERNAL_HEADERS
        )
        assert resp.status_code == 400
        assert "reviewText is required" in resp.json()["detail"]

    def test_reply_batch_success(self, ml_client):
        with patch(
            "app.modules.ml.routes.reply.generate_review_reply",
            side_effect=[{"reply": "Thanks!"}, {"reply": "Sorry!"}],
        ):
            resp = ml_client.post(
                "/ml/reply/batch",
                json={"reviews": [{"reviewText": "Nice place"}, {"reviewText": "Noisy"}]},
                headers=INTERNAL_HEADERS,
            )
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 2
        assert body["success"] == 2
        assert body["results"][0]["reply"] == "Thanks!"

    def test_reply_batch_handles_missing_text(self, ml_client):
        resp = ml_client.post(
            "/ml/reply/batch",
            json={"reviews": [{"reviewText": ""}, {"reviewText": "Fine"}]},
            headers=INTERNAL_HEADERS,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 2
        assert body["success"] == 1
        assert body["results"][0]["error"] == "Missing reviewText"

    def test_reply_batch_rejects_over_5(self, ml_client):
        reviews = [{"reviewText": f"text {i}"} for i in range(6)]
        resp = ml_client.post(
            "/ml/reply/batch", json={"reviews": reviews}, headers=INTERNAL_HEADERS
        )
        assert resp.status_code == 400
        assert "Maximum 5" in resp.json()["detail"]
