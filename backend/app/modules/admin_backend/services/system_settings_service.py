"""Helpers for persisted admin system settings stored in dbo.system_settings."""

from zoneinfo import ZoneInfo

import pyodbc


DEFAULT_TIMEZONE = "UTC"
DEFAULT_LANGUAGE = "en"
DEFAULT_DATE_FORMAT = "MM/DD/YYYY"
DEFAULT_CURRENCY = "USD ($)"


def ensure_system_settings_table(cursor: pyodbc.Cursor) -> None:
    cursor.execute(
        """
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
        """
    )


def get_setting(cursor: pyodbc.Cursor, key: str) -> str | None:
    ensure_system_settings_table(cursor)
    row = cursor.execute(
        """
        SELECT setting_value
        FROM dbo.system_settings
        WHERE setting_key = ?
        """,
        (key,),
    ).fetchone()
    if not row:
        return None
    return str(row[0] or "")


def set_setting(cursor: pyodbc.Cursor, key: str, value: str) -> None:
    ensure_system_settings_table(cursor)
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


def is_valid_timezone(value: str) -> bool:
    try:
        ZoneInfo(value)
        return True
    except Exception:
        return False


def get_system_timezone(cursor: pyodbc.Cursor) -> str:
    value = (get_setting(cursor, "timezone") or "").strip()
    if value and is_valid_timezone(value):
        return value
    return DEFAULT_TIMEZONE
