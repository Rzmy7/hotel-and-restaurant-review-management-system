import pytest
from playwright.sync_api import Page
from platforms.booking.extractor import BookingExtractor
from core.schemas import BookingReviewSchema

def test_booking_extractor_basic(page: Page, mock_server):
    """Test Booking extractor with a sample HTML page."""
    page.goto(f"{mock_server}/booking/sample_reviews.html")
    
    extractor = BookingExtractor(page)
    reviews = extractor.extract_reviews()
    
    assert len(reviews) == 1
    r = reviews[0]
    
    # Check fields
    assert r["author"] == "Alice Wong"
    assert r["rating"] == 10.0
    assert r["review_title"] == "Perfect vacation spot"
    assert "[Positive] Everything was perfect." in r["review_text"]
    assert r["review_date"] == "2024-02-10"
    assert r["stay_date"] == "2024-02-01"
    assert r["num_of_nights"] == 3
    assert r["reply_text"] == "We hope to see you again soon!"
    
    # Validate with schema
    schema = BookingReviewSchema(**r)
    assert schema.author == "Alice Wong"
    assert schema.rating == 10.0
