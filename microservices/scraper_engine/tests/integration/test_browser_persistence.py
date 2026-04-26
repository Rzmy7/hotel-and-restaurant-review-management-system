import pytest
from platforms.tripadvisor.browser import TripAdvisorBrowser

def test_tripadvisor_browser_launch():
    browser_ctrl = TripAdvisorBrowser()
    try:
        page = browser_ctrl.start()
        assert page is not None
        # Check if stealth script worked (navigator.webdriver should be undefined)
        is_webdriver = page.evaluate("navigator.webdriver")
        assert is_webdriver is None or is_webdriver is False
    finally:
        browser_ctrl.stop()

def test_tripadvisor_browser_navigation(mock_server):
    browser_ctrl = TripAdvisorBrowser()
    try:
        page = browser_ctrl.start()
        # Navigate to our mock server
        url = f"{mock_server}/tripadvisor/sample_reviews.html"
        page.goto(url)
        assert "1,234 reviews" in page.content()
    finally:
        browser_ctrl.stop()
