"""
Integration tests for auth route input validation.

Uses FastAPI TestClient to verify that auth endpoints correctly
reject malformed input via Pydantic validation (422 errors).
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

    with patch("app.database.session.engine", None), \
         patch("app.main.engine", None):

        import app.main as main_module

        original_lifespan = main_module.app.router.lifespan_context
        main_module.app.router.lifespan_context = _noop_lifespan

        from app.database.session import get_db

        mock_session = MagicMock()

        def _override_get_db():
            yield mock_session

        main_module.app.dependency_overrides[get_db] = _override_get_db

        with TestClient(main_module.app, raise_server_exceptions=False) as c:
            yield c

        main_module.app.dependency_overrides.clear()
        main_module.app.router.lifespan_context = original_lifespan


class TestSignupValidation:
    """Tests for POST /api/auth/signup input validation."""

    def test_missing_all_fields_returns_422(self, client):
        """Empty body should return 422 Unprocessable Entity."""
        response = client.post("/api/auth/signup", json={})
        assert response.status_code == 422

    def test_missing_password_returns_422(self, client):
        """Missing password field should return 422."""
        response = client.post("/api/auth/signup", json={
            "name": "John Doe",
            "email": "john@example.com",
        })
        assert response.status_code == 422

    def test_missing_email_returns_422(self, client):
        """Missing email field should return 422."""
        response = client.post("/api/auth/signup", json={
            "name": "John Doe",
            "password": "ValidPass1!",
        })
        assert response.status_code == 422

    def test_missing_name_returns_422(self, client):
        """Missing name field should return 422."""
        response = client.post("/api/auth/signup", json={
            "email": "john@example.com",
            "password": "ValidPass1!",
        })
        assert response.status_code == 422


class TestLoginValidation:
    """Tests for POST /api/auth/login input validation."""

    def test_missing_all_fields_returns_422(self, client):
        """Empty body should return 422."""
        response = client.post("/api/auth/login", json={})
        assert response.status_code == 422

    def test_missing_password_returns_422(self, client):
        """Missing password should return 422."""
        response = client.post("/api/auth/login", json={
            "email": "user@example.com",
        })
        assert response.status_code == 422

    def test_missing_email_returns_422(self, client):
        """Missing email should return 422."""
        response = client.post("/api/auth/login", json={
            "password": "SomePass1!",
        })
        assert response.status_code == 422

    def test_invalid_email_format_returns_422(self, client):
        """Malformed email should return 422."""
        response = client.post("/api/auth/login", json={
            "email": "not-an-email",
            "password": "ValidPass1!",
        })
        assert response.status_code == 422

    def test_short_password_returns_422(self, client):
        """Password under min_length should return 422."""
        response = client.post("/api/auth/login", json={
            "email": "user@example.com",
            "password": "short",
        })
        assert response.status_code == 422
