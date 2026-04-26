import pytest
from unittest.mock import MagicMock
from platforms.tripadvisor.extractor import TripAdvisorExtractor

def test_extract_total_reviews_with_count():
    # Mock page
    mock_page = MagicMock()
    mock_element = MagicMock()
    mock_element.inner_text.return_value = "1,234 reviews"
    mock_page.query_selector.return_value = mock_element
    
    extractor = TripAdvisorExtractor(mock_page)
    count = extractor.extract_total_reviews()
    
    assert count == 1234
    mock_page.query_selector.assert_called()

def test_extract_total_reviews_fallback():
    # Mock page where query_selector returns None
    mock_page = MagicMock()
    mock_page.query_selector.return_value = None
    mock_page.inner_text.return_value = "Total 567 reviews found"
    
    extractor = TripAdvisorExtractor(mock_page)
    count = extractor.extract_total_reviews()
    
    assert count == 567

def test_parse_rating_from_svg():
    mock_page = MagicMock()
    extractor = TripAdvisorExtractor(mock_page)
    
    mock_card = MagicMock()
    mock_svg = MagicMock()
    mock_svg.get_attribute.side_effect = lambda attr: "5.0 of 5 bubbles" if attr == "aria-label" else ""
    mock_svg.query_selector.return_value = None # No title el
    
    mock_card.query_selector.return_value = mock_svg
    
    rating = extractor._parse_rating(mock_card)
    assert rating == 5.0

def test_parse_review_id():
    mock_page = MagicMock()
    extractor = TripAdvisorExtractor(mock_page)
    
    mock_card = MagicMock()
    mock_heading = MagicMock()
    mock_heading.get_attribute.return_value = "/ShowUserReviews-g1-r912345678-Hotel_Review.html"
    mock_card.query_selector.return_value = mock_heading
    
    review_id = extractor._parse_review_id(mock_card)
    assert review_id == "912345678"
