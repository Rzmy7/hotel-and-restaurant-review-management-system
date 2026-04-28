"""General admin settings routes (timezone/language/date/currency)."""

from app.modules.admin.services.admin_activity_logger import log_admin_activity

import pyodbc
import requests
from fastapi import APIRouter, HTTPException, Depends
from google import genai

from app.core.db_utils import get_connection_string
from app.core.db_utils import execute_query, get_table_columns
from app.core.security import hash_password, verify_password
from app.modules.auth.constants.roles import ADMIN_ROLE_ID
from app.middleware.permissions import require_admin
from app.modules.admin.schemas import GeneralSettingsPayload, GeneralSettingsResponse
from app.modules.admin.schemas import (
    AdminPasswordChangePayload,
    AdminPasswordChangeResponse,
    AdminProfileResponse,
    AdminProfileUpdatePayload,
    FeatureFlagResponse,
    FeatureFlagUpdatePayload,
    ReplyGenerationApiTestPayload,
    ReplyGenerationApiTestResponse,
    ReplyGenerationSettingsPayload,
    ReplyGenerationSettingsResponse,
    SecuritySettingsPayload,
    SecuritySettingsResponse,
)
from app.modules.admin.services.system_settings_service import (
    DEFAULT_ADMIN_SESSION_TIMEOUT_MINUTES,
    DEFAULT_CURRENCY,
    DEFAULT_DATE_FORMAT,
    DEFAULT_LANGUAGE,
    DEFAULT_REPLY_GOOGLE_MODEL,
    DEFAULT_REPLY_SELECTED_MODEL,
    DEFAULT_REPLY_USE_EMBEDDING_RULES,
    DEFAULT_REPLY_USE_SIMILAR_REVIEWS,
    DEFAULT_USER_SESSION_TIMEOUT_MINUTES,
    ensure_system_settings_table,
    get_setting_bool,
    get_setting_int,
    get_setting,
    get_similar_reviews_count,
    is_valid_timezone,
    set_setting,
)

router = APIRouter(prefix="/settings", tags=["Admin Settings"])


