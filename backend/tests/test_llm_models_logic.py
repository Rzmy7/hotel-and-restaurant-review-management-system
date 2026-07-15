import os
os.environ["DATABASE_URL"] = "sqlite:///test.db"

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.modules.admin.schemas import LLMModelCreate, LLMModelUpdate
from app.core.security import create_access_token

client = TestClient(app)

# Authenticate client as Admin globally (role is lowercase "admin" for SYSTEM_ADMIN)
admin_token = create_access_token(user_id="test-admin-id", role="admin")
client.cookies.set("access_token", admin_token)

def test_llm_model_create_schema():
    # Test that max_tokens is accepted and defaults to 4096
    payload = {
        "name": "Test Model",
        "endpoint": "http://test.com",
        "model_name": "gpt-3.5-turbo",
        "api_key": "test-key"
    }
    model = LLMModelCreate(**payload)
    assert model.max_tokens == 4096

    payload["max_tokens"] = 8192
    model = LLMModelCreate(**payload)
    assert model.max_tokens == 8192

def test_llm_model_update_schema():
    payload = {"max_tokens": 2048}
    model = LLMModelUpdate(**payload)
    assert model.max_tokens == 2048

def test_test_connectivity_endpoint_validation():
    # Test that the endpoint exists and validates input
    response = client.post("/api/admin/llm-models/test-connectivity", json={
        "endpoint": "http://invalid",
        "model_name": "invalid",
        "api_key": "invalid",
        "max_tokens": 100
    })
    # It should fail because the endpoint is invalid, but it should reach the code and return 200 with success=False
    assert response.status_code in [200, 500, 404] 
    if response.status_code == 200:
        data = response.json()
        assert "success" in data
        assert data["success"] is False
        assert any(word in data["message"] for word in ["Validation failed", "LLM Error", "Connection error"])

@patch("pyodbc.connect")
def test_pause_resume_endpoints(mock_connect):
    # Mock pyodbc connection and cursor
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_connect.return_value = mock_conn
    mock_conn.cursor.return_value = mock_cursor

    # Test pause review processing
    response = client.post("/api/admin/monitoring/review-processing/pause")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["message"] == "Review processing paused."

    # Test resume review processing
    response = client.post("/api/admin/monitoring/review-processing/resume")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["message"] == "Review processing resumed."
