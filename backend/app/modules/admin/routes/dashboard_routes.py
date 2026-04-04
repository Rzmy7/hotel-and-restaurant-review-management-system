"""
Admin dashboard routes — stats, usage, reviews, alerts, and recent activity.

All 5 endpoints return shapes that exactly match the TypeScript interfaces
in admin-frontend/src/types.ts and are consumed by dashboardService.ts.
"""

from fastapi import APIRouter, HTTPException
import pyodbc

from app.core.db_utils import get_connection_string
from app.modules.admin.schemas import (
    ChartDataPoint,
    DashboardStats,
    RecentActivity,
    SystemAlert,
)
from app.modules.admin.services.dashboard_service import (
    build_dashboard_stats,
    build_recent_activity,
    build_review_data,
    build_system_alerts,
    build_usage_data,
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _get_cursor():
    """Open a pyodbc connection and return (conn, cursor)."""
    conn = pyodbc.connect(get_connection_string())
    return conn, conn.cursor()


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats() -> DashboardStats:
    """
    System-wide KPI stats for the admin dashboard.

    Delegates to:
      - organization.services.admin_stats_service
      - user.services.admin_stats_service
      - reviews.services.admin_stats_service
    """
    try:
        conn, cursor = _get_cursor()
        try:
            data = build_dashboard_stats(cursor)
            return DashboardStats(**data)
        finally:
            conn.close()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to fetch dashboard stats: {exc}")


@router.get("/usage", response_model=list[ChartDataPoint])
def get_usage_data() -> list[ChartDataPoint]:
    """
    12-month review volume trend (one data point per month).
    Used by the UsageChart component.
    """
    try:
        conn, cursor = _get_cursor()
        try:
            rows = build_usage_data(cursor)
            return [ChartDataPoint(**row) for row in rows]
        finally:
            conn.close()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to fetch usage data: {exc}")


@router.get("/reviews", response_model=list[ChartDataPoint])
def get_review_data() -> list[ChartDataPoint]:
    """
    Per-platform review volume breakdown (top 8 platforms).
    Used by the ReviewsChart component.
    """
    try:
        conn, cursor = _get_cursor()
        try:
            rows = build_review_data(cursor)
            return [ChartDataPoint(**row) for row in rows]
        finally:
            conn.close()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to fetch review data: {exc}")


@router.get("/alerts", response_model=list[SystemAlert])
def get_system_alerts() -> list[SystemAlert]:
    """
    Active system alerts generated from database state.
    Used by the AlertsPanel component.
    """
    try:
        conn, cursor = _get_cursor()
        try:
            rows = build_system_alerts(cursor)
            return [SystemAlert(**row) for row in rows]
        finally:
            conn.close()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to fetch system alerts: {exc}")


@router.get("/activities", response_model=list[RecentActivity])
def get_recent_activity() -> list[RecentActivity]:
    """
    Recent platform activity drawn from the latest processed_review rows.
    Used by the RecentActivity component.
    """
    try:
        conn, cursor = _get_cursor()
        try:
            rows = build_recent_activity(cursor)
            return [RecentActivity(**row) for row in rows]
        finally:
            conn.close()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to fetch recent activity: {exc}")