FEATURE_FLAG_DEFINITIONS = {
    "content_search_embeddings": {
        "id": "1",
        "name": "Content Search by Embeddings",
        "description": "Enable semantic search across reviews and content using vector embeddings",
        "status_key": "feature_flag_content_search_embeddings",
    },
    "dark_mode": {
        "id": "2",
        "name": "Dark Mode",
        "description": "Allow users to switch between light, dark, and system themes in their settings",
        "status_key": "feature_flag_dark_mode",
    },
    "two_factor_auth": {
        "id": "3",
        "name": "Two-Factor Authentication",
        "description": "Allow users to enable two-factor authentication for their accounts",
        "status_key": "feature_flag_two_factor_auth",
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


def _split_name(value: str) -> tuple[str, str]:
    cleaned = " ".join((value or "").strip().split())
    if not cleaned:
        return "", ""
    parts = cleaned.split(" ", 1)
    first_name = parts[0]
    last_name = parts[1] if len(parts) > 1 else ""
    return first_name, last_name


def _fallback_name_from_email(email: str) -> str:
    local = (email or "").split("@")[0].strip()
    if not local:
        return "System Admin"
    tokens = [token for token in local.replace("_", " ").replace(".", " ").replace("-", " ").split(" ") if token]
    return " ".join(token.capitalize() for token in tokens) if tokens else "System Admin"


def _load_admin_row(cursor: pyodbc.Cursor, user_id: str) -> tuple:
    columns = get_table_columns(cursor, "user")
    if not columns:
        raise HTTPException(status_code=400, detail="Table dbo.[user] not found")

    if "role_id" not in columns:
        raise HTTPException(status_code=400, detail="Table dbo.[user] must include role_id for admin profile operations")

    def _col(name: str) -> str:
        return f"[{name}]" if name.lower() in columns else "NULL"

    select_clause = f"user_id, email, {_col('first_name')}, {_col('last_name')}, {_col('full_name')}, {_col('name')}, {_col('username')}, {_col('display_name')}, {_col('password_hash')}"

    query = (
        f"SELECT {select_clause} "
        "FROM dbo.[user] "
        "WHERE user_id = ? "
    )

    row = execute_query(cursor, query, (user_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="No admin user found")
    return row


def _resolve_admin_name(row: tuple) -> str:
    first_name = str(row[2]).strip() if row[2] else ""
    last_name = str(row[3]).strip() if row[3] else ""
    if first_name or last_name:
        return f"{first_name} {last_name}".strip()

    for idx in (4, 5, 6, 7):
        value = str(row[idx]).strip() if row[idx] else ""
        if value:
            return value

    email = str(row[1] or "").strip()
    return _fallback_name_from_email(email)


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

            log_admin_activity(
                "settings_updated",
                "General Settings Updated",
                f"Timezone: {timezone_value}, Language: {language}",
            )

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


@router.get("/security", response_model=SecuritySettingsResponse)
def get_security_settings() -> SecuritySettingsResponse:
    """Return the current user and admin session timeout settings."""
    try:
        with pyodbc.connect(get_connection_string()) as connection:
            cursor = connection.cursor()
            ensure_system_settings_table(cursor)

            user_timeout = get_setting_int(
                cursor,
                "session_timeout_user_minutes",
                default=DEFAULT_USER_SESSION_TIMEOUT_MINUTES,
            )
            admin_timeout = get_setting_int(
                cursor,
                "session_timeout_admin_minutes",
                default=DEFAULT_ADMIN_SESSION_TIMEOUT_MINUTES,
            )
            require_2fa = get_setting_bool(
                cursor,
                "require_two_factor_auth",
                default=False,
            )

            return SecuritySettingsResponse(
                userSessionTimeoutMinutes=user_timeout,
                adminSessionTimeoutMinutes=admin_timeout,
                requireTwoFactorAuth=require_2fa,
            )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to load security settings: {exc}") from exc


@router.patch("/security", response_model=SecuritySettingsResponse)
def update_security_settings(payload: SecuritySettingsPayload) -> SecuritySettingsResponse:
    """Persist user and admin session timeout values."""
    try:
        with pyodbc.connect(get_connection_string()) as connection:
            cursor = connection.cursor()
            ensure_system_settings_table(cursor)

            set_setting(cursor, "session_timeout_user_minutes", str(payload.userSessionTimeoutMinutes))
            set_setting(cursor, "session_timeout_admin_minutes", str(payload.adminSessionTimeoutMinutes))
            set_setting(cursor, "require_two_factor_auth", "true" if payload.requireTwoFactorAuth else "false")
            connection.commit()

            log_admin_activity(
                "settings_updated",
                "Security Settings Updated",
                f"User timeout: {payload.userSessionTimeoutMinutes}m, Admin timeout: {payload.adminSessionTimeoutMinutes}m, 2FA Required: {payload.requireTwoFactorAuth}",
            )

            return SecuritySettingsResponse(
                userSessionTimeoutMinutes=payload.userSessionTimeoutMinutes,
                adminSessionTimeoutMinutes=payload.adminSessionTimeoutMinutes,
                requireTwoFactorAuth=payload.requireTwoFactorAuth,
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to update security settings: {exc}") from exc


@router.get("/admin-profile", response_model=AdminProfileResponse)
def get_admin_profile(current_user: dict = Depends(require_admin)) -> AdminProfileResponse:
    try:
        with pyodbc.connect(get_connection_string()) as connection:
            cursor = connection.cursor()
            row = _load_admin_row(cursor, current_user["user_id"])
            return AdminProfileResponse(name=_resolve_admin_name(row))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to load admin profile: {exc}") from exc


@router.patch("/admin-profile", response_model=AdminProfileResponse)
def update_admin_profile(payload: AdminProfileUpdatePayload, current_user: dict = Depends(require_admin)) -> AdminProfileResponse:
    name_value = " ".join(payload.name.strip().split())
    if not name_value:
        raise HTTPException(status_code=400, detail="Name cannot be empty")

    try:
        with pyodbc.connect(get_connection_string()) as connection:
            cursor = connection.cursor()
            columns = get_table_columns(cursor, "user")
            row = _load_admin_row(cursor, current_user["user_id"])
            user_id = row[0]

            set_clauses: list[str] = []
            params: list = []

            if "first_name" in columns:
                first_name, last_name = _split_name(name_value)
                set_clauses.append("first_name = ?")
                params.append(first_name)
                if "last_name" in columns:
                    set_clauses.append("last_name = ?")
                    params.append(last_name)

            if "full_name" in columns:
                set_clauses.append("full_name = ?")
                params.append(name_value)
            if "name" in columns:
                set_clauses.append("[name] = ?")
                params.append(name_value)
            if "display_name" in columns:
                set_clauses.append("display_name = ?")
                params.append(name_value)

            if not set_clauses:
                raise HTTPException(status_code=400, detail="No supported name column found on dbo.[user]")

            params.append(user_id)
            execute_query(
                cursor,
                f"UPDATE dbo.[user] SET {', '.join(set_clauses)} WHERE user_id = ?",
                tuple(params),
            )
            connection.commit()

            log_admin_activity(
                "settings_updated",
                "Admin Profile Updated",
                f"Name changed to '{name_value}'",
            )

            return AdminProfileResponse(name=name_value)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to update admin profile: {exc}") from exc


@router.patch("/admin-profile/password", response_model=AdminPasswordChangeResponse)
def change_admin_password(payload: AdminPasswordChangePayload, current_user: dict = Depends(require_admin)) -> AdminPasswordChangeResponse:
    if payload.currentPassword == payload.newPassword:
        raise HTTPException(status_code=400, detail="New password must be different from current password")

    try:
        with pyodbc.connect(get_connection_string()) as connection:
            cursor = connection.cursor()
            columns = get_table_columns(cursor, "user")
            if "password_hash" not in columns:
                raise HTTPException(status_code=400, detail="Table dbo.[user] must include password_hash to change password")

            row = _load_admin_row(cursor, current_user["user_id"])
            user_id = row[0]
            password_hash = str(row[8] or "").strip()

            if not password_hash:
                raise HTTPException(status_code=400, detail="Password login is not available for this admin account")

            if not verify_password(payload.currentPassword, password_hash):
                raise HTTPException(status_code=400, detail="Current password is incorrect")

            next_hash = hash_password(payload.newPassword)
            execute_query(
                cursor,
                "UPDATE dbo.[user] SET password_hash = ? WHERE user_id = ?",
                (next_hash, user_id),
            )
            connection.commit()

            log_admin_activity(
                "settings_updated",
                "Admin Password Changed",
                "Password was updated via admin panel",
            )

            return AdminPasswordChangeResponse(message="Password updated successfully")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to change admin password: {exc}") from exc


@router.get("/reply-generation", response_model=ReplyGenerationSettingsResponse)
def get_reply_generation_settings() -> ReplyGenerationSettingsResponse:
    try:
        with pyodbc.connect(get_connection_string()) as connection:
            cursor = connection.cursor()
            ensure_system_settings_table(cursor)

            google_api_key = (get_setting(cursor, "reply_google_api_key") or "").strip()
            selected_model = (get_setting(cursor, "reply_selected_model") or DEFAULT_REPLY_SELECTED_MODEL).strip() or DEFAULT_REPLY_SELECTED_MODEL
            similar_reviews_count = get_similar_reviews_count(cursor)
            google_request_count = get_setting_int(cursor, "reply_google_request_count", default=0)
            google_token_usage = get_setting_int(cursor, "reply_google_token_usage", default=0)
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
                selectedModel=selected_model,
                similarReviewsCount=similar_reviews_count,
                googleRequestCount=google_request_count,
                googleTokenUsage=google_token_usage,
                useEmbeddingRules=use_embedding_rules,
                useSimilarReviews=use_similar_reviews,
            )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to load reply generation settings: {exc}") from exc


@router.patch("/reply-generation", response_model=ReplyGenerationSettingsResponse)
def update_reply_generation_settings(payload: ReplyGenerationSettingsPayload) -> ReplyGenerationSettingsResponse:
    google_api_key = payload.googleApiKey.strip()
    google_api_key = "".join(c for c in google_api_key if ord(c) < 128)
    selected_model = payload.selectedModel.strip()
    similar_reviews_count = payload.similarReviewsCount
    use_embedding_rules = payload.useEmbeddingRules
    use_similar_reviews = payload.useSimilarReviews

    if not selected_model:
        raise HTTPException(status_code=400, detail="A model selection is required.")

    if not google_api_key:
        raise HTTPException(status_code=400, detail="Google API key is required for the selected provider.")

    if similar_reviews_count < 1 or similar_reviews_count > 20:
        raise HTTPException(status_code=400, detail="similarReviewsCount must be between 1 and 20.")

    try:
        with pyodbc.connect(get_connection_string()) as connection:
            cursor = connection.cursor()
            ensure_system_settings_table(cursor)

            set_setting(cursor, "reply_google_api_key", google_api_key)
            set_setting(cursor, "reply_selected_model", selected_model)
            set_setting(cursor, "reply_similar_reviews_count", str(similar_reviews_count))
            set_setting(cursor, "reply_use_embedding_rules", "true" if use_embedding_rules else "false")
            set_setting(cursor, "reply_use_similar_reviews", "true" if use_similar_reviews else "false")
            google_request_count = get_setting_int(cursor, "reply_google_request_count", default=0)
            google_token_usage = get_setting_int(cursor, "reply_google_token_usage", default=0)
            connection.commit()

            log_admin_activity(
                "ai_job",
                "Reply Generation Settings Updated",
                f"Model: {selected_model}, Similar reviews: {similar_reviews_count}",
            )

            return ReplyGenerationSettingsResponse(
                googleApiKey=google_api_key,
                selectedModel=selected_model,
                similarReviewsCount=similar_reviews_count,
                googleRequestCount=google_request_count,
                googleTokenUsage=google_token_usage,
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
    api_key = "".join(c for c in api_key if ord(c) < 128)
    model = (payload.model or "").strip()

    if provider != "google":
        raise HTTPException(status_code=400, detail="Provider must be 'google'.")

    if not api_key:
        raise HTTPException(status_code=400, detail="API key is required.")
    if not model:
        model = DEFAULT_REPLY_GOOGLE_MODEL

    try:
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

        return ReplyGenerationApiTestResponse(
            provider=provider,
            success=True,
            message=f"API key is valid and model '{model}' is reachable (Google API {resolved_google_version}).",
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

            # When the 2FA feature flag is disabled, bulk-disable 2FA for
            # all users and revoke outstanding OTP tokens so that no user
            # is left in a half-enabled state.
            if flag_key == "two_factor_auth" and payload.status == "Disabled":
                try:
                    cursor.execute("UPDATE dbo.[user] SET is_2fa_enabled = 0 WHERE is_2fa_enabled = 1")
                    cursor.execute("DELETE FROM dbo.two_factor_token")
                except Exception:
                    pass  # columns/table may not exist yet

            connection.commit()

            log_admin_activity(
                "settings_updated",
                "Feature Flag Updated",
                f"Flag '{flag_key}' set to {payload.status}" + (f" (limit: {payload.limit})" if payload.limit else ""),
            )

            updated_flags = _load_feature_flags(cursor)
            for flag in updated_flags:
                if flag.key == flag_key:
                    return flag

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to update feature flag: {exc}") from exc

    raise HTTPException(status_code=500, detail="Feature flag update failed")
