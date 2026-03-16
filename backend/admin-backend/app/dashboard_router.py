import os
from datetime import date, datetime
from typing import Any

import pyodbc
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException

from app.models import ChartDataPoint, DashboardStats, RecentActivity, SystemAlert

load_dotenv()

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

PROCESSED_DATE_EXPR = "CAST(COALESCE(reviewDate, CONVERT(date, scrapedAt), CONVERT(date, firstSeen), CONVERT(date, lastUpdated)) AS date)"
PROCESSED_ACTIVITY_EXPR = (
    "COALESCE(CAST(lastUpdated AS datetime), CAST(firstSeen AS datetime), "
    "CAST(scrapedAt AS datetime), CAST(reviewDate AS datetime))"
)


def _resolve_db_driver() -> str:
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


def _connection_string() -> str:
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


def _month_start(value: date) -> date:
    return value.replace(day=1)


def _shift_month(value: date, delta: int) -> date:
    month_index = (value.month - 1) + delta
    year = value.year + (month_index // 12)
    month = (month_index % 12) + 1
    return date(year, month, 1)


def _growth(current_value: int, previous_value: int) -> float:
    if previous_value == 0:
        return 100.0 if current_value > 0 else 0.0
    return round(((current_value - previous_value) / previous_value) * 100, 1)


def _table_exists(cursor: pyodbc.Cursor, table_name: str, schema: str = "dbo") -> bool:
    row = _execute_query(
        cursor,
        """
        SELECT 1
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        """,
        (schema, table_name),
    ).fetchone()
    return row is not None


def _count_scalar(cursor: pyodbc.Cursor, query: str, params: tuple[Any, ...] = ()) -> int:
    row = _execute_query(cursor, query, params).fetchone()
    return int(row[0]) if row and row[0] is not None else 0


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
    escaped = str(value).replace("'", "''")
    return f"'{escaped}'"


def _inline_query_params(query: str, params: tuple[Any, ...]) -> str:
    inlined_query = query
    for param in params:
        inlined_query = inlined_query.replace("?", _sql_literal(param), 1)
    return inlined_query


def _execute_query(cursor: pyodbc.Cursor, query: str, params: tuple[Any, ...] = ()) -> pyodbc.Cursor:
    if not params:
        return cursor.execute(query)

    try:
        return cursor.execute(query, params)
    except pyodbc.Error as error:
        if "SQLBindParameter" not in str(error):
            raise
        return cursor.execute(_inline_query_params(query, params))


def _to_relative_timestamp(value: Any) -> str:
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


def _get_usage_rows(cursor: pyodbc.Cursor) -> list[dict[str, int]]:
    if _table_exists(cursor, "ProcessedReviews"):
        rows = cursor.execute(
            f"""
            SELECT YEAR(metricDate) AS [year], MONTH(metricDate) AS [month], COUNT(*) AS total
            FROM (
                SELECT {PROCESSED_DATE_EXPR} AS metricDate
                FROM dbo.ProcessedReviews
            ) AS dated
            WHERE metricDate IS NOT NULL
            GROUP BY YEAR(metricDate), MONTH(metricDate)
            """
        ).fetchall()
        return [{"year": int(row[0]), "month": int(row[1]), "total": int(row[2])} for row in rows]

    if _table_exists(cursor, "reviews"):
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


def _get_organization_metrics(cursor: pyodbc.Cursor) -> tuple[int, float]:
    if _table_exists(cursor, "organizations"):
        total_organizations = _count_scalar(cursor, "SELECT COUNT(*) FROM dbo.organizations")

        current_month = _month_start(date.today())
        previous_month = _shift_month(current_month, -1)
        next_month = _shift_month(current_month, 1)

        current_count = _count_scalar(
            cursor,
            """
            SELECT COUNT(*)
            FROM dbo.organizations
            WHERE created_at >= ? AND created_at < ?
            """,
            (current_month, next_month),
        )
        previous_count = _count_scalar(
            cursor,
            """
            SELECT COUNT(*)
            FROM dbo.organizations
            WHERE created_at >= ? AND created_at < ?
            """,
            (previous_month, current_month),
        )

        return total_organizations, _growth(current_count, previous_count)

    for table_name in ["organization", "orgs", "tenants", "companies"]:
        if _table_exists(cursor, table_name):
            return _count_scalar(cursor, f"SELECT COUNT(*) FROM dbo.[{table_name}]"), 0.0

    if _table_exists(cursor, "ProcessedReviews"):
        return _count_scalar(
            cursor,
            """
            SELECT COUNT(DISTINCT NULLIF(LTRIM(RTRIM(source)), ''))
            FROM dbo.ProcessedReviews
            """,
        ), 0.0

    return 0, 0.0


def _get_hotel_metrics(cursor: pyodbc.Cursor) -> tuple[int, float]:
    if not _table_exists(cursor, "reviews"):
        return 0, 0.0

    total_hotels = _count_scalar(
        cursor,
        """
        SELECT COUNT(DISTINCT NULLIF(LTRIM(RTRIM(room_name)), ''))
        FROM dbo.reviews
        """,
    )

    current_month = _month_start(date.today())
    previous_month = _shift_month(current_month, -1)
    next_month = _shift_month(current_month, 1)

    current_count = _count_scalar(
        cursor,
        """
        SELECT COUNT(DISTINCT NULLIF(LTRIM(RTRIM(room_name)), ''))
        FROM dbo.reviews
        WHERE posted_date >= ? AND posted_date < ?
        """,
        (current_month, next_month),
    )
    previous_count = _count_scalar(
        cursor,
        """
        SELECT COUNT(DISTINCT NULLIF(LTRIM(RTRIM(room_name)), ''))
        FROM dbo.reviews
        WHERE posted_date >= ? AND posted_date < ?
        """,
        (previous_month, current_month),
    )

    return total_hotels, _growth(current_count, previous_count)


def _get_user_metrics(cursor: pyodbc.Cursor) -> tuple[int, float, int]:
    if _table_exists(cursor, "users"):
        total_users = _count_scalar(cursor, "SELECT COUNT(*) FROM dbo.users")

        active_users_today = _count_scalar(
            cursor,
            """
            SELECT COUNT(*)
            FROM dbo.users
            WHERE is_active = 1
              AND CAST(last_login_at AS date) = CAST(GETDATE() AS date)
            """,
        )

        current_month = _month_start(date.today())
        previous_month = _shift_month(current_month, -1)
        next_month = _shift_month(current_month, 1)

        current_user_count = _count_scalar(
            cursor,
            """
            SELECT COUNT(*)
            FROM dbo.users
            WHERE created_at >= ? AND created_at < ?
            """,
            (current_month, next_month),
        )
        previous_user_count = _count_scalar(
            cursor,
            """
            SELECT COUNT(*)
            FROM dbo.users
            WHERE created_at >= ? AND created_at < ?
            """,
            (previous_month, current_month),
        )

        return total_users, _growth(current_user_count, previous_user_count), active_users_today

    if _table_exists(cursor, "ProcessedReviews"):
        total_users = _count_scalar(
            cursor,
            """
            SELECT COUNT(DISTINCT NULLIF(LTRIM(RTRIM(userName)), ''))
            FROM dbo.ProcessedReviews
            """,
        )

        active_users_today = _count_scalar(
            cursor,
            f"""
            SELECT COUNT(DISTINCT NULLIF(LTRIM(RTRIM(userName)), ''))
            FROM dbo.ProcessedReviews
            WHERE {PROCESSED_DATE_EXPR} = CAST(GETDATE() AS date)
            """,
        )

        current_month = _month_start(date.today())
        previous_month = _shift_month(current_month, -1)
        next_month = _shift_month(current_month, 1)

        current_user_count = _count_scalar(
            cursor,
            f"""
            SELECT COUNT(DISTINCT NULLIF(LTRIM(RTRIM(userName)), ''))
            FROM dbo.ProcessedReviews
            WHERE {PROCESSED_DATE_EXPR} >= ? AND {PROCESSED_DATE_EXPR} < ?
            """,
            (current_month, next_month),
        )
        previous_user_count = _count_scalar(
            cursor,
            f"""
            SELECT COUNT(DISTINCT NULLIF(LTRIM(RTRIM(userName)), ''))
            FROM dbo.ProcessedReviews
            WHERE {PROCESSED_DATE_EXPR} >= ? AND {PROCESSED_DATE_EXPR} < ?
            """,
            (previous_month, current_month),
        )

        return total_users, _growth(current_user_count, previous_user_count), active_users_today

    return 0, 0.0, 0


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats() -> DashboardStats:
    try:
        with pyodbc.connect(_connection_string()) as conn:
            cursor = conn.cursor()

            total_reviews = 0
            total_users = 0
            active_users_today = 0
            reviews_growth = 0.0
            users_growth = 0.0
            ai_jobs_processed = 0
            ai_jobs_growth = 0.0

            total_users, users_growth, active_users_today = _get_user_metrics(cursor)

            if _table_exists(cursor, "ProcessedReviews"):
                total_reviews = _count_scalar(cursor, "SELECT COUNT(*) FROM dbo.ProcessedReviews")
                ai_jobs_processed = total_reviews

                current_month = _month_start(date.today())
                previous_month = _shift_month(current_month, -1)
                next_month = _shift_month(current_month, 1)

                current_review_count = _count_scalar(
                    cursor,
                    f"""
                    SELECT COUNT(*)
                    FROM dbo.ProcessedReviews
                    WHERE {PROCESSED_DATE_EXPR} >= ? AND {PROCESSED_DATE_EXPR} < ?
                    """,
                    (current_month, next_month),
                )
                previous_review_count = _count_scalar(
                    cursor,
                    f"""
                    SELECT COUNT(*)
                    FROM dbo.ProcessedReviews
                    WHERE {PROCESSED_DATE_EXPR} >= ? AND {PROCESSED_DATE_EXPR} < ?
                    """,
                    (previous_month, current_month),
                )
                reviews_growth = _growth(current_review_count, previous_review_count)
                ai_jobs_growth = reviews_growth

            total_organizations, organizations_growth = _get_organization_metrics(cursor)
            active_hotels, hotels_growth = _get_hotel_metrics(cursor)

            return DashboardStats(
                totalOrganizations=total_organizations,
                organizationsGrowth=organizations_growth,
                totalUsers=total_users,
                usersGrowth=users_growth,
                activeHotels=active_hotels,
                hotelsGrowth=hotels_growth,
                totalReviews=total_reviews,
                reviewsGrowth=reviews_growth,
                activeUsersToday=active_users_today,
                systemUptime=99.9,
                aiJobsProcessed=ai_jobs_processed,
                aiJobsGrowth=ai_jobs_growth,
            )

    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to fetch dashboard stats: {error}")


@router.get("/usage", response_model=list[ChartDataPoint])
def get_usage_data() -> list[ChartDataPoint]:
    try:
        with pyodbc.connect(_connection_string()) as conn:
            cursor = conn.cursor()
            month_rows = _get_usage_rows(cursor)
            month_map = {(row["year"], row["month"]): row["total"] for row in month_rows}

            current = _month_start(date.today())
            start = _shift_month(current, -11)
            result: list[ChartDataPoint] = []

            for offset in range(12):
                month_value = _shift_month(start, offset)
                result.append(
                    ChartDataPoint(
                        label=month_value.strftime("%b"),
                        value=month_map.get((month_value.year, month_value.month), 0),
                    )
                )

            return result

    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to fetch usage data: {error}")


@router.get("/reviews", response_model=list[ChartDataPoint])
def get_review_data() -> list[ChartDataPoint]:
    try:
        with pyodbc.connect(_connection_string()) as conn:
            cursor = conn.cursor()

            if _table_exists(cursor, "ProcessedReviews"):
                rows = cursor.execute(
                    """
                    SELECT TOP 8
                        COALESCE(NULLIF(LTRIM(RTRIM(source)), ''), 'Unknown') AS sourceLabel,
                        COUNT(*) AS total
                    FROM dbo.ProcessedReviews
                    GROUP BY COALESCE(NULLIF(LTRIM(RTRIM(source)), ''), 'Unknown')
                    ORDER BY COUNT(*) DESC
                    """
                ).fetchall()
                return [ChartDataPoint(label=str(row[0]), value=int(row[1])) for row in rows]

            if _table_exists(cursor, "reviews"):
                total_raw_reviews = _count_scalar(cursor, "SELECT COUNT(*) FROM dbo.reviews")
                return [ChartDataPoint(label="Booking.com", value=total_raw_reviews)]

            return []

    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to fetch review source data: {error}")


@router.get("/alerts", response_model=list[SystemAlert])
def get_system_alerts() -> list[SystemAlert]:
    try:
        with pyodbc.connect(_connection_string()) as conn:
            cursor = conn.cursor()
            alerts: list[SystemAlert] = []

            if not _table_exists(cursor, "ProcessedReviews"):
                return [
                    SystemAlert(
                        id="db-missing-processed",
                        type="warning",
                        title="Processed Reviews Table Missing",
                        message="Table dbo.ProcessedReviews was not found, so dashboard metrics are limited.",
                        timestamp="just now",
                        isRead=False,
                    )
                ]

            total_reviews = _count_scalar(cursor, "SELECT COUNT(*) FROM dbo.ProcessedReviews")
            pending_reviews = _count_scalar(
                cursor,
                """
                SELECT COUNT(*)
                FROM dbo.ProcessedReviews
                WHERE LOWER(COALESCE(status, '')) = 'pending'
                """,
            )
            negative_today = _count_scalar(
                cursor,
                f"""
                SELECT COUNT(*)
                FROM dbo.ProcessedReviews
                WHERE LOWER(COALESCE(sentiment, '')) = 'negative'
                  AND {PROCESSED_DATE_EXPR} = CAST(GETDATE() AS date)
                """,
            )

            if total_reviews == 0:
                alerts.append(
                    SystemAlert(
                        id="no-reviews",
                        type="warning",
                        title="No Reviews in Database",
                        message="No processed reviews are currently stored.",
                        timestamp="just now",
                        isRead=False,
                    )
                )

            if pending_reviews > 0:
                alerts.append(
                    SystemAlert(
                        id="pending-reviews",
                        type="info",
                        title="Pending Review Actions",
                        message=f"{pending_reviews} processed reviews are still in Pending status.",
                        timestamp="just now",
                        isRead=False,
                    )
                )

            if negative_today > 0:
                alerts.append(
                    SystemAlert(
                        id="negative-sentiment-today",
                        type="warning",
                        title="Negative Sentiment Detected",
                        message=f"{negative_today} negative reviews were recorded today.",
                        timestamp="just now",
                        isRead=False,
                    )
                )

            alerts.append(
                SystemAlert(
                    id="db-connected",
                    type="info",
                    title="Database Connected",
                    message="Dashboard data is currently sourced from SQL Server.",
                    timestamp="just now",
                    isRead=True,
                )
            )

            return alerts[:5]

    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to fetch system alerts: {error}")


@router.get("/activities", response_model=list[RecentActivity])
def get_recent_activity() -> list[RecentActivity]:
    try:
        with pyodbc.connect(_connection_string()) as conn:
            cursor = conn.cursor()

            if not _table_exists(cursor, "ProcessedReviews"):
                return []

            rows = cursor.execute(
                f"""
                SELECT TOP 8
                    id,
                    platformReviewId,
                    userName,
                    source,
                    sentiment,
                    status,
                    {PROCESSED_ACTIVITY_EXPR} AS activityDate
                FROM dbo.ProcessedReviews
                ORDER BY {PROCESSED_ACTIVITY_EXPR} DESC
                """
            ).fetchall()

            activities: list[RecentActivity] = []
            for row in rows:
                review_id = str(row[1] or row[0] or "")
                user_name = str(row[2]) if row[2] else None
                source_name = str(row[3] or "Unknown source")
                sentiment = str(row[4] or "Neutral")
                status = str(row[5] or "Pending")
                activity_time = _to_relative_timestamp(row[6])

                status_lower = status.lower()
                activity_type = "ai_job" if status_lower == "replied" else "scrape_completed"
                title = "Review Reply Updated" if status_lower == "replied" else "Review Imported"
                description = f"{source_name} review {review_id} processed with {sentiment} sentiment"

                activities.append(
                    RecentActivity(
                        id=str(row[0]),
                        type=activity_type,
                        title=title,
                        description=description,
                        timestamp=activity_time,
                        user=user_name,
                    )
                )

            return activities

    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to fetch recent activity: {error}")
