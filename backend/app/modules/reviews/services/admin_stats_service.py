"""
Reviews admin stats service.

Provides system-wide review metrics consumed by the admin dashboard.
Covers: total reviews, today's collection count, growth, platform distribution,
and the 12-month usage trend chart used by the Usage Chart component.

All functions accept an open pyodbc cursor so they can participate in a single
connection/transaction managed by the caller.
"""

from __future__ import annotations

import json
import re
import uuid
from datetime import date, datetime
from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    import pyodbc

from app.core.db_utils import (
    count_scalar,
    execute_query,
    growth,
    month_start,
    shift_month,
    table_exists,
    to_relative_timestamp,
)

# ── Constants ────────────────────────────────────────────────────────

# The date expression used across all processed_review queries.
# Picks the first non-null date column from the table.
_DATE_EXPR = (
    "CAST(COALESCE(reviewDate, CONVERT(date, scrapedAt)) AS date)"
)

_ACTIVITY_EXPR = (
    "COALESCE(CAST(r.scrapedAt AS datetime), CAST(r.reviewDate AS datetime))"
)

# Activity type mappings
_ACTIVITY_TYPE_MAP = {
    "replied": "ai_job",
    "pending": "scrape_completed",
}


# ── Review Metrics ───────────────────────────────────────────────────


def get_review_metrics(cursor: "pyodbc.Cursor") -> dict[str, Any]:
    """
    Return a dict with:
      - totalReviews: int
      - reviewsCollectedToday: int
      - reviewsGrowth: float (month-over-month %)
      - byPlatform: list[dict] — [{label, value}] sorted by count desc, top 8
    """
    if not table_exists(cursor, "processed_review"):
        return {
            "totalReviews": 0,
            "reviewsCollectedToday": 0,
            "reviewsGrowth": 0.0,
            "byPlatform": [],
        }

    total = count_scalar(cursor, "SELECT COUNT(*) FROM dbo.processed_review")
    today_count = count_scalar(
        cursor,
        f"""
        SELECT COUNT(*)
        FROM dbo.processed_review
        WHERE {_DATE_EXPR} = CAST(GETDATE() AS date)
        """,
    )

    current_month = month_start(date.today())
    previous_month = shift_month(current_month, -1)
    next_month = shift_month(current_month, 1)

    current_month_count = count_scalar(
        cursor,
        f"""
        SELECT COUNT(*)
        FROM dbo.processed_review
        WHERE {_DATE_EXPR} >= ? AND {_DATE_EXPR} < ?
        """,
        (current_month, next_month),
    )
    previous_month_count = count_scalar(
        cursor,
        f"""
        SELECT COUNT(*)
        FROM dbo.processed_review
        WHERE {_DATE_EXPR} >= ? AND {_DATE_EXPR} < ?
        """,
        (previous_month, current_month),
    )

    reviews_growth = growth(current_month_count, previous_month_count)

    # Per-platform distribution (top 8 by volume)
    platform_rows = execute_query(
        cursor,
        """
        SELECT p.platform_name, COUNT(*) AS cnt
        FROM dbo.processed_review r
        JOIN dbo.source s ON r.source_id = s.source_id
        JOIN dbo.platform p ON s.platform_id = p.platform_id
        GROUP BY p.platform_name
        ORDER BY cnt DESC
        """,
    ).fetchall()
    by_platform = [{"label": str(row[0]), "value": int(row[1])} for row in platform_rows[:8]]

    # Processed reviews count
    processed_count = count_scalar(
        cursor,
        """
        SELECT COUNT(*)
        FROM dbo.processed_review
        WHERE status = 'processed'
        """,
    )

    return {
        "totalReviews": total,
        "reviewsCollectedToday": today_count,
        "reviewsGrowth": reviews_growth,
        "processedReviewsCount": processed_count,
        "byPlatform": by_platform,
    }


# ── Usage Trend (12 months) ──────────────────────────────────────────


def get_usage_trend(cursor: "pyodbc.Cursor") -> list[dict[str, Any]]:
    """
    Return a 12-element list of {label, value} covering the last 12 months.
    label = short month name (e.g. "Jan"), value = review count for that month.

    Used by the UsageChart component.
    """
    if not table_exists(cursor, "processed_review"):
        # Return 12 empty months so the chart still renders
        return _empty_12_months()

    rows = execute_query(
        cursor,
        f"""
        SELECT YEAR({_DATE_EXPR}) AS yr, MONTH({_DATE_EXPR}) AS mo, COUNT(*) AS total
        FROM dbo.processed_review
        WHERE {_DATE_EXPR} IS NOT NULL
        GROUP BY YEAR({_DATE_EXPR}), MONTH({_DATE_EXPR})
        """,
    ).fetchall()

    month_map: dict[tuple[int, int], int] = {
        (int(row[0]), int(row[1])): int(row[2]) for row in rows
    }

    current = month_start(date.today())
    start = shift_month(current, -11)
    result = []

    for offset in range(12):
        m = shift_month(start, offset)
        result.append({
            "label": m.strftime("%b"),
            "value": month_map.get((m.year, m.month), 0),
        })

    return result


