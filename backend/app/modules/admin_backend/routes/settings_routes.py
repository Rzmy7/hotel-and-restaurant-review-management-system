"""General admin settings routes (timezone/language/date/currency)."""

import pyodbc
import requests
from fastapi import APIRouter, HTTPException
from google import genai

from app.modules.admin_backend.db_utils import get_connection_string
from app.modules.admin_backend.schemas import GeneralSettingsPayload, GeneralSettingsResponse
from app.modules.admin_backend.schemas import (
    ReplyGenerationApiTestPayload,
    ReplyGenerationApiTestResponse,
    ReplyGenerationSettingsPayload,
    ReplyGenerationSettingsResponse,
)
from app.modules.admin_backend.services.system_settings_service import (
    DEFAULT_CURRENCY,
    DEFAULT_DATE_FORMAT,
    DEFAULT_LANGUAGE,
    DEFAULT_REPLY_CLAUDE_MODEL,
    DEFAULT_REPLY_GOOGLE_MODEL,
    DEFAULT_REPLY_SELECTED_MODEL,
    ensure_system_settings_table,
    get_setting_int,
    get_setting,
    get_similar_reviews_count,
    is_valid_timezone,
    set_setting,
)

router = APIRouter(prefix="/api/settings", tags=["Settings"])

CLAUDE_MODEL_ALIASES: dict[str, str] = {
    "claude-3-5-sonnet-latest": "claude-sonnet-4-6",
    "claude-3-5-sonnet-20241022": "claude-sonnet-4-6",
    "claude-3-5-haiku-latest": "claude-haiku-4-5-20251001",
    "claude-3-5-haiku-20241022": "claude-haiku-4-5-20251001",
    "claude-3-opus-latest": "claude-opus-4-6",
    "claude-3-opus-20240229": "claude-opus-4-6",
}


def _infer_provider_from_model(model: str) -> str:
    normalized = model.strip().lower()
    if normalized.startswith("claude"):
        return "claude"
    return "google"


@router.get("/general", response_model=GeneralSettingsResponse)
def get_general_settings() -> GeneralSettingsResponse:
    try:
        with pyodbc.connect(get_connection_string()) as connection:
            cursor = connection.cursor()
            ensure_system_settings_table(cursor)

            timezone_value = (get_setting(cursor, "timezone") or "UTC").strip() or "UTC"
            if not is_valid_timezone(timezone_value):
                timezone_value = "UTC"

            language = (get_setting(cursor, "language") or DEFAULT_LANGUAGE).strip() or DEFAULT_LANGUAGE
            date_format = (get_setting(cursor, "date_format") or DEFAULT_DATE_FORMAT).strip() or DEFAULT_DATE_FORMAT
            currency = (get_setting(cursor, "currency") or DEFAULT_CURRENCY).strip() or DEFAULT_CURRENCY

            return GeneralSettingsResponse(
                timezone=timezone_value,
                language=language,
                dateFormat=date_format,
                currency=currency,
            )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to load general settings: {exc}") from exc


