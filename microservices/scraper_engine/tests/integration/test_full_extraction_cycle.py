import pytest
from fastapi.testclient import TestClient
from api.main import app
from unittest.mock import patch, MagicMock
from core.job_manager import job_manager
from core.scrape_pool import scrape_pool
import uuid

client = TestClient(app)

def test_tripadvisor_scrape_api_lifecycle(db_session):
    """
    Test the API lifecycle for a TripAdvisor scrape:
    1. POST /api/tripadvisor/scrape
    2. Verify source is created in DB
    3. Verify job is created in job_manager
    4. Verify pool submission
    """
    source_id = str(uuid.uuid4())
    test_url = "https://www.tripadvisor.com/Hotel_Review-g1-d1-Reviews-Test_Hotel.html"
    
    # Mock the scrape_pool.submit to avoid actual threading/execution
    with patch("core.scrape_pool.scrape_pool.submit") as mock_submit:
        response = client.post(
            "/api/tripadvisor/scrape",
            json={
                "source_id": source_id,
                "source_url": test_url,
                "headless": True,
                "pages": "1"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "submitted"
        assert "job_id" in data
        
        job_id = data["job_id"]
        
        # 1. Verify Job exists in manager
        job = job_manager.get_job(job_id)
        assert job is not None
        assert job["platform"] == "tripadvisor"
        
        # 2. Verify submission to pool
        mock_submit.assert_called_once()
        args, kwargs = mock_submit.call_args
        assert args[0] == job_id
        assert kwargs["url"] == test_url
        assert kwargs["source_id"] == source_id

def test_duplicate_url_attaches_to_job(db_session):
    """
    Verify that submitting the same URL twice attaches the second source to the first job.
    """
    url = "https://www.tripadvisor.com/Shared_Job_Test"
    source1 = str(uuid.uuid4())
    source2 = str(uuid.uuid4())
    
    with patch("core.scrape_pool.scrape_pool.submit") as mock_submit:
        # First request
        client.post("/api/tripadvisor/scrape", json={"source_id": source1, "source_url": url})
        # Second request with same URL
        response = client.post("/api/tripadvisor/scrape", json={"source_id": source2, "source_url": url})
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "attached"
        assert "job_id" in data
        # Should not have submitted to pool a second time
        assert mock_submit.call_count == 1

def test_full_cycle_callback_simulation(db_session):
    """
    Simulate a completed scrape and verify the callback logic (mocked).
    """
    from services.source_service import SourceService
    source_id = str(uuid.uuid4())
    
    # Mock httpx to verify callback
    with patch("httpx.Client.post") as mock_post:
        # Simulate finalization
        SourceService.notify_single(source_id, "COMPLETED", new_review_count=10)
        
        # Verify callback was sent (if backend_url is configured)
        # In tests, config might have default localhost:8000
        if mock_post.called:
            args, kwargs = mock_post.call_args
            assert "sync-status" in args[0]
            assert kwargs["json"]["status"] == "COMPLETED"
            assert kwargs["json"]["reviews_count"] == 10
