"""
User admin stats service.

Provides system-wide user metrics consumed by the admin dashboard.
All functions accept an open pyodbc cursor so they can participate in a single
connection/transaction managed by the caller.
"""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import pyodbc

from app.core.db_utils import (
    count_scalar,
    growth,
    month_start,
    shift_month,
    table_exists,
)


def get_total_users(cursor: "pyodbc.Cursor") -> tuple[int, float]:
    """
    Return (total_user_count, month_over_month_growth_pct).

    Growth is calculated as: current month registrations vs previous month.
    Falls back to (0, 0.0) when the `user` table does not exist.
    """
    if not table_exists(cursor, "user"):
        return 0, 0.0

    total = count_scalar(cursor, "SELECT COUNT(*) FROM dbo.[user]")

    current_month = month_start(date.today())
    previous_month = shift_month(current_month, -1)
    next_month = shift_month(current_month, 1)

    current_count = count_scalar(
        cursor,
        """
        SELECT COUNT(*)
        FROM dbo.[user]
        WHERE CAST(created_at AS datetime2) >= ? AND CAST(created_at AS datetime2) < ?
        """,
        (current_month, next_month),
    )
    previous_count = count_scalar(
        cursor,
        """
        SELECT COUNT(*)
        FROM dbo.[user]
        WHERE CAST(created_at AS datetime2) >= ? AND CAST(created_at AS datetime2) < ?
        """,
        (previous_month, current_month),
    )

    return total, growth(current_count, previous_count)


def get_active_users_today(cursor: "pyodbc.Cursor") -> int:
    """
    Return the count of users who were active today (last_login_at = today).

    Falls back to 0 when the `user` table does not exist.
    """
    if not table_exists(cursor, "user"):
        return 0

    return count_scalar(
        cursor,
        """
        SELECT COUNT(*)
        FROM dbo.[user]
        WHERE is_active = 1
          AND CAST(last_login_at AS date) = CAST(GETDATE() AS date)
        """,
    )
