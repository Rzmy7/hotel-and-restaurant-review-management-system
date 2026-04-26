import pytest
import os
import sys
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
import time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER

# Ensure the scraper_engine root is in sys.path
scraper_engine_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if scraper_engine_root not in sys.path:
    sys.path.append(scraper_engine_root)

from core.database import Base

@compiles(UNIQUEIDENTIFIER, "sqlite")
def compile_uniqueidentifier(type_, compiler, **kw):
    return "CHAR(36)"

@pytest.fixture(scope="session")
def db_engine():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    return engine

@pytest.fixture
def db_session(db_engine):
    Session = sessionmaker(bind=db_engine)
    session = Session()
    yield session
    session.close()

class MockServerRequestHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Serve from fixtures/html directory
        root = os.path.abspath(os.path.join(os.path.dirname(__file__), "fixtures", "html"))
        return os.path.join(root, path.lstrip("/"))

@pytest.fixture(scope="session")
def mock_server():
    server = HTTPServer(("localhost", 8080), MockServerRequestHandler)
    thread = threading.Thread(target=server.serve_forever)
    thread.daemon = True
    thread.start()
    time.sleep(1) # Wait for server to start
    yield "http://localhost:8080"
    server.shutdown()
