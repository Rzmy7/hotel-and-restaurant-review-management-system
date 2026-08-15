"""Helpers for persisted admin system settings stored in dbo.system_settings."""

from zoneinfo import ZoneInfo

import pyodbc


DEFAULT_TIMEZONE = "UTC"
DEFAULT_LANGUAGE = "en"
DEFAULT_DATE_FORMAT = "MM/DD/YYYY"
DEFAULT_CURRENCY = "USD ($)"
DEFAULT_SIMILAR_REVIEWS_COUNT = 3
DEFAULT_REPLY_USE_EMBEDDING_RULES = True
DEFAULT_REPLY_USE_SIMILAR_REVIEWS = True
DEFAULT_USER_SESSION_TIMEOUT_MINUTES = 60
DEFAULT_ADMIN_SESSION_TIMEOUT_MINUTES = 60

# Review processing batch size — how many reviews are sent to the LLM per API call.
# Smaller = safer (less truncation risk), larger = faster (fewer API calls).
REVIEW_BATCH_SIZE_DEFAULT = 5
REVIEW_BATCH_SIZE_MIN = 1
REVIEW_BATCH_SIZE_MAX = 20

# Scheduler Intervals (in minutes)
DEFAULT_REVIEW_PROCESSING_INTERVAL_MINUTES = 1
DEFAULT_DEDUPLICATION_INTERVAL_MINUTES = 60


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


def get_review_batch_size(cursor: pyodbc.Cursor) -> int:
    """Return the configured review processing batch size, clamped to [min, max]."""
    value = (get_setting(cursor, "review_batch_size") or "").strip()
    if not value:
        return REVIEW_BATCH_SIZE_DEFAULT
    try:
        parsed = int(value)
    except ValueError:
        return REVIEW_BATCH_SIZE_DEFAULT
    return max(REVIEW_BATCH_SIZE_MIN, min(REVIEW_BATCH_SIZE_MAX, parsed))


def set_review_batch_size(cursor: pyodbc.Cursor, size: int) -> int:
    """Persist a validated batch size. Returns the clamped value that was saved."""
    clamped = max(REVIEW_BATCH_SIZE_MIN, min(REVIEW_BATCH_SIZE_MAX, int(size)))
    set_setting(cursor, "review_batch_size", str(clamped))
    return clamped


# Parallel review processing batches - how many batches of size review_batch_size can run concurrently.
REVIEW_PARALLEL_BATCHES_DEFAULT = 1
REVIEW_PARALLEL_BATCHES_MIN = 1
REVIEW_PARALLEL_BATCHES_MAX = 10


def get_review_parallel_batches(cursor: pyodbc.Cursor) -> int:
    """Return the configured number of parallel review processing batches, clamped to [min, max]."""
    value = (get_setting(cursor, "review_parallel_batches") or "").strip()
    if not value:
        return REVIEW_PARALLEL_BATCHES_DEFAULT
    try:
        parsed = int(value)
    except ValueError:
        return REVIEW_PARALLEL_BATCHES_DEFAULT
    return max(REVIEW_PARALLEL_BATCHES_MIN, min(REVIEW_PARALLEL_BATCHES_MAX, parsed))


def set_review_parallel_batches(cursor: pyodbc.Cursor, count: int) -> int:
    """Persist a validated parallel batches count. Returns the clamped value that was saved."""
    clamped = max(REVIEW_PARALLEL_BATCHES_MIN, min(REVIEW_PARALLEL_BATCHES_MAX, int(count)))
    set_setting(cursor, "review_parallel_batches", str(clamped))
    return clamped



def get_session_timeout_minutes(cursor: pyodbc.Cursor, role: str) -> int:
    """Return the configured session timeout in minutes for a given role.

    *role* is compared case-insensitively.  ``"admin"`` maps to
    ``session_timeout_admin_minutes``; everything else maps to
    ``session_timeout_user_minutes``.
    """
    if role.strip().lower() == "admin":
        return get_setting_int(
            cursor,
            "session_timeout_admin_minutes",
            default=DEFAULT_ADMIN_SESSION_TIMEOUT_MINUTES,
        )
    return get_setting_int(
        cursor,
        "session_timeout_user_minutes",
        default=DEFAULT_USER_SESSION_TIMEOUT_MINUTES,
    )
