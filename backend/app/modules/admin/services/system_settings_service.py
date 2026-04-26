"""Helpers for persisted admin system settings stored in dbo.system_settings."""

from zoneinfo import ZoneInfo

import pyodbc

DEFAULT_TIMEZONE = "UTC"
DEFAULT_LANGUAGE = "en"
DEFAULT_DATE_FORMAT = "MM/DD/YYYY"
DEFAULT_CURRENCY = "USD ($)"
DEFAULT_REPLY_PROVIDER = "google"
DEFAULT_SIMILAR_REVIEWS_COUNT = 3
DEFAULT_REPLY_GOOGLE_MODEL = "gemini-2.5-flash-lite"
DEFAULT_REPLY_SELECTED_MODEL = DEFAULT_REPLY_GOOGLE_MODEL
DEFAULT_REPLY_USE_EMBEDDING_RULES = True
DEFAULT_REPLY_USE_SIMILAR_REVIEWS = True


def ensure_system_settings_table(cursor: pyodbc.Cursor) -> None:
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


def get_reply_provider(cursor: pyodbc.Cursor) -> str:
    value = (get_setting(cursor, "reply_provider") or "").strip().lower()
    if value == "google":
        return value
    return DEFAULT_REPLY_PROVIDER


def get_similar_reviews_count(cursor: pyodbc.Cursor) -> int:
    value = (get_setting(cursor, "reply_similar_reviews_count") or "").strip()
    if not value:
        return DEFAULT_SIMILAR_REVIEWS_COUNT

    try:
        parsed = int(value)
    except ValueError:
        return DEFAULT_SIMILAR_REVIEWS_COUNT

    if parsed < 1:
        return 1
    if parsed > 20:
        return 20
    return parsed


def get_setting_int(cursor: pyodbc.Cursor, key: str, default: int = 0) -> int:
    raw_value = (get_setting(cursor, key) or "").strip()
    if not raw_value:
        return default

    try:
        parsed = int(raw_value)
    except ValueError:
        return default

    if parsed < 0:
        return 0
    return parsed


def get_setting_bool(cursor: pyodbc.Cursor, key: str, default: bool = False) -> bool:
    raw_value = (get_setting(cursor, key) or "").strip().lower()
    if not raw_value:
        return default

    if raw_value in {"1", "true", "yes", "on", "enabled"}:
        return True
    if raw_value in {"0", "false", "no", "off", "disabled"}:
        return False

    return default


def increment_setting_counter(cursor: pyodbc.Cursor, key: str, delta: int = 1) -> int:
    current = get_setting_int(cursor, key, default=0)
    next_value = max(0, current + delta)
    set_setting(cursor, key, str(next_value))
    return next_value


def get_setting_bool_orm(db: "Session", key: str, default: bool = False) -> bool:
    """ORM-based boolean setting retrieval."""
    from app.modules.admin.models import SystemSetting

    setting = db.query(SystemSetting).filter(SystemSetting.setting_key == key).first()
    if not setting:
        return default

    val = setting.setting_value.strip().lower()
    if val in {"1", "true", "yes", "on", "enabled"}:
        return True
    if val in {"0", "false", "no", "off", "disabled"}:
        return False
    return default
