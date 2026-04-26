import pytest
from core.schemas import TripAdvisorReviewSchema

def test_tripadvisor_schema_validation():
    data = {
        "external_review_id": "888123",
        "author": "John Smith",
        "rating": 40, # 4.0
        "review_text": "Good value.",
        "review_date": "Yesterday",
        "reviewer_origin": "London, UK",
        "trip_date": "October 2023",
        "traveler_type": "Couples",
        "rating_location": 50, # 5.0
        "rating_service": 40  # 4.0
    }
    schema = TripAdvisorReviewSchema(**data)
    assert schema.rating == 4.0
    assert schema.rating_location == 5.0
    assert schema.rating_service == 4.0
    assert schema.likes_count == 0

def test_tripadvisor_schema_partial_data():
    data = {
        "external_review_id": "888124",
        "author": "Explorer",
        "rating": 5.0,
        "review_text": "Just text, no sub-ratings.",
        "review_date": "2023-01-01"
    }
    schema = TripAdvisorReviewSchema(**data)
    assert schema.rating_location is None
    assert schema.images == []
