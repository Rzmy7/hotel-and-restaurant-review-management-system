import pytest
import os
import sys

# Ensure the scraper_engine root is in sys.path
scraper_engine_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if scraper_engine_root not in sys.path:
    sys.path.append(scraper_engine_root)

from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER

@compiles(UNIQUEIDENTIFIER, "sqlite")
def compile_uniqueidentifier(type_, compiler, **kw):
    return "CHAR(36)"

@pytest.fixture
def error_route_factory():
    """Returns a function that can be used to fail requests for a specific URL pattern."""
    def _factory(page, url_pattern, status=500, body="Internal Server Error"):
        def handle(route):
            route.fulfill(status=status, body=body)
        page.route(url_pattern, handle)
    return _factory