def _empty_12_months() -> list[dict[str, Any]]:
    current = month_start(date.today())
    start = shift_month(current, -11)
    return [
        {"label": shift_month(start, i).strftime("%b"), "value": 0}
        for i in range(12)
    ]


# ── System Alerts ────────────────────────────────────────────────────


def get_system_alerts(cursor: "pyodbc.Cursor") -> list[dict[str, Any]]:
    """
    Generate system alerts based on the current state of processed_review data.
    Returns a list matching the SystemAlert shape expected by the frontend.
    """
    alerts: list[dict[str, Any]] = []

    if not table_exists(cursor, "processed_review"):
        alerts.append({
            "id": "db-missing-processed",
            "type": "warning",
            "title": "Processed Reviews Table Missing",
            "message": "Table dbo.processed_review was not found — dashboard metrics are limited.",
            "timestamp": "just now",
            "isRead": False,
        })
        return alerts

    total = count_scalar(cursor, "SELECT COUNT(*) FROM dbo.processed_review")

    if total == 0:
        alerts.append({
            "id": "no-reviews",
            "type": "warning",
            "title": "No Reviews in Database",
            "message": "No processed reviews are currently stored.",
            "timestamp": "just now",
            "isRead": False,
        })

    pending = count_scalar(
        cursor,
        "SELECT COUNT(*) FROM dbo.processed_review WHERE LOWER(COALESCE(status, '')) = 'pending'",
    )
    if pending > 0:
        alerts.append({
            "id": "pending-reviews",
            "type": "info",
            "title": "Pending Review Actions",
            "message": f"{pending} processed reviews are still in Pending status.",
            "timestamp": "just now",
            "isRead": False,
        })

    negative_today = count_scalar(
        cursor,
        f"""
        SELECT COUNT(*)
        FROM dbo.processed_review
        WHERE LOWER(COALESCE(sentiment, '')) = 'negative'
          AND {_DATE_EXPR} = CAST(GETDATE() AS date)
        """,
    )
    if negative_today > 0:
        alerts.append({
            "id": "negative-sentiment-today",
            "type": "warning",
            "title": "Negative Sentiment Detected",
            "message": f"{negative_today} negative reviews were recorded today.",
            "timestamp": "just now",
            "isRead": False,
        })

    alerts.append({
        "id": "db-connected",
        "type": "info",
        "title": "Database Connected",
        "message": "Dashboard data is currently sourced from SQL Server.",
        "timestamp": "just now",
        "isRead": True,
    })

    return alerts[:5]


# ── Recent Activity ──────────────────────────────────────────────────


def get_recent_activity(cursor: "pyodbc.Cursor") -> list[dict[str, Any]]:
    """
    Return up to 8 recent activity items based on the latest processed_review rows.
    Returns a list matching the RecentActivity shape expected by the frontend.
    """
    if not table_exists(cursor, "processed_review"):
        return []

    rows = execute_query(
        cursor,
        f"""
        SELECT TOP 8
            r.id,
            r.platformReviewId,
            r.reviewerName AS userName,
            p.platform_name AS source,
            r.sentiment,
            r.status,
            {_ACTIVITY_EXPR} AS activityDate
        FROM dbo.processed_review r
        JOIN dbo.source s ON r.source_id = s.source_id
        JOIN dbo.platform p ON s.platform_id = p.platform_id
        ORDER BY {_ACTIVITY_EXPR} DESC
        """,
    ).fetchall()

    activities = []
    for row in rows:
        review_id = str(row[1] or row[0] or "")
        user_name = str(row[2]) if row[2] else None
        source_name = str(row[3] or "Unknown source")
        sentiment = str(row[4] or "Neutral")
        status = str(row[5] or "Pending").lower()
        activity_time = to_relative_timestamp(row[6])

        activity_type = "ai_job" if status == "replied" else "scrape_completed"
        title = "Review Reply Updated" if status == "replied" else "Review Imported"
        description = f"{source_name} review {review_id} processed with {sentiment} sentiment"

        activities.append({
            "id": str(row[0]),
            "type": activity_type,
            "title": title,
            "description": description,
            "timestamp": activity_time,
            "user": user_name,
        })

    return activities
