"""
Integration tests for embedding service API routes.

Uses FastAPI TestClient with mocked embedding model and ChromaDB
collection to test all endpoints end-to-end without real ML models
or persistent vector storage.
"""

import os
from unittest.mock import MagicMock, patch
from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.chroma import collection
from app.jobs import jobs_queue


# ── Fixtures ─────────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def reset_jobs():
    """Clear jobs queue before each test."""
    jobs_queue.clear()
    yield


@pytest.fixture
def client(mock_collection, temp_config_file, temp_jobs_file):
    """TestClient with mocked ChromaDB collection and config."""
    with patch("app.main.collection", mock_collection), \
         patch("app.chroma.collection", mock_collection), \
         patch("app.config.CONFIG_FILE", temp_config_file), \
         patch("app.jobs.JOBS_FILE", str(temp_jobs_file)):
        with TestClient(app) as c:
            c.headers.update({"X-Internal-API-Key": os.getenv("INTERNAL_API_KEY", "dev-internal-secret")})
            yield c


# ── POST /embed ──────────────────────────────────────────────────────


class TestEmbedEndpoint:
    """Tests for POST /embed (batch review embedding)."""

    def test_embed_success(self, client):
        response = client.post("/embed", json={
            "source_id": "src-1",
            "reviews": [
                {"review_id": "r1", "text": "Great!"},
                {"review_id": "r2", "text": "Good!"},
            ],
        })
        assert response.status_code == 200
        data = response.json()
        assert data["embedded_count"] == 2
        assert data["embedded_ids"] == ["r1", "r2"]
        assert data["failed"] == []
        assert "job_id" in data

    def test_embed_single_review(self, client):
        response = client.post("/embed", json={
            "source_id": "src-1",
            "reviews": [
                {"review_id": "rev-1", "text": "Great hotel with amazing pool!"},
            ],
        })
        assert response.status_code == 200
        data = response.json()
        assert data["embedded_count"] == 1
        assert data["embedded_ids"] == ["rev-1"]

    def test_embed_empty_reviews(self, client):
        response = client.post("/embed", json={
            "source_id": "src-1",
            "reviews": [],
        })
        assert response.status_code == 200
        data = response.json()
        assert data["embedded_count"] == 0

    def test_embed_missing_source_id_returns_422(self, client):
        response = client.post("/embed", json={
            "reviews": [{"review_id": "r1", "text": "Hello"}],
        })
        assert response.status_code == 422


# ── POST /embed/rule ─────────────────────────────────────────────────


class TestEmbedRuleEndpoint:
    """Tests for POST /embed/rule (batch rule embedding)."""

    def test_embed_rule_success(self, client):
        response = client.post("/embed/rule", json={
            "source_id": "src-1",
            "rules": [
                {"rule_id": "r1", "text": "Be polite"},
                {"rule_id": "r2", "text": "Offer refund if needed"},
            ],
        })
        assert response.status_code == 200
        data = response.json()
        assert data["embedded_count"] == 2
        assert data["failed"] == []

    def test_embed_rule_single(self, client):
        response = client.post("/embed/rule", json={
            "source_id": "src-1",
            "rules": [
                {"rule_id": "rule-1", "text": "Always apologize for inconvenience"},
            ],
        })
        assert response.status_code == 200
        data = response.json()
        assert data["embedded_count"] == 1

    def test_embed_rule_empty_rules(self, client):
        response = client.post("/embed/rule", json={
            "source_id": "src-1",
            "rules": [],
        })
        assert response.status_code == 200
        assert response.json()["embedded_count"] == 0


# ── POST /search ─────────────────────────────────────────────────────


class TestSearchEndpoint:
    """Tests for POST /search."""

    def test_search_returns_results_structure(self, client):
        response = client.post("/search", json={
            "query": "swimming pool",
            "source_ids": ["src-1"],
        })
        assert response.status_code == 200
        data = response.json()
        assert "query" in data
        assert "threshold" in data
        assert "reviews" in data
        assert "rules" in data

    def test_search_echoes_query(self, client):
        response = client.post("/search", json={
            "query": "clean rooms",
            "source_ids": ["src-1"],
        })
        data = response.json()
        assert data["query"] == "clean rooms"

    def test_search_default_top_k(self, client):
        """Default top_k should be 3."""
        response = client.post("/search", json={
            "query": "pool",
            "source_ids": ["src-1"],
        })
        assert response.status_code == 200

    def test_search_custom_top_k(self, client):
        response = client.post("/search", json={
            "query": "food quality",
            "source_ids": ["src-1"],
            "top_k": 10,
        })
        assert response.status_code == 200

    def test_search_multiple_sources(self, client):
        response = client.post("/search", json={
            "query": "wifi",
            "source_ids": ["src-1", "src-2"],
        })
        assert response.status_code == 200

    def test_search_missing_query_returns_422(self, client):
        response = client.post("/search", json={
            "source_ids": ["src-1"],
        })
        assert response.status_code == 422


# ── GET / PUT /thresholds ────────────────────────────────────────────


