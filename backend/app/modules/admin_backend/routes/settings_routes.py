"""General admin settings routes (timezone/language/date/currency)."""

import pyodbc
from fastapi import APIRouter, HTTPException

from app.modules.admin_backend.db_utils import get_connection_string
from app.modules.admin_backend.schemas import GeneralSettingsPayload, GeneralSettingsResponse
from app.modules.admin_backend.services.system_settings_service import (
    DEFAULT_CURRENCY,
    DEFAULT_DATE_FORMAT,
    DEFAULT_LANGUAGE,
    ensure_system_settings_table,
    get_setting,
    is_valid_timezone,
    set_setting,
)

router = APIRouter(prefix="/api/settings", tags=["Settings"])


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
