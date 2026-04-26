import pytest
from fastapi.testclient import TestClient
from api.main import app
from unittest.mock import patch

client = TestClient(app)

def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    assert "Universal Review Scraper Engine" in response.json()["message"]

@patch("api.endpoints.tripadvisor.scrape_tripadvisor")
def test_tripadvisor_scrape_endpoint(mock_scrape):
    mock_scrape.return_value = {"status": "success", "count": 10}
    
    payload = {
        "source_url": "https://www.tripadvisor.com/Hotel_Review-test",
        "source_id": "api-test-source",
        "pages": "1"
    }
    response = client.post("/api/tripadvisor/scrape", json=payload)
    
    assert response.status_code == 200
    assert response.json()["status"] == "submitted"
    mock_scrape.assert_called_once()
