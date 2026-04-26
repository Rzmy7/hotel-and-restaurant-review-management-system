import pytest
from playwright.sync_api import Page
from platforms.google.extractor import GoogleExtractor
from core.schemas import GoogleReviewSchema

def test_google_extractor_basic(page: Page, mock_server):
    """Test Google extractor with a sample HTML page."""
    page.goto(f"{mock_server}/google/sample_reviews.html")
    
    extractor = GoogleExtractor(page)
    reviews = extractor.extract_reviews()
    
    assert len(reviews) == 1
    r = reviews[0]
    
    # Check fields
    assert r["author"] == "Jane Smith"
    assert r["rating"] == 5.0
    assert "Highly recommended" in r["review_text"]
    assert r["review_date"] == "3 days ago"
    assert r["reply_text"] == "Glad you enjoyed your stay, Jane!"
    
    # Validate with schema
    schema = GoogleReviewSchema(**r)
    assert schema.author == "Jane Smith"
    assert schema.rating == 5.0
