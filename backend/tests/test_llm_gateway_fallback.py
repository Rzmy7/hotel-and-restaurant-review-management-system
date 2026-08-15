import os
os.environ["DATABASE_URL"] = "sqlite:///test.db"

import pytest
from unittest.mock import patch, MagicMock
from app.services import llm_gateway


def _build_mock_model(mid: str, name: str, model_name: str, api_key: str = "key"):
    return {
        "id": mid,
        "name": name,
        "endpoint": "https://api.test.com/v1",
        "model_name": model_name,
        "api_key": api_key,
        "max_tokens": 4096,
    }


class TestCandidateModelsResolution:
    @patch("pyodbc.connect")
    def test_get_candidate_models_priority_order(self, mock_connect):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_connect.return_value.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor

        # Rows in dbo.llm_model: (id, name, endpoint, model_name, api_key_enc, max_tokens)
        mock_cursor.execute.return_value.fetchall.return_value = [
            ("m1", "OpenAI GPT-4o", "https://api.openai.com/v1", "gpt-4o", "enc_key_1", 4096),
            ("m2", "Gemini 2.5", "https://api.gemini.com/v1", "gemini-2.5-flash", "enc_key_2", 4096),
            ("m3", "DeepSeek V3", "https://api.deepseek.com/v1", "deepseek-chat", "enc_key_3", 4096),
        ]

        with patch("app.services.llm_gateway.decrypt_value", side_effect=lambda x: f"dec_{x}"):
            with patch("app.modules.admin.services.system_settings_service.get_setting") as mock_get_setting:
                # Setting assignments:
                # review_processing -> m2 (Gemini)
                # reply_generation -> m3 (DeepSeek)
                def fake_get_setting(cursor, key):
                    if key == "llm_review_processing_model_id":
                        return "m2"
                    if key == "llm_reply_generation_model_id":
                        return "m3"
                    return ""

                mock_get_setting.side_effect = fake_get_setting

                candidates = llm_gateway.get_candidate_models("review_processing")
                candidate_ids = [c["id"] for c in candidates]

                # Priority:
                # 1. m2 (review_processing assigned)
                # 2. m3 (reply_generation assigned)
                # 3. m1 (remaining active)
                assert candidate_ids == ["m2", "m3", "m1"]
                assert candidates[0]["name"] == "Gemini 2.5"
                assert candidates[1]["name"] == "DeepSeek V3"
                assert candidates[2]["name"] == "OpenAI GPT-4o"

    @patch("pyodbc.connect")
    def test_get_candidate_models_empty_raises(self, mock_connect):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_connect.return_value.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.execute.return_value.fetchall.return_value = []

        with pytest.raises(ValueError, match="No active LLM models available"):
            llm_gateway.get_candidate_models("review_processing")


class TestLLMGatewayFallbackExecution:
    @patch("app.services.llm_gateway.get_candidate_models")
    @patch("app.services.llm_gateway._execute_model_call")
    def test_primary_model_succeeds_without_fallback(self, mock_execute, mock_candidates):
        m1 = _build_mock_model("m1", "Primary Model", "gpt-4o")
        m2 = _build_mock_model("m2", "Backup Model", "gemini-2.5")
        mock_candidates.return_value = [m1, m2]
        mock_execute.return_value = "Primary success response"

        res = llm_gateway.call("review_processing", "Test prompt")
        assert res == "Primary success response"
        assert mock_execute.call_count == 1
        assert mock_execute.call_args[0][0]["id"] == "m1"

    @patch("app.services.llm_gateway.get_candidate_models")
    @patch("app.services.llm_gateway._execute_model_call")
    def test_primary_fails_secondary_working_is_used(self, mock_execute, mock_candidates):
        m1 = _build_mock_model("m1", "Primary Model", "gpt-4o")
        m2 = _build_mock_model("m2", "Backup Model", "gemini-2.5")
        mock_candidates.return_value = [m1, m2]

        # First call fails (quota), second call succeeds
        mock_execute.side_effect = [
            Exception("Error code: 402 - {'error': {'message': 'insufficient_quota'}}"),
            "Backup success response",
        ]

        res = llm_gateway.call("review_processing", "Analyze reviews")
        assert res == "Backup success response"
        assert mock_execute.call_count == 2
        assert mock_execute.call_args_list[0][0][0]["id"] == "m1"
        assert mock_execute.call_args_list[1][0][0]["id"] == "m2"

    @patch("app.services.llm_gateway.get_candidate_models")
    @patch("app.services.llm_gateway._execute_model_call")
    def test_multi_model_cascade_until_working_model_found(self, mock_execute, mock_candidates):
        m1 = _build_mock_model("m1", "Model 1", "gpt-4o")
        m2 = _build_mock_model("m2", "Model 2", "gemini-2.5")
        m3 = _build_mock_model("m3", "Model 3", "deepseek-v3")
        mock_candidates.return_value = [m1, m2, m3]

        mock_execute.side_effect = [
            Exception("500 Internal Server Error"),
            Exception("429 Rate limit exceeded"),
            "Model 3 successfully completed the request",
        ]

        res = llm_gateway.call("review_processing", "Extract insights")
        assert res == "Model 3 successfully completed the request"
        assert mock_execute.call_count == 3
        assert mock_execute.call_args_list[0][0][0]["id"] == "m1"
        assert mock_execute.call_args_list[1][0][0]["id"] == "m2"
        assert mock_execute.call_args_list[2][0][0]["id"] == "m3"

    @patch("app.services.llm_gateway.get_candidate_models")
    @patch("app.services.llm_gateway._execute_model_call")
    def test_all_models_fail_raises_consolidated_error(self, mock_execute, mock_candidates):
        m1 = _build_mock_model("m1", "Primary Model", "gpt-4o")
        m2 = _build_mock_model("m2", "Backup Model", "gemini-2.5")
        mock_candidates.return_value = [m1, m2]

        mock_execute.side_effect = [
            Exception("402 Payment Required"),
            Exception("503 Service Unavailable"),
        ]

        with pytest.raises(ValueError, match="All available LLM models failed. Attempted 2 model\\(s\\)"):
            llm_gateway.call("review_processing", "Generate reply")
        assert mock_execute.call_count == 2

    @patch("app.services.llm_gateway.get_candidate_models")
    @patch("app.services.llm_gateway._execute_model_call")
    def test_allow_fallback_false_disables_failover(self, mock_execute, mock_candidates):
        m1 = _build_mock_model("m1", "Primary Model", "gpt-4o")
        m2 = _build_mock_model("m2", "Backup Model", "gemini-2.5")
        mock_candidates.return_value = [m1, m2]

        mock_execute.side_effect = Exception("500 Internal Server Error")

        with pytest.raises(ValueError, match="500 Internal Server Error"):
            llm_gateway.call("review_processing", "Test prompt", allow_fallback=False)

        # Should only have attempted m1
        assert mock_execute.call_count == 1
        assert mock_execute.call_args[0][0]["id"] == "m1"
