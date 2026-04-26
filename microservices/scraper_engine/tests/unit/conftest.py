import pytest
import os
import sys

# Ensure the scraper_engine root is in sys.path
# conftest.py is in tests/unit/
# we want the parent of 'tests'
scraper_engine_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.append(scraper_engine_root)

from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER

@compiles(UNIQUEIDENTIFIER, "sqlite")
def compile_uniqueidentifier(type_, compiler, **kw):
    return "CHAR(36)"

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
    return """
    <html>
        <body>
            <div data-test-target="HR_REVIEWS">
                <div class="review-container">
                    <span class="ui_bubble_rating bubble_50"></span>
                    <span class="display_name">John Doe</span>
                    <span class="ratingDate">Reviewed October 2023</span>
                    <p class="partial_entry">Excellent stay!</p>
                </div>
            </div>
            <span class="reviews_header_count">(1,234 Reviews)</span>
        </body>
    </html>
    """
