import os
from typing import Optional
from zoneinfo import ZoneInfo

import pyodbc
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

load_dotenv()

router = APIRouter(prefix="/api/settings", tags=["settings"])


class GeneralSettingsResponse(BaseModel):
    timezone: str
    language: str
    dateFormat: str
    currency: str


class GeneralSettingsPayload(BaseModel):
    timezone: str = Field(..., min_length=1, max_length=100)
    language: str = Field(..., min_length=1, max_length=32)
    dateFormat: str = Field(..., min_length=1, max_length=64)
    currency: str = Field(..., min_length=1, max_length=64)


def _connection_string() -> str:
    server = os.getenv("DB_SERVER")
    database = os.getenv("DB_NAME")
    uid = os.getenv("DB_UID")
    pwd = os.getenv("DB_PWD")
    driver = os.getenv("DB_DRIVER", "ODBC Driver 17 for SQL Server")

    missing = [
        name
        for name, value in {
            "DB_SERVER": server,
            "DB_NAME": database,
            "DB_UID": uid,
            "DB_PWD": pwd,
        }.items()
        if not value
    ]
    if missing:
        raise HTTPException(
            status_code=500, detail=f"Missing DB config: {', '.join(missing)}"
        )

    return (
        f"DRIVER={{{driver}}};"
        f"SERVER={server};"
        f"DATABASE={database};"
        f"UID={uid};"
        f"PWD={pwd};"
        "TrustServerCertificate=yes;"
    )


def _ensure_system_settings_table(cursor: pyodbc.Cursor) -> None:
    cursor.execute("""
        IF OBJECT_ID('dbo.system_settings', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.system_settings (
                setting_key NVARCHAR(100) NOT NULL
                    CONSTRAINT PK_system_settings PRIMARY KEY,
                setting_value NVARCHAR(255) NOT NULL,
                updated_at DATETIME2(7) NOT NULL
                    CONSTRAINT DF_system_settings_updated_at DEFAULT SYSUTCDATETIME()
            );
        END;
        """)


def _get_setting(cursor: pyodbc.Cursor, key: str) -> Optional[str]:
    row = cursor.execute(
        """
        SELECT setting_value
        FROM dbo.system_settings
        WHERE setting_key = ?
        """,
        key,
    ).fetchone()
    if not row:
        return None
    return str(row[0] or "").strip()


def _set_setting(cursor: pyodbc.Cursor, key: str, value: str) -> None:
    normalized = value.strip()
    cursor.execute(
        """
        IF EXISTS (SELECT 1 FROM dbo.system_settings WHERE setting_key = ?)
        BEGIN
            UPDATE dbo.system_settings
            SET setting_value = ?, updated_at = SYSUTCDATETIME()
            WHERE setting_key = ?
        END
        ELSE
        BEGIN
            INSERT INTO dbo.system_settings (setting_key, setting_value)
            VALUES (?, ?)
        END
        """,
        (key, normalized, key, key, normalized),
    )


def _is_valid_timezone(value: str) -> bool:
    try:
        ZoneInfo(value)
        return True
    except Exception:
        return False


@router.get("/general", response_model=GeneralSettingsResponse)
def get_general_settings() -> GeneralSettingsResponse:
    connection = pyodbc.connect(_connection_string())
    try:
        cursor = connection.cursor()
        _ensure_system_settings_table(cursor)

        timezone_value = _get_setting(cursor, "timezone") or "UTC"
        if not _is_valid_timezone(timezone_value):
            timezone_value = "UTC"

        language = _get_setting(cursor, "language") or "en"
        date_format = _get_setting(cursor, "date_format") or "MM/DD/YYYY"
        currency = _get_setting(cursor, "currency") or "USD ($)"

        connection.commit()
        return GeneralSettingsResponse(
            timezone=timezone_value,
            language=language,
            dateFormat=date_format,
            currency=currency,
        )
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(
            status_code=500, detail=f"Unable to load general settings: {exc}"
        )
    finally:
        connection.close()


@router.patch("/general", response_model=GeneralSettingsResponse)
def update_general_settings(payload: GeneralSettingsPayload) -> GeneralSettingsResponse:
    timezone_value = payload.timezone.strip()
    if not _is_valid_timezone(timezone_value):
        raise HTTPException(
            status_code=400,
            detail="Invalid timezone. Use a valid IANA timezone (e.g. Asia/Colombo).",
        )

    language = payload.language.strip()
    date_format = payload.dateFormat.strip()
    currency = payload.currency.strip()

    connection = pyodbc.connect(_connection_string())
    try:
        cursor = connection.cursor()
        _ensure_system_settings_table(cursor)
        _set_setting(cursor, "timezone", timezone_value)
        _set_setting(cursor, "language", language)
        _set_setting(cursor, "date_format", date_format)
        _set_setting(cursor, "currency", currency)
        connection.commit()

        return GeneralSettingsResponse(
            timezone=timezone_value,
            language=language,
            dateFormat=date_format,
            currency=currency,
        )
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(
            status_code=500, detail=f"Unable to update general settings: {exc}"
        )
    finally:
        connection.close()
