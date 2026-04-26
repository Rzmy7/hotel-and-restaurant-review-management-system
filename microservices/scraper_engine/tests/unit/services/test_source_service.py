import pytest
from unittest.mock import MagicMock, patch
from services.source_service import SourceService

@patch("services.source_service.get_session")
@patch("services.source_service.notify_backend_sync_status")
def test_broadcast_running(mock_notify, mock_get_session):
    # Setup mock session
    mock_session = MagicMock()
    mock_source = MagicMock()
    mock_source.source_id = "s1"
    mock_session.query.return_value.filter_by.return_value.all.return_value = [mock_source]
    mock_get_session.return_value = mock_session
    
    SourceService.broadcast_running("http://test.com")
    
    mock_notify.assert_called_once_with("s1", "RUNNING")
    mock_session.close.assert_called_once()

@patch("services.source_service.get_session")
@patch("services.source_service.notify_backend_sync_status")
def test_broadcast_failed(mock_notify, mock_get_session):
    mock_session = MagicMock()
    mock_source = MagicMock()
    mock_source.source_id = "s1"
    mock_session.query.return_value.filter_by.return_value.all.return_value = [mock_source]
    mock_get_session.return_value = mock_session
    
    SourceService.broadcast_failed("http://test.com", "Timeout error")
    
    mock_notify.assert_called_once_with("s1", "FAILED", error_message="Timeout error")

@patch("services.source_service.get_session")
@patch("services.source_service.notify_backend_sync_status")
@patch("services.source_service.identify_new_reviews")
def test_finalize_and_replicate(mock_identify, mock_notify, mock_get_session):
    mock_session = MagicMock()
    mock_source = MagicMock()
    mock_source.source_id = "s1"
    mock_session.query.return_value.filter_by.return_value.all.return_value = [mock_source]
    mock_get_session.return_value = mock_session
    
    mock_identify.return_value = (5, []) # 5 new reviews
    
    save_func = MagicMock()
    SourceService.finalize_and_replicate(
        url="http://test.com",
        primary_source_id="s1",
        reviews=[{"id": 1}],
        save_db_func=save_func,
        leftover_reviews=[{"id": 1}]
    )
    
    save_func.assert_called()
    mock_notify.assert_any_call("s1", "COMPLETED", new_review_count=5)