class TestThresholdsEndpoints:
    """Tests for GET/PUT /thresholds and POST /thresholds/reset."""

    def test_get_thresholds(self, client):
        response = client.get("/thresholds")
        assert response.status_code == 200
        data = response.json()
        assert "oneWord" in data
        assert "twoWords" in data
        assert "threeOrMore" in data

    def test_update_thresholds(self, client):
        response = client.put("/thresholds", json={
            "oneWord": 1.5,
            "twoWords": 1.4,
            "threeOrMore": 1.3,
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["thresholds"]["oneWord"] == 1.5

    def test_update_thresholds_invalid_range(self, client):
        """Values > 2.0 should return 400."""
        response = client.put("/thresholds", json={
            "oneWord": 3.0,
            "twoWords": 1.4,
            "threeOrMore": 1.3,
        })
        assert response.status_code == 400

    def test_update_thresholds_negative_value(self, client):
        """Negative values should return 400."""
        response = client.put("/thresholds", json={
            "oneWord": -0.5,
            "twoWords": 1.2,
            "threeOrMore": 1.1,
        })
        assert response.status_code == 400

    def test_reset_thresholds(self, client):
        """Reset should restore defaults."""
        # First change them
        client.put("/thresholds", json={
            "oneWord": 1.5, "twoWords": 1.4, "threeOrMore": 1.3,
        })
        # Then reset
        response = client.post("/thresholds/reset")
        assert response.status_code == 200
        data = response.json()
        assert data["thresholds"]["oneWord"] == 1.3
        assert data["thresholds"]["twoWords"] == 1.2
        assert data["thresholds"]["threeOrMore"] == 1.1


# ── GET /jobs/recent ─────────────────────────────────────────────────


class TestJobsEndpoint:
    """Tests for GET /jobs/recent."""

    def test_empty_jobs(self, client):
        response = client.get("/jobs/recent")
        assert response.status_code == 200
        data = response.json()
        assert data["jobs"] == []

    def test_jobs_after_embed(self, client):
        """After embedding a review, a job should appear."""
        client.post("/embed", json={
            "source_id": "src-1",
            "reviews": [
                {"review_id": "rev-1", "text": "Great hotel!"},
            ],
        })
        response = client.get("/jobs/recent")
        data = response.json()
        assert len(data["jobs"]) >= 1

    def test_jobs_limit_param(self, client):
        response = client.get("/jobs/recent?limit=5")
        assert response.status_code == 200


# ── POST /service/pause and /service/resume ──────────────────────────


class TestServicePauseEndpoints:
    """Tests for POST /service/pause, /service/resume, GET /service/status."""

    def test_pause_service(self, client):
        response = client.post("/service/pause")
        assert response.status_code == 200
        data = response.json()
        assert data["isPaused"] is True

    def test_resume_service(self, client):
        client.post("/service/pause")
        response = client.post("/service/resume")
        assert response.status_code == 200
        data = response.json()
        assert data["isPaused"] is False

    def test_get_status_running(self, client):
        response = client.get("/service/status")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "running"
        assert data["isPaused"] is False

    def test_get_status_paused(self, client):
        client.post("/service/pause")
        response = client.get("/service/status")
        data = response.json()
        assert data["status"] == "paused"
        assert data["isPaused"] is True


# ── GET /health ──────────────────────────────────────────────────────


class TestHealthEndpoint:
    """Tests for GET /health."""

    def test_health_returns_200(self, client):
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_contains_required_fields(self, client):
        data = client.get("/health").json()
        assert "status" in data
        assert "cpu_usage" in data
        assert "ram_usage" in data
        assert "uptime" in data

    def test_health_status_online(self, client):
        data = client.get("/health").json()
        # Could be Online or Warning depending on load
        assert data["status"] in ("Online", "Warning")

    def test_health_cpu_is_numeric(self, client):
        data = client.get("/health").json()
        assert isinstance(data["cpu_usage"], (int, float))

    def test_health_ram_is_numeric(self, client):
        data = client.get("/health").json()
        assert isinstance(data["ram_usage"], (int, float))


# ── GET /database/stats ──────────────────────────────────────────────


class TestDatabaseStatsEndpoint:
    """Tests for GET /database/stats."""

    def test_returns_200(self, client):
        response = client.get("/database/stats")
        assert response.status_code == 200

    def test_contains_required_fields(self, client):
        data = client.get("/database/stats").json()
        assert "totalVectors" in data
        assert "namespace" in data
        assert "dimensions" in data
        assert "indexType" in data
        assert "storage" in data
        assert "isHealthy" in data

    def test_namespace_is_hotel_reviews(self, client):
        data = client.get("/database/stats").json()
        assert data["namespace"] == "hotel_reviews"

    def test_index_type_is_hnsw(self, client):
        data = client.get("/database/stats").json()
        assert data["indexType"] == "HNSW"

    def test_dimensions_is_384(self, client):
        data = client.get("/database/stats").json()
        assert data["dimensions"] == 384

    def test_is_healthy(self, client):
        data = client.get("/database/stats").json()
        assert data["isHealthy"] is True


# ── POST /database/clear ─────────────────────────────────────────────


class TestDatabaseClearEndpoint:
    """Tests for POST /database/clear."""

    def test_clear_returns_success(self, client):
        response = client.post("/database/clear")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "vectorsRemoved" in data
        assert "currentCount" in data


# ── DELETE /delete/source/{source_id} ────────────────────────────────


class TestDeleteBySourceEndpoint:
    """Tests for DELETE /delete/source/{source_id}."""

    def test_delete_by_source_returns_success(self, client):
        response = client.delete("/delete/source/src-1")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["source_id"] == "src-1"

    def test_delete_includes_source_id_in_message(self, client):
        response = client.delete("/delete/source/test-source-42")
        data = response.json()
        assert "test-source-42" in data["message"]
