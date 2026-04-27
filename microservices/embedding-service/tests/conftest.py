"""
Shared pytest fixtures for the embedding-service test suite.

Provides mock ChromaDB collection, mock embedding model,
mock config, and a FastAPI TestClient — so all tests run
without loading a real ML model or persistent ChromaDB storage.
"""

import os
import json
import tempfile
from unittest.mock import MagicMock, patch

import pytest


# ── Mock the heavy imports BEFORE any app module loads ─────────────
# sentence_transformers loads a 100 MB model — we never want that in tests.

_mock_model = MagicMock()
_mock_model.encode.return_value = MagicMock(tolist=lambda: [0.1] * 384)


@pytest.fixture(autouse=True)
def mock_embedding_model(monkeypatch):
    """Replace the real SentenceTransformer with a deterministic mock."""
    monkeypatch.setattr("app.embedding.model", _mock_model)


@pytest.fixture
def mock_collection():
    """Return a MagicMock that mimics a ChromaDB Collection."""
    coll = MagicMock()
    coll.count.return_value = 0
    coll.name = "hotel_reviews"
    coll.get.return_value = {"ids": [], "documents": [], "metadatas": [], "embeddings": []}
    coll.query.return_value = {
        "ids": [[]],
        "documents": [[]],
        "metadatas": [[]],
        "distances": [[]],
    }
    return coll


@pytest.fixture
def temp_config_file(tmp_path):
    """Create a temporary config.json for config tests."""
    config_path = tmp_path / "config.json"
    default = {
        "thresholds": {"oneWord": 1.3, "twoWords": 1.2, "threeOrMore": 1.1},
        "isPaused": False,
    }
    config_path.write_text(json.dumps(default, indent=2))
    return config_path


@pytest.fixture
def temp_jobs_file(tmp_path):
    """Create a temporary jobs.json for job tracking tests."""
    jobs_path = tmp_path / "jobs.json"
    jobs_path.write_text("[]")
    return jobs_path
