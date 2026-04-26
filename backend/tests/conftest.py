"""
Pytest configuration and global fixtures.
Sets up an in-memory SQLite database for fast unit and integration tests.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, DateTime
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER


@compiles(UNIQUEIDENTIFIER, "sqlite")
def compile_uniqueidentifier_sqlite(type_, compiler, **kw):
    return "CHAR(36)"


# Fix for MSSQL specific sysutcdatetime() in SQLite
from sqlalchemy.sql import functions


class sysutcdatetime(functions.GenericFunction):
    type = DateTime()
    name = "sysutcdatetime"


@compiles(sysutcdatetime, "sqlite")
def compile_sysutcdatetime_sqlite(element, compiler, **kw):
    return "CURRENT_TIMESTAMP"


from app.main import app as fastapi_app
from app.database.session import Base
from app.database import get_db

# Import models to register them with Base
import app.modules.reviews.models  # noqa
import app.modules.source.models  # noqa
import app.modules.auth.models  # noqa
import app.modules.organization.models  # noqa
import app.modules.user.models  # noqa
import app.modules.admin.models  # noqa

# Use in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session")
def db_engine():
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(db_engine):
    """Returns a clean database session for each test function."""
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db_session):
    """Returns a TestClient that uses the test database session."""

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    fastapi_app.dependency_overrides[get_db] = override_get_db
    with TestClient(fastapi_app, raise_server_exceptions=False) as c:
        yield c
    fastapi_app.dependency_overrides.clear()
