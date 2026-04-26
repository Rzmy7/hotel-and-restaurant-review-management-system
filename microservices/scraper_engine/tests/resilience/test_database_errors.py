import pytest
from unittest.mock import patch, MagicMock
from platforms.tripadvisor.models import save_reviews_to_db
from sqlalchemy.exc import OperationalError

def test_save_reviews_db_failure(db_session):
    """Test that save_reviews_to_db handles database connection errors."""
    mock_session = MagicMock()
    mock_session.commit.side_effect = OperationalError("Mock DB Error", params={}, orig=None)
    
    reviews = [{"author": "Test", "rating": 5}]
    
    # We should verify it raises or returns 0 depending on the implementation
    # Let's check logic.py's try-except block around save_reviews_to_db
    
    with patch("platforms.tripadvisor.models.get_session", return_value=mock_session):
        count = save_reviews_to_db(reviews, "test-source")
        assert count == 0
        mock_session.rollback.assert_called()
