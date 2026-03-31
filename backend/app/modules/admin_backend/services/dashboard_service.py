"""
Dashboard service — business logic for dashboard stats, usage, alerts, and activities.

Migrated from admin-backend/app/dashboard_router.py.
"""

import json
import re
from datetime import date
from typing import Any

import pyodbc

from app.modules.admin_backend.db_utils import (
    count_scalar,
    execute_query,
    get_connection_string,
    get_table_column_map,
    growth,
    month_start,
    shift_month,
    table_exists,
    to_relative_timestamp,
)
from app.modules.admin_backend.schemas import ChartDataPoint

# ── Constants ───────────────────────────────────────────────────────

PROCESSED_DATE_EXPR = (
    "CAST(COALESCE(reviewDate, CONVERT(date, scrapedAt), "
    "CONVERT(date, firstSeen), CONVERT(date, lastUpdated)) AS date)"
)
PROCESSED_ACTIVITY_EXPR = (
    "COALESCE(CAST(lastUpdated AS datetime), CAST(firstSeen AS datetime), "
    "CAST(scrapedAt AS datetime), CAST(reviewDate AS datetime))"
)

REVIEW_TABLE_DATE_CANDIDATES = (
    "reviewdate",
    "review_date",
    "posted_date",
    "posteddate",
    "scrapedat",
    "firstseen",
    "lastupdated",
    "created_at",
    "createdat",
    "updated_at",
    "updatedat",
)


# ── Source / review table helpers ───────────────────────────────────


def _normalize_source_table_name(value: Any) -> str:
    normalized = str(value or "").strip()
    if not normalized:
        return ""
    normalized = normalized.replace("[", "").replace("]", "")
    normalized = re.sub(r"^dbo\.", "", normalized, flags=re.IGNORECASE)
    return normalized.strip()


