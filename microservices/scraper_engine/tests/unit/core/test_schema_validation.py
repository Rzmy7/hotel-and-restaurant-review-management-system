import pytest
from core.schemas import BaseReviewSchema
from pydantic import ValidationError

def test_base_review_validation_valid():
    data = {
        "external_review_id": "rev-123",
        "author": "Jane Doe",
        "rating": 4.5,
        "review_text": "Amazing place!",
        "review_date": "2023-10-25"
    }
    schema = BaseReviewSchema(**data)
    assert schema.external_review_id == "rev-123"
    assert schema.rating == 4.5

def test_base_review_rating_normalization():
    # Test normalization from 0-50 scale
    data = {
        "external_review_id": "rev-123",
        "author": "Jane Doe",
        "rating": 50,
        "review_text": "Amazing place!",
        "review_date": "2023-10-25"
    }
    schema = BaseReviewSchema(**data)
    assert schema.rating == 5.0

def test_base_review_validation_invalid_missing():
    data = {
        "external_review_id": "rev-123",
        # author missing
        "rating": 4.5,
        "review_text": "Amazing place!",
        "review_date": "2023-10-25"
    }
    with pytest.raises(ValidationError):
        BaseReviewSchema(**data)

def test_base_review_validation_invalid_types():
    data = {
        "external_review_id": "rev-123",
        "author": "Jane Doe",
        "rating": "not-a-number",
        "review_text": "Amazing place!",
        "review_date": "2023-10-25"
    }
    with pytest.raises(ValidationError):
        BaseReviewSchema(**data)
