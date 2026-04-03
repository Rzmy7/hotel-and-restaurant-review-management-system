"""
Dashboard routes — stats, usage, alerts, and recent activity.

Migrated from admin-backend/app/dashboard_router.py.
"""

from datetime import date

import pyodbc
from fastapi import APIRouter, HTTPException

from app.modules.admin.db_utils import (
    count_scalar,
    execute_query,
    get_connection_string,
    month_start,
    shift_month,
    table_exists,
    to_relative_timestamp,
)
from app.modules.admin.schemas import (
    ChartDataPoint,
    DashboardStats,
    RecentActivity,
    SystemAlert,
)
from app.modules.admin.services.dashboard_service import (
    PROCESSED_ACTIVITY_EXPR,
    PROCESSED_DATE_EXPR,
    get_organizations_added_today_metrics,
    get_organization_metrics,
    get_review_metrics,
    get_usage_rows,
    get_user_metrics,
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats() -> DashboardStats:
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()

            total_users, users_growth, active_users_today = get_user_metrics(cursor)

            review_metrics = get_review_metrics(cursor)
            total_reviews = int(review_metrics["totalReviews"])
            reviews_collected_today = int(review_metrics["reviewsCollectedToday"])
            reviews_growth = float(review_metrics["reviewsGrowth"])

            ai_jobs_processed = total_reviews
            ai_jobs_growth = reviews_growth

            total_organizations, organizations_growth = get_organization_metrics(cursor)
            added_today, added_today_growth = get_organizations_added_today_metrics(cursor)

            return DashboardStats(
                totalOrganizations=total_organizations,
                organizationsAddedToday=added_today,
                organizationsGrowth=organizations_growth,
                addedTodayGrowth=added_today_growth,
                totalUsers=total_users,
                usersGrowth=users_growth,
                totalReviews=total_reviews,
                reviewsCollectedToday=reviews_collected_today,
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
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            month_rows = get_usage_rows(cursor)
            month_map = {(row["year"], row["month"]): row["total"] for row in month_rows}

            current = month_start(date.today())
            start = shift_month(current, -11)
            result: list[ChartDataPoint] = []

            for offset in range(12):
                month_value = shift_month(start, offset)
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
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            return list(get_review_metrics(cursor)["byPlatform"])

    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to fetch review source data: {error}")


@router.get("/alerts", response_model=list[SystemAlert])
def get_system_alerts() -> list[SystemAlert]:
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            alerts: list[SystemAlert] = []

            if not table_exists(cursor, "processed_review"):
                return [
                    SystemAlert(
                        id="db-missing-processed",
                        type="warning",
                        title="Processed Reviews Table Missing",
                        message="Table dbo.processed_review was not found, so dashboard metrics are limited.",
                        timestamp="just now",
                        isRead=False,
                    )
                ]

            total_reviews = count_scalar(cursor, "SELECT COUNT(*) FROM dbo.processed_review")
            pending_reviews = count_scalar(
                cursor,
                """
                SELECT COUNT(*)
                FROM dbo.processed_review
                WHERE LOWER(COALESCE(status, '')) = 'pending'
                """,
            )
            negative_today = count_scalar(
                cursor,
                f"""
                SELECT COUNT(*)
                FROM dbo.processed_review
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
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()

            if not table_exists(cursor, "processed_review"):
                return []

            rows = execute_query(
                cursor,
                f"""
                SELECT TOP 8
                    id,
                    platformReviewId,
                    userName,
                    source,
                    sentiment,
                    status,
                    {PROCESSED_ACTIVITY_EXPR} AS activityDate
                FROM dbo.processed_review
                ORDER BY {PROCESSED_ACTIVITY_EXPR} DESC
                """,
            ).fetchall()

            activities: list[RecentActivity] = []
            for row in rows:
                review_id = str(row[1] or row[0] or "")
                user_name = str(row[2]) if row[2] else None
                source_name = str(row[3] or "Unknown source")
                sentiment = str(row[4] or "Neutral")
                status = str(row[5] or "Pending")
                activity_time = to_relative_timestamp(row[6])

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
