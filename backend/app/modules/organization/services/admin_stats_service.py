"""
Organization admin stats service.

Provides system-wide organization metrics consumed by the admin dashboard.
All functions accept an open pyodbc cursor so they can participate in a single
connection/transaction managed by the caller.
"""

from __future__ import annotations

from datetime import date, timedelta
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


def get_total_organizations(cursor: "pyodbc.Cursor") -> tuple[int, float]:
    """
    Return (total_organization_count, month_over_month_growth_pct).

    Growth is calculated as: current month count vs previous month count.
    Falls back to 0 / 0.0 when the `organization` table does not exist.
    """
    if not table_exists(cursor, "organization"):
        return 0, 0.0

    total = count_scalar(cursor, "SELECT COUNT(*) FROM dbo.organization")

    current_month = month_start(date.today())
    previous_month = shift_month(current_month, -1)
    next_month = shift_month(current_month, 1)

    current_count = count_scalar(
        cursor,
        """
        SELECT COUNT(*)
        FROM dbo.organization
        WHERE CAST(created_at AS datetime2) >= ? AND CAST(created_at AS datetime2) < ?
        """,
        (current_month, next_month),
    )
    previous_count = count_scalar(
        cursor,
        """
        SELECT COUNT(*)
        FROM dbo.organization
        WHERE CAST(created_at AS datetime2) >= ? AND CAST(created_at AS datetime2) < ?
        """,
        (previous_month, current_month),
    )

    return total, growth(current_count, previous_count)


def get_organizations_added_today(cursor: "pyodbc.Cursor") -> tuple[int, float]:
    """
    Return (organizations_added_today, growth_vs_yesterday_pct).

    Falls back to (0, 0.0) when the `organization` table does not exist.
    """
    if not table_exists(cursor, "organization"):
        return 0, 0.0

    today = date.today()
    yesterday = today - timedelta(days=1)

    added_today = count_scalar(
        cursor,
        "SELECT COUNT(*) FROM dbo.organization WHERE CAST(created_at AS date) = ?",
        (today,),
    )
    added_yesterday = count_scalar(
        cursor,
        "SELECT COUNT(*) FROM dbo.organization WHERE CAST(created_at AS date) = ?",
        (yesterday,),
    )

    return added_today, growth(added_today, added_yesterday)
