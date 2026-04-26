import pytest
from unittest.mock import patch, MagicMock
from platforms.tripadvisor.logic import scrape_tripadvisor
from playwright.sync_api import sync_playwright
import os

def test_scrape_tripadvisor_bot_challenge_detection(mock_server, error_route_factory):
    """Test that the scraper detects TripAdvisor bot challenges."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        # Mock content containing bot challenge indicators
        bot_html = "<html><body><h1>Access Denied</h1><p>Verification Required</p></body></html>"
        error_route_factory(page, "**/Hotel_Review-bot*", status=403, body=bot_html)
        
        with patch("platforms.tripadvisor.logic.TripAdvisorBrowser") as mock_browser_cls:
            mock_browser = mock_browser_cls.return_value
            mock_browser.start.return_value = page
            
            with patch("platforms.tripadvisor.logic.audit_logger.error") as mock_audit_error:
                result = scrape_tripadvisor(
                    url="http://localhost:8080/Hotel_Review-bot",
                    headless=True,
                    pages="1",
                    source_id="test-bot"
                )
                
                assert result["status"] == "error"
                assert "Bot challenge detected" in result["message"]
        
        browser.close()

def test_scrape_tripadvisor_failure_screenshot(mock_server, error_route_factory):
    """Test that a screenshot is captured on extraction failure."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        # Empty page to trigger extraction failure on page 1
        error_route_factory(page, "**/Hotel_Review-empty*", status=200, body="<html><body>Empty</body></html>")
        
        screenshot_path = "tripadvisor_extraction_failure.png"
        if os.path.exists(screenshot_path):
            os.remove(screenshot_path)
            
        with patch("platforms.tripadvisor.logic.TripAdvisorBrowser") as mock_browser_cls:
            mock_browser = mock_browser_cls.return_value
            mock_browser.start.return_value = page
            
            # This should not necessarily raise unless bot detection triggers, 
            # but it should save a screenshot if no reviews are found.
            scrape_tripadvisor(
                url="http://localhost:8080/Hotel_Review-empty",
                headless=True,
                pages="1",
                source_id="test-screenshot"
            )
            
            # The logic.py saves screenshot if not page_reviews and page_num == 1
            # In our case, extract_all_on_page will return []
            assert os.path.exists(screenshot_path)
            os.remove(screenshot_path)
        
        browser.close()
