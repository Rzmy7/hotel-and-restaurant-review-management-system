"""
Integration tests for health / root API endpoints.

Uses FastAPI TestClient to make real HTTP requests against the app,
with database and scheduler dependencies fully mocked out.
"""

import os
from contextlib import asynccontextmanager
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", "sqlite:///test.db")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests")
os.environ.setdefault("SECRET_KEY", "test-session-secret")
os.environ.setdefault("DB_SERVER", "localhost")
os.environ.setdefault("DB_NAME", "testdb")
os.environ.setdefault("DB_UID", "sa")
os.environ.setdefault("DB_PWD", "testpass")


@pytest.fixture(scope="module")
def client():
    """Create a TestClient with the lifespan and engine fully mocked."""
    @asynccontextmanager
    async def _noop_lifespan(app):
        yield

    # Patch the engine to None so create_all is skipped, and lifespan to no-op
    with patch("app.database.session.engine", None), \
         patch("app.main.engine", None):

        import importlib
        import app.main as main_module

        # Replace the lifespan on the FastAPI app object directly
        original_lifespan = main_module.app.router.lifespan_context
        main_module.app.router.lifespan_context = _noop_lifespan

        from app.database.session import get_db

        mock_session = MagicMock()
        mock_session.execute.return_value.fetchone.return_value = (1,)

        def _override_get_db():
            yield mock_session

        main_module.app.dependency_overrides[get_db] = _override_get_db

        with TestClient(main_module.app, raise_server_exceptions=False) as c:
            yield c

        main_module.app.dependency_overrides.clear()
        main_module.app.router.lifespan_context = original_lifespan


class TestRootEndpoint:
    """Tests for GET /."""

    def test_returns_200(self, client):
        response = client.get("/")
        assert response.status_code == 200

    def test_response_contains_status(self, client):
        response = client.get("/")
        data = response.json()
        assert data["status"] == "healthy"

    def test_response_contains_message(self, client):
        response = client.get("/")
        data = response.json()
        assert "API is online" in data["message"]


class TestWhichMainEndpoint:
    """Tests for GET /which-main."""

    def test_returns_200(self, client):
        response = client.get("/which-main")
        assert response.status_code == 200

    def test_identifies_main_file(self, client):
        response = client.get("/which-main")
        data = response.json()
        assert "main.py" in data["message"]
