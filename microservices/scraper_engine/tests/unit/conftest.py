import pytest
import os
import sys

# scraper_engine root is already added by tests/conftest.py

@pytest.fixture
def tripadvisor_html_fixture():
    fixture_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "fixtures",
        "html",
        "tripadvisor",
        "sample_reviews.html"
    )
    if os.path.exists(fixture_path):
        with open(fixture_path, "r", encoding="utf-8") as f:
            return f.read()
    return "<html><body>Mock HTML</body></html>"