@router.patch("/general", response_model=GeneralSettingsResponse)
def update_general_settings(payload: GeneralSettingsPayload) -> GeneralSettingsResponse:
    timezone_value = payload.timezone.strip()
    if not is_valid_timezone(timezone_value):
        raise HTTPException(status_code=400, detail="Invalid timezone. Use a valid IANA timezone (e.g. Asia/Colombo).")

    language = payload.language.strip()
    date_format = payload.dateFormat.strip()
    currency = payload.currency.strip()

    try:
        with pyodbc.connect(get_connection_string()) as connection:
            cursor = connection.cursor()
            ensure_system_settings_table(cursor)
            set_setting(cursor, "timezone", timezone_value)
            set_setting(cursor, "language", language)
            set_setting(cursor, "date_format", date_format)
            set_setting(cursor, "currency", currency)
            connection.commit()

            return GeneralSettingsResponse(
                timezone=timezone_value,
                language=language,
                dateFormat=date_format,
                currency=currency,
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to update general settings: {exc}") from exc


@router.get("/reply-generation", response_model=ReplyGenerationSettingsResponse)
def get_reply_generation_settings() -> ReplyGenerationSettingsResponse:
    try:
        with pyodbc.connect(get_connection_string()) as connection:
            cursor = connection.cursor()
            ensure_system_settings_table(cursor)

            google_api_key = (get_setting(cursor, "reply_google_api_key") or "").strip()
            claude_api_key = (get_setting(cursor, "reply_claude_api_key") or "").strip()
            selected_model = (get_setting(cursor, "reply_selected_model") or DEFAULT_REPLY_SELECTED_MODEL).strip() or DEFAULT_REPLY_SELECTED_MODEL
            similar_reviews_count = get_similar_reviews_count(cursor)
            google_request_count = get_setting_int(cursor, "reply_google_request_count", default=0)
            claude_request_count = get_setting_int(cursor, "reply_claude_request_count", default=0)

            return ReplyGenerationSettingsResponse(
                googleApiKey=google_api_key,
                claudeApiKey=claude_api_key,
                selectedModel=selected_model,
                similarReviewsCount=similar_reviews_count,
                googleRequestCount=google_request_count,
                claudeRequestCount=claude_request_count,
            )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to load reply generation settings: {exc}") from exc


@router.patch("/reply-generation", response_model=ReplyGenerationSettingsResponse)
def update_reply_generation_settings(payload: ReplyGenerationSettingsPayload) -> ReplyGenerationSettingsResponse:
    google_api_key = payload.googleApiKey.strip()
    claude_api_key = payload.claudeApiKey.strip()
    selected_model = payload.selectedModel.strip()
    similar_reviews_count = payload.similarReviewsCount

    if not selected_model:
        raise HTTPException(status_code=400, detail="A model selection is required.")

    provider = _infer_provider_from_model(selected_model)
    selected_api_key = google_api_key if provider == "google" else claude_api_key
    if not selected_api_key:
        selected_provider = "Google" if provider == "google" else "Claude"
        raise HTTPException(status_code=400, detail=f"{selected_provider} API key is required for the selected provider.")

    if similar_reviews_count < 1 or similar_reviews_count > 20:
        raise HTTPException(status_code=400, detail="similarReviewsCount must be between 1 and 20.")

    try:
        with pyodbc.connect(get_connection_string()) as connection:
            cursor = connection.cursor()
            ensure_system_settings_table(cursor)

            set_setting(cursor, "reply_google_api_key", google_api_key)
            set_setting(cursor, "reply_claude_api_key", claude_api_key)
            set_setting(cursor, "reply_selected_model", selected_model)
            set_setting(cursor, "reply_similar_reviews_count", str(similar_reviews_count))
            google_request_count = get_setting_int(cursor, "reply_google_request_count", default=0)
            claude_request_count = get_setting_int(cursor, "reply_claude_request_count", default=0)
            connection.commit()

            return ReplyGenerationSettingsResponse(
                googleApiKey=google_api_key,
                claudeApiKey=claude_api_key,
                selectedModel=selected_model,
                similarReviewsCount=similar_reviews_count,
                googleRequestCount=google_request_count,
                claudeRequestCount=claude_request_count,
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to update reply generation settings: {exc}") from exc


@router.post("/reply-generation/test", response_model=ReplyGenerationApiTestResponse)
def test_reply_generation_api_key(payload: ReplyGenerationApiTestPayload) -> ReplyGenerationApiTestResponse:
    provider = payload.provider.strip().lower()
    api_key = payload.apiKey.strip()
    model = (payload.model or "").strip()

    if provider not in {"google", "claude"}:
        raise HTTPException(status_code=400, detail="Provider must be either 'google' or 'claude'.")

    if not api_key:
        raise HTTPException(status_code=400, detail="API key is required.")
    if not model:
        model = DEFAULT_REPLY_GOOGLE_MODEL if provider == "google" else DEFAULT_REPLY_CLAUDE_MODEL

    try:
        if provider == "google":
            client = genai.Client(api_key=api_key, http_options={"api_version": "v1"})
            response = client.models.generate_content(model=model, contents="Reply with exactly: ok")
            if not (getattr(response, "text", "") or "").strip():
                raise ValueError("Google API returned an empty response.")
        else:
            response = requests.get(
                "https://api.anthropic.com/v1/models",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                timeout=15,
            )
            response.raise_for_status()
            payload_json = response.json() if response.content else {}
            items = payload_json.get("data") if isinstance(payload_json, dict) else []
            available_models = {
                str(item.get("id"))
                for item in items
                if isinstance(item, dict) and item.get("id")
            }
            resolved_model = model
            if available_models and model not in available_models:
                alias_target = CLAUDE_MODEL_ALIASES.get(model)
                if alias_target and alias_target in available_models:
                    resolved_model = alias_target
                else:
                    sample_models = ", ".join(sorted(available_models)[:8])
                    raise ValueError(
                        f"Model '{model}' is not available for this Claude API key. "
                        f"Available models: {sample_models}"
                    )

        return ReplyGenerationApiTestResponse(
            provider=provider,
            success=True,
            message=(
                f"API key is valid and model '{resolved_model}' is reachable."
                if provider == "claude"
                else f"API key is valid and model '{model}' is reachable."
            ),
        )
    except Exception as exc:
        return ReplyGenerationApiTestResponse(
            provider=provider,
            success=False,
            message=f"API key test failed: {exc}",
        )
