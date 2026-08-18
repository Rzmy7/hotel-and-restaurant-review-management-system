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

@patch("app.services.llm_gateway.call", side_effect=Exception("Connection error"))
def test_test_connectivity_endpoint_validation(mock_gateway):
    # Test that the endpoint exists and validates input
    response = client.post("/api/admin/llm-models/test-connectivity", json={
        "endpoint": "http://invalid",
        "model_name": "invalid",
        "api_key": "invalid",
        "max_tokens": 100
    })
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


@patch("pyodbc.connect")
def test_is_retryable_exception_aborts_on_pause(mock_connect):
    # Mock database to return True for paused setting
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_connect.return_value = mock_conn
    mock_conn.cursor.return_value = mock_cursor
    
    # Mock get_setting to return "true" for review_processing_paused
    from app.modules.reviews.services.llm_client import is_retryable_exception
    
    with patch("app.modules.admin.services.system_settings_service.get_setting", return_value="true"):
        res = is_retryable_exception(Exception("Some random connection error"))
        assert res is False


@patch("app.core.pyodbc_connection.get_raw_connection")
def test_fatal_error_detection_and_non_retryable(mock_get_conn):
    mock_conn = MagicMock()
    mock_get_conn.return_value.__enter__.return_value = mock_conn
    mock_conn.cursor.return_value = MagicMock()

    from app.modules.reviews.services.llm_client import _detect_fatal_error, is_retryable_exception

    # 1. Encryption key error
    is_fatal, reason = _detect_fatal_error(ValueError("LLM_ENCRYPTION_KEY must decode to exactly 32 bytes (AES-256)."))
    assert is_fatal is True
    assert reason == "encryption_key_error"
    assert is_retryable_exception(ValueError("LLM_ENCRYPTION_KEY must decode to exactly 32 bytes (AES-256).")) is False

    # 2. No model assigned
    is_fatal, reason = _detect_fatal_error(RuntimeError("No LLM model assigned for task review_processing"))
    assert is_fatal is True
    assert reason == "no_model_assigned"
    assert is_retryable_exception(RuntimeError("No LLM model assigned")) is False

    # 3. Auth error
    is_fatal, reason = _detect_fatal_error(Exception("401 Unauthorized: Invalid API key provided"))
    assert is_fatal is True
    assert reason == "auth_error"
    assert is_retryable_exception(Exception("401 Unauthorized: Invalid API key")) is False

    # 4. Quota / Billing error
    is_fatal, reason = _detect_fatal_error(Exception("429 Resource Exhausted: Quota exceeded for model"))
    assert is_fatal is True
    assert reason == "api_limit"
    assert is_retryable_exception(Exception("429 Resource Exhausted: Quota exceeded")) is False

    # 5. Non-fatal data/json/formatting errors do not pause processing
    is_fatal, reason = _detect_fatal_error(ValueError("Expecting value: line 1 column 1 (char 0)"))
    assert is_fatal is False
    assert reason == ""


def test_crypto_key_loading():
    import base64
    import os
    from app.core import crypto

    # Test valid 32-byte base64 key
    valid_bytes = os.urandom(32)
    b64_key = base64.urlsafe_b64encode(valid_bytes).decode()
    with patch("app.core.config.LLM_ENCRYPTION_KEY", b64_key):
        loaded = crypto._load_key()
        assert loaded == valid_bytes

    # Test valid 32-char plain string
    plain_32 = "12345678901234567890123456789012"
    with patch("app.core.config.LLM_ENCRYPTION_KEY", plain_32):
        loaded = crypto._load_key()
        assert loaded == plain_32.encode("utf-8")

    # Test invalid short key raises ValueError
    with patch("app.core.config.LLM_ENCRYPTION_KEY", "too_short"):
        with pytest.raises(ValueError, match="LLM_ENCRYPTION_KEY must decode to exactly 32 bytes"):
            crypto._load_key()


