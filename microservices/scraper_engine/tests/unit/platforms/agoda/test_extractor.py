import pytest
from playwright.sync_api import Page
from platforms.agoda.extractor import AgodaExtractor
from core.schemas import AgodaReviewSchema

def test_agoda_extractor_basic(page: Page, mock_server):
    """Test Agoda extractor with a sample HTML page."""
    page.goto(f"{mock_server}/agoda/sample_reviews.html")
    
    extractor = AgodaExtractor(page)
    reviews = extractor.extract_reviews()
    
    assert len(reviews) == 1
    r = reviews[0]
    
    # Check return type (dict)
    assert isinstance(r, dict)
    
    # Check fields
    assert r["author"] == "John Doe"
    assert r["rating"] == 9.2
    assert r["review_title"] == "Excellent Stay"
    assert "amazing" in r["review_text"]
    assert r["review_date"] == "January 15, 2024"
    assert r["stay_date"] == "Stayed 2 nights"
    assert len(r["images"]) == 1
    assert r["reply_text"] == "Thank you for your kind words!"
    
    # Validate with schema
    schema = AgodaReviewSchema(**r)
    assert schema.author == "John Doe"
    assert schema.rating == 9.2
