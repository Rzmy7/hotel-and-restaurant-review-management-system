"""General admin settings routes (timezone/language/date/currency)."""

import pyodbc
import requests
from fastapi import APIRouter, HTTPException
from google import genai
try:
    from anthropic import Anthropic
except Exception:
    Anthropic = None

from app.modules.admin.db_utils import get_connection_string
from app.modules.admin.schemas import GeneralSettingsPayload, GeneralSettingsResponse
from app.modules.admin.schemas import (
    FeatureFlagResponse,
    FeatureFlagUpdatePayload,
    ReplyGenerationApiTestPayload,
    ReplyGenerationApiTestResponse,
    ReplyGenerationSettingsPayload,
    ReplyGenerationSettingsResponse,
)
from app.modules.admin.services.system_settings_service import (
    DEFAULT_CURRENCY,
    DEFAULT_DATE_FORMAT,
    DEFAULT_LANGUAGE,
    DEFAULT_REPLY_CLAUDE_MODEL,
    DEFAULT_REPLY_GOOGLE_MODEL,
    DEFAULT_REPLY_SELECTED_MODEL,
    DEFAULT_REPLY_USE_EMBEDDING_RULES,
    DEFAULT_REPLY_USE_SIMILAR_REVIEWS,
    ensure_system_settings_table,
    get_setting_bool,
    get_setting_int,
    get_setting,
    get_similar_reviews_count,
    is_valid_timezone,
    set_setting,
)

router = APIRouter(prefix="/settings", tags=["Admin Settings"])

CLAUDE_MODEL_ALIASES: dict[str, str] = {
    "claude-3-5-sonnet-latest": "claude-sonnet-4-6",
    "claude-3-5-sonnet-20241022": "claude-sonnet-4-6",
    "claude-3-5-haiku-latest": "claude-haiku-4-5-20251001",
    "claude-3-5-haiku-20241022": "claude-haiku-4-5-20251001",
    "claude-3-opus-latest": "claude-opus-4-6",
    "claude-3-opus-20240229": "claude-opus-4-6",
}


FEATURE_FLAG_DEFINITIONS = {
    "content_search_embeddings": {
        "id": "1",
        "name": "Content Search by Embeddings",
        "description": "Enable semantic search across reviews and content using vector embeddings",
        "status_key": "feature_flag_content_search_embeddings",
    },
    "reply_regeneration_limit": {
        "id": "2",
        "name": "Reply Regeneration Limit",
        "description": "Set maximum number of times a reply can be regenerated per review",
        "status_key": "feature_flag_reply_regeneration_limit",
        "limit_key": "feature_flag_reply_regeneration_limit_value",
    },
}


def _normalize_flag_status(raw_value: str | None, default: str = "Enabled") -> str:
    normalized = (raw_value or "").strip().lower()
    if normalized in {"disabled", "false", "0"}:
        return "Disabled"
    if normalized in {"enabled", "true", "1"}:
        return "Enabled"
    return default


def _load_feature_flags(cursor: pyodbc.Cursor) -> list[FeatureFlagResponse]:
    flags: list[FeatureFlagResponse] = []

    for key, definition in FEATURE_FLAG_DEFINITIONS.items():
        status = _normalize_flag_status(get_setting(cursor, definition["status_key"]))
        limit_value: int | None = None

        limit_key = definition.get("limit_key")
        if limit_key:
            raw_limit = (get_setting(cursor, limit_key) or "").strip()
            if raw_limit:
                try:
                    parsed_limit = int(raw_limit)
                    if parsed_limit > 0:
                        limit_value = parsed_limit
                except ValueError:
                    limit_value = None

            if limit_value is None:
                limit_value = 3

        flags.append(
            FeatureFlagResponse(
                id=definition["id"],
                key=key,
                name=definition["name"],
                description=definition["description"],
                status=status,
                limit=limit_value,
            )
        )

    return flags


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
            google_token_usage = get_setting_int(cursor, "reply_google_token_usage", default=0)
            claude_token_usage = get_setting_int(cursor, "reply_claude_token_usage", default=0)
            use_embedding_rules = get_setting_bool(
                cursor,
                "reply_use_embedding_rules",
                default=DEFAULT_REPLY_USE_EMBEDDING_RULES,
            )
            use_similar_reviews = get_setting_bool(
                cursor,
                "reply_use_similar_reviews",
                default=DEFAULT_REPLY_USE_SIMILAR_REVIEWS,
            )

            return ReplyGenerationSettingsResponse(
                googleApiKey=google_api_key,
                claudeApiKey=claude_api_key,
                selectedModel=selected_model,
                similarReviewsCount=similar_reviews_count,
                googleRequestCount=google_request_count,
                claudeRequestCount=claude_request_count,
                googleTokenUsage=google_token_usage,
                claudeTokenUsage=claude_token_usage,
                useEmbeddingRules=use_embedding_rules,
                useSimilarReviews=use_similar_reviews,
            )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to load reply generation settings: {exc}") from exc


