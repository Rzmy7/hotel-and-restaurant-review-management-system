import pytest
from unittest.mock import patch, MagicMock
from app.modules.reviews.services.llm_client import _detect_fatal_error, is_retryable_exception, _is_billing_error
from app.core import crypto


def test_is_billing_error_patterns():
    assert _is_billing_error("429 Too Many Requests: Quota exceeded") is True
    assert _is_billing_error("insufficient_quota") is True
    assert _is_billing_error("out of credits") is True
    assert _is_billing_error("credits exhausted") is True
    assert _is_billing_error("Regular server error 500") is False


def test_detect_fatal_error_types():
    # 1. Encryption key error
    is_fatal, reason = _detect_fatal_error(ValueError("LLM_ENCRYPTION_KEY must decode to exactly 32 bytes (AES-256)."))
    assert is_fatal is True
    assert reason == "encryption_key_error"

    # 2. No model assigned
    is_fatal, reason = _detect_fatal_error(RuntimeError("No LLM model assigned for task review_processing"))
    assert is_fatal is True
    assert reason == "no_model_assigned"

    # 3. Auth error
    is_fatal, reason = _detect_fatal_error(Exception("401 Unauthorized: Invalid API key provided"))
    assert is_fatal is True
    assert reason == "auth_error"

    # 4. Quota / Billing error
    is_fatal, reason = _detect_fatal_error(Exception("429 Resource Exhausted: Quota exceeded for model"))
    assert is_fatal is True
    assert reason == "api_limit"

    # 5. General Python syntax/value errors
    is_fatal, reason = _detect_fatal_error(TypeError("unsupported operand type(s)"))
    assert is_fatal is True
    assert reason == "configuration_error"


@patch("app.core.pyodbc_connection.get_raw_connection")
def test_is_retryable_exception_aborts_on_fatal(mock_conn):
    assert is_retryable_exception(ValueError("LLM_ENCRYPTION_KEY must decode to exactly 32 bytes (AES-256).")) is False
    assert is_retryable_exception(RuntimeError("No LLM model assigned")) is False
    assert is_retryable_exception(Exception("401 Unauthorized: Invalid API key")) is False
    assert is_retryable_exception(Exception("429 Resource Exhausted: Quota exceeded")) is False


def test_crypto_key_loading():
    import base64
    import os

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
