"""
Shared pytest fixtures for the backend test suite.

Provides mock database sessions, mock users, JWT token factories,
and a FastAPI TestClient with dependency overrides — so all tests
can run without a live database connection.
"""

import os
import sys
import uuid
from datetime import datetime, timedelta
from types import ModuleType
from unittest.mock import MagicMock

import pytest

# ── Patch env vars BEFORE any app code is imported ──────────────────
os.environ.setdefault("DATABASE_URL", "sqlite:///test.db")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests")
os.environ.setdefault("SECRET_KEY", "test-session-secret")
os.environ.setdefault("DB_SERVER", "localhost")
os.environ.setdefault("DB_NAME", "testdb")
os.environ.setdefault("DB_UID", "sa")
os.environ.setdefault("DB_PWD", "testpass")

# ── Stub pyodbc if the native ODBC driver isn't installed ───────────
# The test suite never hits a real database, but importing app modules
# triggers `import pyodbc` which needs libodbc.so.2 at load time.
# Inject a lightweight stub so tests can run on any CI runner.
if "pyodbc" not in sys.modules:
    try:
        import pyodbc  # noqa: F401 — just check availability
    except ImportError:
        _stub = ModuleType("pyodbc")
        _stub.connect = MagicMock()
        sys.modules["pyodbc"] = _stub

# ── Constants ───────────────────────────────────────────────────────
TEST_USER_ID = str(uuid.uuid4())
TEST_ORG_ID = str(uuid.uuid4())
TEST_ADMIN_USER_ID = str(uuid.uuid4())


# ── Mock database session ──────────────────────────────────────────

@pytest.fixture
def mock_db():
    """Return a MagicMock that behaves like a SQLAlchemy Session."""
    session = MagicMock()
    session.commit = MagicMock()
    session.rollback = MagicMock()
    session.close = MagicMock()
    session.flush = MagicMock()
    session.refresh = MagicMock()
    return session


# ── Mock users ──────────────────────────────────────────────────────

@pytest.fixture
def mock_current_user():
    """A regular Tenant user dict as returned by get_current_user."""
    return {
        "user_id": TEST_USER_ID,
        "role": "Tenant",
        "organization_id": TEST_ORG_ID,
    }


@pytest.fixture
def mock_admin_user():
    """An Admin user dict as returned by get_current_user."""
    return {
        "user_id": TEST_ADMIN_USER_ID,
        "role": "Admin",
        "organization_id": None,
    }


# ── JWT helper ──────────────────────────────────────────────────────

@pytest.fixture
def jwt_token_factory():
    """
    Factory fixture that creates signed JWT tokens for testing.
    Usage: token = jwt_token_factory(user_id="...", role="Tenant")
    """
    from jose import jwt

    secret = os.environ["JWT_SECRET_KEY"]
    algorithm = "HS256"

    def _create_token(
        user_id: str = TEST_USER_ID,
        role: str = "Tenant",
        organization_id: str | None = TEST_ORG_ID,
        expire_minutes: int = 60,
    ) -> str:
        payload = {
            "user_id": user_id,
            "role": role,
            "organization_id": organization_id,
            "exp": datetime.utcnow() + timedelta(minutes=expire_minutes),
        }
        return jwt.encode(payload, secret, algorithm=algorithm)

    return _create_token


@pytest.fixture
def expired_jwt_token():
    """A JWT token that has already expired."""
    from jose import jwt

    secret = os.environ["JWT_SECRET_KEY"]
    payload = {
        "user_id": TEST_USER_ID,
        "role": "Tenant",
        "organization_id": TEST_ORG_ID,
        "exp": datetime.utcnow() - timedelta(minutes=10),
    }
    return jwt.encode(payload, secret, algorithm="HS256")
