"""
Shared pyodbc database utilities — used by multiple modules.

These helpers are intentionally kept in app.core to avoid circular imports.
Any module-level service that needs raw pyodbc helpers should import from here,
NOT from app.core.db_utils (which creates circular import cycles when
imported by modules outside the admin package).
"""

from __future__ import annotations

import os
import re
from datetime import date, datetime
from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    import pyodbc

from dotenv import load_dotenv

load_dotenv()


# ── Driver resolution ────────────────────────────────────────────────


def _resolve_db_driver() -> str:
    import pyodbc as _pyodbc

    preferred = os.getenv("DB_DRIVER", "ODBC Driver 17 for SQL Server")
    available = {d.lower(): d for d in _pyodbc.drivers()}
    if preferred.lower() in available:
        return available[preferred.lower()]
    for candidate in [
        "ODBC Driver 18 for SQL Server",
        "ODBC Driver 17 for SQL Server",
        "SQL Server",
    ]:
        if candidate.lower() in available:
            return available[candidate.lower()]
    return preferred


def get_connection_string() -> str:
    """Build a pyodbc connection string from environment variables."""
    server = os.getenv("DB_SERVER")
    database = os.getenv("DB_NAME")
    uid = os.getenv("DB_UID")
    pwd = os.getenv("DB_PWD")

    missing = [
        k
        for k, v in {
            "DB_SERVER": server,
            "DB_NAME": database,
            "DB_UID": uid,
            "DB_PWD": pwd,
        }.items()
        if not v
    ]
    if missing:
        raise ValueError(
            f"Missing required database environment variables: {', '.join(missing)}"
        )

    driver = _resolve_db_driver()
    parts = [
        f"DRIVER={{{driver}}}",
        f"SERVER={server}",
        f"DATABASE={database}",
        f"UID={uid}",
        f"PWD={pwd}",
        "LoginTimeout=30",
    ]
    d_lower = driver.lower()
    if "odbc driver 18" in d_lower:
        parts.extend(["Encrypt=no", "TrustServerCertificate=yes"])
    elif "odbc driver 17" in d_lower:
        parts.append("TrustServerCertificate=yes")

    return ";".join(parts) + ";"


# ── Query helpers ────────────────────────────────────────────────────


def execute_query(
    cursor: "pyodbc.Cursor", query: str, params: tuple[Any, ...] = ()
) -> "pyodbc.Cursor":
    """Execute a parameterised query, falling back to inlined params on driver error."""
    import pyodbc as _pyodbc

    if not params:
        return cursor.execute(query)
    try:
        return cursor.execute(query, params)
    except _pyodbc.Error as err:
        if "SQLBindParameter" not in str(err):
            raise
        # Fallback: inline params as literals
        inlined = query
        for p in params:
            inlined = inlined.replace("?", _sql_literal(p), 1)
        return cursor.execute(inlined)


def _sql_literal(value: Any) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, datetime):
        return f"'{value.strftime('%Y-%m-%d %H:%M:%S')}'"
    if isinstance(value, date):
        return f"'{value.strftime('%Y-%m-%d')}'"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return str(value)
    return f"'{str(value).replace(chr(39), chr(39)*2)}'"


def count_scalar(
    cursor: "pyodbc.Cursor", query: str, params: tuple[Any, ...] = ()
) -> int:
    row = execute_query(cursor, query, params).fetchone()
    return int(row[0]) if row and row[0] is not None else 0


def table_exists(cursor: "pyodbc.Cursor", table_name: str, schema: str = "dbo") -> bool:
    row = execute_query(
        cursor,
        "SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?",
        (schema, table_name),
    ).fetchone()
    return row is not None


def get_table_columns(
    cursor: "pyodbc.Cursor", table_name: str, schema: str = "dbo"
) -> set:
    """Return a set of lower-cased column names for a table."""
    rows = execute_query(
        cursor,
        """
        SELECT LOWER(COLUMN_NAME)
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        """,
        (schema, table_name),
    ).fetchall()
    return {str(row[0]) for row in rows}


def get_table_column_map(
    cursor: "pyodbc.Cursor", table_name: str, schema: str = "dbo"
) -> dict:
    """Return a mapping of lower-cased column name → original column name."""
    rows = execute_query(
        cursor,
        """
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        """,
        (schema, table_name),
    ).fetchall()
    return {str(row[0]).lower(): str(row[0]) for row in rows}


def pick_existing_column(columns: set, candidates: list) -> "str | None":
    """Return the first candidate column name that exists in the columns set."""
    for candidate in candidates:
        if candidate.lower() in columns:
            return candidate
    return None


def is_valid_sql_identifier(value: str) -> bool:
    """Check whether a string is a safe SQL identifier (no injection risk)."""
    return bool(re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", value))


def to_datetime(value: Any) -> "datetime | None":
    """Coerce a date/datetime/None to a datetime or None."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time())
    return None


# ── Date helpers ─────────────────────────────────────────────────────


def month_start(value: date) -> date:
    return value.replace(day=1)


def shift_month(value: date, delta: int) -> date:
    idx = (value.month - 1) + delta
    return date(value.year + (idx // 12), (idx % 12) + 1, 1)


def growth(current: int, previous: int) -> float:
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round(((current - previous) / previous) * 100, 1)


def to_relative_timestamp(value: Any) -> str:
    if value is None:
        return "just now"
    if isinstance(value, date) and not isinstance(value, datetime):
        value = datetime.combine(value, datetime.min.time())
    now = datetime.now(value.tzinfo) if value.tzinfo else datetime.now()
    seconds = int((now - value).total_seconds())
    if seconds < 60:
        return "just now"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours} hour{'s' if hours != 1 else ''} ago"
    days = hours // 24
    return f"{days} day{'s' if days != 1 else ''} ago"
