import pytest
from unittest.mock import patch, MagicMock
from platforms.tripadvisor.logic import scrape_tripadvisor
from playwright.sync_api import sync_playwright

def test_scrape_tripadvisor_navigation_timeout(mock_server, error_route_factory):
    """Test that the scraper handles navigation timeouts gracefully."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        # Simulate a timeout by intercepting and never fulfilling, or fulfilling with 408
        error_route_factory(page, "**/Hotel_Review-test*", status=408, body="Request Timeout")
        
        with patch("platforms.tripadvisor.logic.TripAdvisorBrowser") as mock_browser_cls:
            mock_browser = mock_browser_cls.return_value
            mock_browser.start.return_value = page
            
            result = scrape_tripadvisor(
                url="http://localhost:8080/Hotel_Review-test",
                headless=True,
                pages="1",
                source_id="test-timeout"
            )
            
            assert result["status"] == "error"
            assert "timeout" in result["message"].lower() or "408" in result["message"]
        
        browser.close()

def test_scrape_tripadvisor_server_error(mock_server, error_route_factory):
    """Test that the scraper handles 500 errors gracefully."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        error_route_factory(page, "**/Hotel_Review-500*", status=500, body="Internal Server Error")
        
        with patch("platforms.tripadvisor.logic.TripAdvisorBrowser") as mock_browser_cls:
            mock_browser = mock_browser_cls.return_value
            mock_browser.start.return_value = page
            
            result = scrape_tripadvisor(
                url="http://localhost:8080/Hotel_Review-500",
                headless=True,
                pages="1",
                source_id="test-500"
            )
            assert result["status"] == "error"
            assert "500" in result["message"]
        
        browser.close()