@router.patch("/reply-generation", response_model=ReplyGenerationSettingsResponse)
def update_reply_generation_settings(payload: ReplyGenerationSettingsPayload) -> ReplyGenerationSettingsResponse:
    google_api_key = payload.googleApiKey.strip()
    claude_api_key = payload.claudeApiKey.strip()
    selected_model = payload.selectedModel.strip()
    similar_reviews_count = payload.similarReviewsCount
    use_embedding_rules = payload.useEmbeddingRules
    use_similar_reviews = payload.useSimilarReviews

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
            set_setting(cursor, "reply_use_embedding_rules", "true" if use_embedding_rules else "false")
            set_setting(cursor, "reply_use_similar_reviews", "true" if use_similar_reviews else "false")
            google_request_count = get_setting_int(cursor, "reply_google_request_count", default=0)
            claude_request_count = get_setting_int(cursor, "reply_claude_request_count", default=0)
            google_token_usage = get_setting_int(cursor, "reply_google_token_usage", default=0)
            claude_token_usage = get_setting_int(cursor, "reply_claude_token_usage", default=0)
            connection.commit()

            return ReplyGenerationSettingsResponse(
                googleApiKey=google_api_key,
                claudeApiKey=claude_api_key,
                selectedModel=selected_model,
                similarReviewsCount=similar_reviews_count,
                googleRequestCount=google_request_count,
                claudeRequestCount=claude_request_count,
                googleTokenUsage=google_token_usage,
                claudeTokenUsage=claude_token_usage,
                useEmbeddingRules=use_embedding_rules,
                useSimilarReviews=use_similar_reviews,
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
            resolved_google_version = "v1"
            last_google_error: Exception | None = None

            for api_version in ("v1", "v1beta"):
                try:
                    client = genai.Client(api_key=api_key, http_options={"api_version": api_version})
                    response = client.models.generate_content(model=model, contents="Reply with exactly: ok")
                    if not (getattr(response, "text", "") or "").strip():
                        raise ValueError("Google API returned an empty response.")
                    resolved_google_version = api_version
                    last_google_error = None
                    break
                except Exception as exc:
                    last_google_error = exc

            if last_google_error is not None:
                raise last_google_error
        else:
            resolved_model = CLAUDE_MODEL_ALIASES.get(model, model)

            if Anthropic is not None:
                client = Anthropic(api_key=api_key)
                response = client.messages.create(
                    model=resolved_model,
                    max_tokens=32,
                    messages=[{"role": "user", "content": "Hello, Claude"}],
                )
                content_blocks = getattr(response, "content", None)
                if not isinstance(content_blocks, list) or not content_blocks:
                    raise ValueError("Claude API returned an empty response.")
            else:
                response = requests.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": resolved_model,
                        "max_tokens": 32,
                        "messages": [{"role": "user", "content": "Hello, Claude"}],
                    },
                    timeout=15,
                )
                response.raise_for_status()
                payload_json = response.json() if response.content else {}
                content = payload_json.get("content") if isinstance(payload_json, dict) else None
                if not isinstance(content, list) or not content:
                    raise ValueError("Claude API returned an empty response.")

        return ReplyGenerationApiTestResponse(
            provider=provider,
            success=True,
            message=(
                f"API key is valid and model '{resolved_model}' is reachable."
                if provider == "claude"
                else f"API key is valid and model '{model}' is reachable (Google API {resolved_google_version})."
            ),
        )
    except Exception as exc:
        return ReplyGenerationApiTestResponse(
            provider=provider,
            success=False,
            message=f"API key test failed: {exc}",
        )


@router.get("/feature-flags", response_model=list[FeatureFlagResponse])
def get_feature_flags() -> list[FeatureFlagResponse]:
    try:
        with pyodbc.connect(get_connection_string()) as connection:
            cursor = connection.cursor()
            ensure_system_settings_table(cursor)
            return _load_feature_flags(cursor)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to load feature flags: {exc}") from exc


@router.patch("/feature-flags/{flag_key}", response_model=FeatureFlagResponse)
def update_feature_flag(flag_key: str, payload: FeatureFlagUpdatePayload) -> FeatureFlagResponse:
    definition = FEATURE_FLAG_DEFINITIONS.get(flag_key)
    if not definition:
        raise HTTPException(status_code=404, detail="Feature flag not found")

    try:
        with pyodbc.connect(get_connection_string()) as connection:
            cursor = connection.cursor()
            ensure_system_settings_table(cursor)

            set_setting(cursor, definition["status_key"], payload.status)

            limit_key = definition.get("limit_key")
            if limit_key:
                next_limit = payload.limit if payload.limit is not None else 3
                set_setting(cursor, limit_key, str(next_limit))

            connection.commit()

            updated_flags = _load_feature_flags(cursor)
            for flag in updated_flags:
                if flag.key == flag_key:
                    return flag

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to update feature flag: {exc}") from exc

    raise HTTPException(status_code=500, detail="Feature flag update failed")
