import pytest
from unittest.mock import patch, MagicMock
from platforms.tripadvisor.logic import scrape_tripadvisor
from core.models import Review, TripAdvisorReviewDetail

@patch("platforms.tripadvisor.logic.SourceService.broadcast_running")
@patch("platforms.tripadvisor.logic.SourceService.finalize_and_replicate")
@patch("platforms.tripadvisor.logic.save_reviews_to_db")
@patch("platforms.tripadvisor.logic.config")
def test_scrape_tripadvisor_e2e(mock_config, mock_save, mock_finalize, mock_broadcast, mock_server, db_session):
    # Setup mock config
    mock_config.headless = True
    
    # URL pointing to mock server
    url = f"{mock_server}/tripadvisor/sample_reviews.html"
    source_id = "test-source-id"
    
    # We don't want to actually save to the real DB during this logic test
    # so we mock save_reviews_to_db
    mock_save.return_value = 2 # 2 reviews in sample_reviews.html
    
    result = scrape_tripadvisor(
        url=url,
        headless=True,
        pages="1",
        source_id=source_id
    )
    
    assert result["status"] == "success"
    assert result["count"] >= 2
    mock_broadcast.assert_called_with(url)
    mock_finalize.assert_called()
    mock_save.assert_called()