def _is_valid_sql_identifier(value: str) -> bool:
    return bool(re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", value))


def _resolve_sources_review_tables_column(columns: set[str]) -> str | None:
    for candidate in (
        "review_tables",
        "review_table",
        "reviews_table",
        "review_table_name",
        "table_name",
        "source_table",
        "source_table_name",
        "target_table",
        "scrape_table",
    ):
        if candidate in columns:
            return candidate
    return None


def _parse_review_table_names(raw_value: Any) -> list[str]:
    raw_text = str(raw_value or "").strip()
    if not raw_text:
        return []

    candidates: list[str] = []
    if raw_text.startswith("[") and raw_text.endswith("]"):
        try:
            parsed = json.loads(raw_text)
        except json.JSONDecodeError:
            parsed = None
        if isinstance(parsed, list):
            candidates.extend(str(item or "").strip() for item in parsed)

    if not candidates:
        candidates.extend(part.strip() for part in re.split(r"[,;|\n\r]+", raw_text))

    normalized: list[str] = []
    seen: set[str] = set()
    for candidate in candidates:
        table_name = _normalize_source_table_name(candidate)
        lowered = table_name.lower()
        if not table_name or lowered in seen or not _is_valid_sql_identifier(table_name):
            continue
        seen.add(lowered)
        normalized.append(table_name)

    return normalized


def _resolve_review_table_date_expr(column_map: dict[str, str]) -> str | None:
    expressions = [
        f"TRY_CAST([{column_map[key]}] AS date)"
        for key in REVIEW_TABLE_DATE_CANDIDATES
        if key in column_map
    ]
    if not expressions:
        return None
    if len(expressions) == 1:
        return expressions[0]
    return f"COALESCE({', '.join(expressions)})"


def _get_review_table_metrics(
    cursor: pyodbc.Cursor,
    table_name: str,
    current_month: date,
    next_month: date,
    previous_month: date,
) -> dict[str, int]:
    normalized_table_name = _normalize_source_table_name(table_name)
    if (
        not normalized_table_name
        or not _is_valid_sql_identifier(normalized_table_name)
        or not table_exists(cursor, normalized_table_name)
    ):
        return {"total": 0, "today": 0, "currentMonth": 0, "previousMonth": 0}

    column_map = get_table_column_map(cursor, normalized_table_name)
    date_expr = _resolve_review_table_date_expr(column_map)

    if not date_expr:
        return {
            "total": count_scalar(cursor, f"SELECT COUNT(*) FROM dbo.[{normalized_table_name}]"),
            "today": 0,
            "currentMonth": 0,
            "previousMonth": 0,
        }

    row = execute_query(
        cursor,
        f"""
        SELECT
            COUNT(*) AS total_reviews,
            SUM(CASE WHEN {date_expr} = CAST(GETDATE() AS date) THEN 1 ELSE 0 END) AS reviews_today,
            SUM(CASE WHEN {date_expr} >= ? AND {date_expr} < ? THEN 1 ELSE 0 END) AS reviews_current_month,
            SUM(CASE WHEN {date_expr} >= ? AND {date_expr} < ? THEN 1 ELSE 0 END) AS reviews_previous_month
        FROM dbo.[{normalized_table_name}]
        """,
        (current_month, next_month, previous_month, current_month),
    ).fetchone()

    return {
        "total": int(row[0] or 0) if row else 0,
        "today": int(row[1] or 0) if row else 0,
        "currentMonth": int(row[2] or 0) if row else 0,
        "previousMonth": int(row[3] or 0) if row else 0,
    }


# ── Review metrics ──────────────────────────────────────────────────


def _get_review_metrics_from_sources(cursor: pyodbc.Cursor) -> dict[str, Any]:
    if not table_exists(cursor, "scraping_platform"):
        return {
            "configured": False,
            "totalReviews": 0,
            "reviewsCollectedToday": 0,
            "reviewsGrowth": 0.0,
            "byPlatform": [],
        }

    source_columns = get_table_column_map(cursor, "sources")
    review_tables_col = _resolve_sources_review_tables_column(set(source_columns))
    platform_name_col = source_columns.get("platform_name")

    if not review_tables_col or not platform_name_col:
        return {
            "configured": False,
            "totalReviews": 0,
            "reviewsCollectedToday": 0,
            "reviewsGrowth": 0.0,
            "byPlatform": [],
        }

    rows = execute_query(
        cursor,
        f"SELECT [{platform_name_col}], [{source_columns[review_tables_col]}] FROM dbo.sources ORDER BY [{platform_name_col}]",
    ).fetchall()

    current_month = month_start(date.today())
    previous_month_ = shift_month(current_month, -1)
    next_month = shift_month(current_month, 1)

    total_reviews = 0
    reviews_collected_today = 0
    current_month_reviews = 0
    previous_month_reviews = 0
    configured = False
    seen_tables: set[str] = set()
    platform_totals: dict[str, int] = {}

    for row in rows:
        platform_name = str(row[0] or "Unknown").strip() or "Unknown"
        table_names = _parse_review_table_names(row[1])
        if table_names:
            configured = True

        for tn in table_names:
            lowered = tn.lower()
            if lowered in seen_tables:
                continue
            seen_tables.add(lowered)

            table_metrics = _get_review_table_metrics(cursor, tn, current_month, next_month, previous_month_)
            total_reviews += table_metrics["total"]
            reviews_collected_today += table_metrics["today"]
            current_month_reviews += table_metrics["currentMonth"]
            previous_month_reviews += table_metrics["previousMonth"]
            platform_totals[platform_name] = platform_totals.get(platform_name, 0) + table_metrics["total"]

    by_platform = [
        ChartDataPoint(label=pn, value=rt)
        for pn, rt in sorted(platform_totals.items(), key=lambda item: item[1], reverse=True)
        if rt > 0
    ]

    return {
        "configured": configured,
        "totalReviews": total_reviews,
        "reviewsCollectedToday": reviews_collected_today,
        "reviewsGrowth": growth(current_month_reviews, previous_month_reviews),
        "byPlatform": by_platform[:8],
    }


def get_review_metrics(cursor: pyodbc.Cursor) -> dict[str, Any]:
    """Get review metrics — tries sources table first, falls back to ProcessedReviews/reviews."""
    source_metrics = _get_review_metrics_from_sources(cursor)
    if source_metrics["configured"]:
        return source_metrics

    total_reviews = 0
    reviews_collected_today = 0
    reviews_growth_value = 0.0
    by_platform: list[ChartDataPoint] = []

    if table_exists(cursor, "processed_review"):
        total_reviews = count_scalar(cursor, "SELECT COUNT(*) FROM dbo.processed_review")
        reviews_collected_today = count_scalar(
            cursor,
            f"""
            SELECT COUNT(*)
            FROM dbo.processed_review
            WHERE {PROCESSED_DATE_EXPR} = CAST(GETDATE() AS date)
            """,
        )

        current_month = month_start(date.today())
        previous_month_ = shift_month(current_month, -1)
        next_month = shift_month(current_month, 1)

        current_review_count = count_scalar(
            cursor,
            f"""
            SELECT COUNT(*)
            FROM dbo.processed_review
            WHERE {PROCESSED_DATE_EXPR} >= ? AND {PROCESSED_DATE_EXPR} < ?
            """,
            (current_month, next_month),
        )
        previous_review_count = count_scalar(
            cursor,
            f"""
            SELECT COUNT(*)
            FROM dbo.processed_review
            WHERE {PROCESSED_DATE_EXPR} >= ? AND {PROCESSED_DATE_EXPR} < ?
            """,
            (previous_month_, current_month),
        )
        reviews_growth_value = growth(current_review_count, previous_review_count)

        rows = execute_query(
            cursor,
            """
            SELECT TOP 8
                COALESCE(NULLIF(LTRIM(RTRIM(source)), ''), 'Unknown') AS sourceLabel,
                COUNT(*) AS total
            FROM dbo.processed_review
            GROUP BY COALESCE(NULLIF(LTRIM(RTRIM(source)), ''), 'Unknown')
            ORDER BY COUNT(*) DESC
            """,
        ).fetchall()
        by_platform = [ChartDataPoint(label=str(row[0]), value=int(row[1])) for row in rows]

    elif table_exists(cursor, "reviews"):
        total_reviews = count_scalar(cursor, "SELECT COUNT(*) FROM dbo.reviews")
        reviews_collected_today = count_scalar(
            cursor,
            """
            SELECT COUNT(*)
            FROM dbo.reviews
            WHERE CAST(posted_date AS date) = CAST(GETDATE() AS date)
            """,
        )
        by_platform = [ChartDataPoint(label="Booking.com", value=total_reviews)]

    return {
        "configured": False,
        "totalReviews": total_reviews,
        "reviewsCollectedToday": reviews_collected_today,
        "reviewsGrowth": reviews_growth_value,
        "byPlatform": by_platform,
    }


# ── Usage rows ──────────────────────────────────────────────────────


def get_usage_rows(cursor: pyodbc.Cursor) -> list[dict[str, int]]:
    if table_exists(cursor, "processed_review"):
        rows = cursor.execute(
            f"""
            SELECT YEAR(metricDate) AS [year], MONTH(metricDate) AS [month], COUNT(*) AS total
            FROM (
                SELECT {PROCESSED_DATE_EXPR} AS metricDate
                FROM dbo.processed_review
            ) AS dated
            WHERE metricDate IS NOT NULL
            GROUP BY YEAR(metricDate), MONTH(metricDate)
            """
        ).fetchall()
        return [{"year": int(row[0]), "month": int(row[1]), "total": int(row[2])} for row in rows]

    if table_exists(cursor, "reviews"):
        rows = cursor.execute(
            """
            SELECT YEAR(posted_date) AS [year], MONTH(posted_date) AS [month], COUNT(*) AS total
            FROM dbo.reviews
            WHERE posted_date IS NOT NULL
            GROUP BY YEAR(posted_date), MONTH(posted_date)
            """
        ).fetchall()
        return [{"year": int(row[0]), "month": int(row[1]), "total": int(row[2])} for row in rows]

    return []


# ── Organization metrics ────────────────────────────────────────────


def get_organization_metrics(cursor: pyodbc.Cursor) -> tuple[int, float]:
    if table_exists(cursor, "organization"):
        total_organizations = count_scalar(cursor, "SELECT COUNT(*) FROM dbo.organization")

        current_month = month_start(date.today())
        previous_month_ = shift_month(current_month, -1)
        next_month = shift_month(current_month, 1)

        current_count = count_scalar(
            cursor,
            """
            SELECT COUNT(*)
            FROM dbo.organization
            WHERE created_at >= ? AND created_at < ?
            """,
            (current_month, next_month),
        )
        previous_count = count_scalar(
            cursor,
            """
            SELECT COUNT(*)
            FROM dbo.organization
            WHERE created_at >= ? AND created_at < ?
            """,
            (previous_month_, current_month),
        )

        return total_organizations, growth(current_count, previous_count)

    for alt_table in ["organization", "orgs", "tenants", "companies"]:
        if table_exists(cursor, alt_table):
            return count_scalar(cursor, f"SELECT COUNT(*) FROM dbo.[{alt_table}]"), 0.0

    if table_exists(cursor, "processed_review"):
        return count_scalar(
            cursor,
            """
            SELECT COUNT(DISTINCT NULLIF(LTRIM(RTRIM(source)), ''))
            FROM dbo.processed_review
            """,
        ), 0.0

    return 0, 0.0


# ── Hotel metrics ───────────────────────────────────────────────────


def get_hotel_metrics(cursor: pyodbc.Cursor) -> tuple[int, float]:
    if not table_exists(cursor, "reviews"):
        return 0, 0.0

    total_hotels = count_scalar(
        cursor,
        """
        SELECT COUNT(DISTINCT NULLIF(LTRIM(RTRIM(room_name)), ''))
        FROM dbo.reviews
        """,
    )

    current_month = month_start(date.today())
    previous_month_ = shift_month(current_month, -1)
    next_month = shift_month(current_month, 1)

    current_count = count_scalar(
        cursor,
        """
        SELECT COUNT(DISTINCT NULLIF(LTRIM(RTRIM(room_name)), ''))
        FROM dbo.reviews
        WHERE posted_date >= ? AND posted_date < ?
        """,
        (current_month, next_month),
    )
    previous_count = count_scalar(
        cursor,
        """
        SELECT COUNT(DISTINCT NULLIF(LTRIM(RTRIM(room_name)), ''))
        FROM dbo.reviews
        WHERE posted_date >= ? AND posted_date < ?
        """,
        (previous_month_, current_month),
    )

    return total_hotels, growth(current_count, previous_count)


# ── User metrics ────────────────────────────────────────────────────


def get_user_metrics(cursor: pyodbc.Cursor) -> tuple[int, float, int]:
    if table_exists(cursor, "[user]"):
        total_users = count_scalar(cursor, "SELECT COUNT(*) FROM dbo.[user]")

        active_users_today = count_scalar(
            cursor,
            """
            SELECT COUNT(*)
            FROM dbo.[user]
            WHERE is_active = 1
              AND CAST(last_login_at AS date) = CAST(GETDATE() AS date)
            """,
        )

        current_month = month_start(date.today())
        previous_month_ = shift_month(current_month, -1)
        next_month = shift_month(current_month, 1)

        current_user_count = count_scalar(
            cursor,
            """
            SELECT COUNT(*)
            FROM dbo.[user]
            WHERE created_at >= ? AND created_at < ?
            """,
            (current_month, next_month),
        )
        previous_user_count = count_scalar(
            cursor,
            """
            SELECT COUNT(*)
            FROM dbo.[user]
            WHERE created_at >= ? AND created_at < ?
            """,
            (previous_month_, current_month),
        )

        return total_users, growth(current_user_count, previous_user_count), active_users_today

    if table_exists(cursor, "processed_review"):
        total_users = count_scalar(
            cursor,
            """
            SELECT COUNT(DISTINCT NULLIF(LTRIM(RTRIM(userName)), ''))
            FROM dbo.processed_review
            """,
        )

        active_users_today = count_scalar(
            cursor,
            f"""
            SELECT COUNT(DISTINCT NULLIF(LTRIM(RTRIM(userName)), ''))
            FROM dbo.processed_review
            WHERE {PROCESSED_DATE_EXPR} = CAST(GETDATE() AS date)
            """,
        )

        current_month = month_start(date.today())
        previous_month_ = shift_month(current_month, -1)
        next_month = shift_month(current_month, 1)

        current_user_count = count_scalar(
            cursor,
            f"""
            SELECT COUNT(DISTINCT NULLIF(LTRIM(RTRIM(userName)), ''))
            FROM dbo.processed_review
            WHERE {PROCESSED_DATE_EXPR} >= ? AND {PROCESSED_DATE_EXPR} < ?
            """,
            (current_month, next_month),
        )
        previous_user_count = count_scalar(
            cursor,
            f"""
            SELECT COUNT(DISTINCT NULLIF(LTRIM(RTRIM(userName)), ''))
            FROM dbo.processed_review
            WHERE {PROCESSED_DATE_EXPR} >= ? AND {PROCESSED_DATE_EXPR} < ?
            """,
            (previous_month_, current_month),
        )

        return total_users, growth(current_user_count, previous_user_count), active_users_today

    return 0, 0.0, 0
