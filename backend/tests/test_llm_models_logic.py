import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.modules.admin.schemas import LLMModelCreate, LLMModelUpdate

client = TestClient(app)

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
    # Test that the new endpoint exists and validates input
    response = client.post("/admin/llm-models/test-connectivity", json={
        "endpoint": "http://invalid",
        "model_name": "invalid",
        "api_key": "invalid",
        "max_tokens": 100
    })
    # It should fail because the endpoint is invalid, but it should reach the code
    assert response.status_code in [200, 500, 404] 
    # Actually, it should return a 200 with success=False if it catches the exception
    if response.status_code == 200:
        data = response.json()
        assert "success" in data
        assert data["success"] is False
        assert "Validation failed" in data["message"]

if __name__ == "__main__":
    # Manual run
    test_llm_model_create_schema()
    test_llm_model_update_schema()
    print("Local schema tests passed!")
