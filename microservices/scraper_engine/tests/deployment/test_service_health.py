import pytest
import httpx
import os
from core.database import get_engine
from sqlalchemy import text

def test_health_endpoint():
    """Verify the /health endpoint is accessible and returns UP."""
    # Note: This requires the server to be running, or we use TestClient
    from api.main import app
    from fastapi.testclient import TestClient
    
    client = TestClient(app)
    response = client.get("/api/system/health")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

def test_database_connectivity():
    """Verify that the engine can connect to the database."""
    engine = get_engine()
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            assert result.scalar() == 1
    except Exception as e:
        pytest.fail(f"Database connection failed: {e}")

def test_playwright_launchable():
    """Verify that Playwright can at least launch a browser in this environment."""
    from playwright.sync_api import sync_playwright
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto("about:blank")
            assert page.url == "about:blank"
            browser.close()
    except Exception as e:
        pytest.fail(f"Playwright browser launch failed: {e}")
