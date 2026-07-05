"""
Integration tests for the Sliding Sessions HTTP middleware.

Verifies that the backend automatically extends the session of active users 
when their valid access token is nearing its expiration (<= 5 minutes left).
"""

import os
import time
from datetime import datetime, timedelta, timezone
from contextlib import asynccontextmanager
from unittest.mock import MagicMock, patch

import pytest
from jose import jwt
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", "sqlite:///test.db")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests")
os.environ.setdefault("SECRET_KEY", "test-session-secret")

SECRET = os.environ["JWT_SECRET_KEY"]
ALGORITHM = "HS256"


@pytest.fixture(scope="module")
def client():
    """Create a TestClient with the lifespan and database engine fully mocked."""
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
        mock_session.execute.return_value.fetchone.return_value = (1,)

        def _override_get_db():
            yield mock_session

        main_module.app.dependency_overrides[get_db] = _override_get_db

        with TestClient(main_module.app, raise_server_exceptions=False) as c:
            yield c

        main_module.app.dependency_overrides.clear()
        main_module.app.router.lifespan_context = original_lifespan


def _make_custom_token(user_id="u1", role="Tenant", org_id="org-1", expiry_timestamp=None):
    payload = {
        "user_id": user_id,
        "role": role,
        "organization_id": org_id,
        "exp": expiry_timestamp,
    }
    return jwt.encode(payload, SECRET, algorithm=ALGORITHM)


def test_no_token_should_not_renew(client):
    """If no access token cookie is present, no renewal happens."""
    response = client.get("/")
    assert response.status_code == 200
    assert "set-cookie" not in response.headers


def test_invalid_token_should_not_renew(client):
    """If the token signature or format is invalid, no renewal happens."""
    client.cookies.set("access_token", "invalid-token-format")
    response = client.get("/")
    assert "set-cookie" not in response.headers
    client.cookies.clear()


def test_expired_token_should_not_renew(client):
    """If the token is already expired, it should not be renewed by the middleware."""
    expired_time = int(time.time() - 600)  # Expired 10 minutes ago
    expired_token = _make_custom_token(expiry_timestamp=expired_time)
    
    client.cookies.set("access_token", expired_token)
    response = client.get("/")
    # Even if authenticated routes reject it, the middleware should not issue a Set-Cookie
    assert "set-cookie" not in response.headers
    client.cookies.clear()


def test_valid_token_far_from_expiry_should_not_renew(client):
    """If the token has plenty of time left (e.g. > 5 minutes), no renewal happens."""
    future_time = int(time.time() + 3000)  # 50 minutes remaining
    valid_token = _make_custom_token(expiry_timestamp=future_time)
    
    client.cookies.set("access_token", valid_token)
    response = client.get("/")
    assert response.status_code == 200
    assert "set-cookie" not in response.headers
    client.cookies.clear()


def test_valid_token_near_expiry_should_renew_cookie(client):
    """If the token has <= 5 minutes left, a new access token cookie is issued."""
    near_expiry_time = int(time.time() + 180)  # 3 minutes remaining (<= 300 seconds)
    nearing_token = _make_custom_token(expiry_timestamp=near_expiry_time)
    
    client.cookies.set("access_token", nearing_token)
    response = client.get("/")
    
    assert response.status_code == 200
    assert "set-cookie" in response.headers
    
    set_cookie_header = response.headers["set-cookie"]
    assert "access_token=" in set_cookie_header
    assert "HttpOnly" in set_cookie_header
    assert "Max-Age=" in set_cookie_header
    
    # Verify the new cookie contains a fresh token with full expiry (e.g., ~60 minutes/3600s)
    # Extract token value
    parts = set_cookie_header.split(";")
    token_part = [p for p in parts if p.strip().startswith("access_token=")][0]
    new_token = token_part.split("=")[1].strip()
    
    payload = jwt.decode(new_token, SECRET, algorithms=[ALGORITHM])
    new_exp = payload.get("exp")
    assert new_exp > near_expiry_time
    # It should have the full default expiration (usually 60 minutes from now)
    assert new_exp - time.time() > 1800  # at least 30 minutes
    
    client.cookies.clear()
