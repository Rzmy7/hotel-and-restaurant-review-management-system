"""
Shared pyodbc database utilities for the admin_backend module.

Consolidated from the duplicated helpers in the original admin-backend routers.
"""

import os
import re
from datetime import date, datetime
from typing import Any

import pyodbc
from dotenv import load_dotenv

load_dotenv()


# ── Driver resolution ───────────────────────────────────────────────


def _resolve_db_driver() -> str:
    """Pick the best available ODBC driver for SQL Server."""
    preferred_driver = os.getenv("DB_DRIVER", "ODBC Driver 17 for SQL Server")
    available_drivers = {driver.lower(): driver for driver in pyodbc.drivers()}

    if preferred_driver.lower() in available_drivers:
        return available_drivers[preferred_driver.lower()]

    fallback_candidates = [
        "ODBC Driver 18 for SQL Server",
        "ODBC Driver 17 for SQL Server",
        "SQL Server",
    ]
    for candidate in fallback_candidates:
        if candidate.lower() in available_drivers:
            return available_drivers[candidate.lower()]

    return preferred_driver


def get_connection_string() -> str:
    """Build a pyodbc connection string from environment variables."""
    server = os.getenv("DB_SERVER")
    database = os.getenv("DB_NAME")
    uid = os.getenv("DB_UID")
    pwd = os.getenv("DB_PWD")

    missing_vars = [
        name
        for name, value in {
            "DB_SERVER": server,
            "DB_NAME": database,
            "DB_UID": uid,
            "DB_PWD": pwd,
        }.items()
        if not value
    ]
    if missing_vars:
        raise ValueError(f"Missing required database environment variables: {', '.join(missing_vars)}")

    resolved_driver = _resolve_db_driver()

    connection_parts = [
        f"DRIVER={{{resolved_driver}}}",
        f"SERVER={server}",
        f"DATABASE={database}",
        f"UID={uid}",
        f"PWD={pwd}",
    ]

    driver_lower = resolved_driver.lower()
    if "odbc driver 18 for sql server" in driver_lower:
        connection_parts.extend(["Encrypt=no", "TrustServerCertificate=yes"])
    elif "odbc driver 17 for sql server" in driver_lower:
        connection_parts.append("TrustServerCertificate=yes")

    return ";".join(connection_parts) + ";"


# ── Query execution helpers ─────────────────────────────────────────


def sql_literal(value: Any) -> str:
    """Convert a Python value to a safe SQL literal string."""
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
    escaped = str(value).replace("'", "''")
    return f"'{escaped}'"


def inline_query_params(query: str, params: tuple[Any, ...]) -> str:
    """Inline bind parameters into a query string (fallback for driver issues)."""
    inlined_query = query
    for param in params:
        inlined_query = inlined_query.replace("?", sql_literal(param), 1)
    return inlined_query


def execute_query(cursor: pyodbc.Cursor, query: str, params: tuple[Any, ...] = ()) -> pyodbc.Cursor:
    """Execute a parameterised query with automatic fallback to inline params."""
    if not params:
        return cursor.execute(query)

    try:
        return cursor.execute(query, params)
    except pyodbc.Error as error:
        if "SQLBindParameter" not in str(error):
            raise
        return cursor.execute(inline_query_params(query, params))


# ── Schema introspection ────────────────────────────────────────────


def table_exists(cursor: pyodbc.Cursor, table_name: str, schema: str = "dbo") -> bool:
    """Check whether a table exists in the database."""
    row = execute_query(
        cursor,
        """
        SELECT 1
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        """,
        (schema, table_name),
    ).fetchone()
    return row is not None


def get_table_columns(cursor: pyodbc.Cursor, table_name: str, schema: str = "dbo") -> set[str]:
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


def get_table_column_map(cursor: pyodbc.Cursor, table_name: str, schema: str = "dbo") -> dict[str, str]:
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


def count_scalar(cursor: pyodbc.Cursor, query: str, params: tuple[Any, ...] = ()) -> int:
    """Execute a COUNT query and return the scalar integer result."""
    row = execute_query(cursor, query, params).fetchone()
    return int(row[0]) if row and row[0] is not None else 0


def pick_existing_column(columns: set[str], candidates: list[str]) -> str | None:
    """Return the first candidate column name that exists in the columns set."""
    for candidate in candidates:
        if candidate.lower() in columns:
            return candidate
    return None


def is_valid_sql_identifier(value: str) -> bool:
    """Check whether a string is a safe SQL identifier."""
    return bool(re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", value))


# ── Timestamp helpers ───────────────────────────────────────────────


def to_datetime(value: Any) -> datetime | None:
    """Coerce a date/datetime/None to a datetime or None."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time())
    return None


def to_relative_timestamp(value: Any) -> str:
    """Convert a datetime into a human-readable relative string."""
    if value is None:
        return "just now"

    if isinstance(value, date) and not isinstance(value, datetime):
        value = datetime.combine(value, datetime.min.time())

    now = datetime.now(value.tzinfo) if isinstance(value, datetime) and value.tzinfo else datetime.now()
    delta = now - value
    seconds = int(delta.total_seconds())

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


# ── Date arithmetic ─────────────────────────────────────────────────


def month_start(value: date) -> date:
    """Return the first day of the month for *value*."""
    return value.replace(day=1)


def shift_month(value: date, delta: int) -> date:
    """Shift *value* by *delta* months."""
    month_index = (value.month - 1) + delta
    year = value.year + (month_index // 12)
    month = (month_index % 12) + 1
    return date(year, month, 1)


def growth(current_value: int, previous_value: int) -> float:
    """Calculate percentage growth between two values."""
    if previous_value == 0:
        return 100.0 if current_value > 0 else 0.0
    return round(((current_value - previous_value) / previous_value) * 100, 1)
