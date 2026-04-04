"""
Admin dashboard service — orchestrates metrics from module-level services.

This module is a thin coordinator:
  - Organization metrics  → app.modules.organization.services.admin_stats_service
  - User metrics          → app.modules.user.services.admin_stats_service
  - Review metrics,
    alerts, activity      → app.modules.reviews.services.admin_stats_service

All heavy lifting is in those module services. This layer just calls them in
the right order and assembles the final response shapes.
"""

from __future__ import annotations

from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    import pyodbc

from app.modules.organization.services.admin_stats_service import (
    get_organizations_added_today,
    get_total_organizations,
)
from app.modules.user.services.admin_stats_service import (
    get_active_users_today,
    get_total_users,
)
from app.modules.reviews.services.admin_stats_service import (
    get_recent_activity,
    get_review_metrics,
    get_system_alerts,
    get_usage_trend,
)


# ── Stat aggregators (used by routes) ─────────────────────────────────


def build_dashboard_stats(cursor: "pyodbc.Cursor") -> dict[str, Any]:
    """
    Aggregate all admin dashboard KPIs into a single dict that maps 1-to-1 to
    the DashboardStats Pydantic schema / frontend TypeScript interface.
    """
    total_orgs, orgs_growth = get_total_organizations(cursor)
    orgs_today, orgs_today_growth = get_organizations_added_today(cursor)
    total_users, users_growth = get_total_users(cursor)
    active_today = get_active_users_today(cursor)
    review_data = get_review_metrics(cursor)

    return {
        "totalOrganizations": total_orgs,
        "organizationsAddedToday": orgs_today,
        "organizationsGrowth": orgs_growth,
        "addedTodayGrowth": orgs_today_growth,
        "totalUsers": total_users,
        "usersGrowth": users_growth,
        "totalReviews": review_data["totalReviews"],
        "reviewsCollectedToday": review_data["reviewsCollectedToday"],
        "reviewsGrowth": review_data["reviewsGrowth"],
        "activeUsersToday": active_today,
        "systemUptime": 99.9,
        "aiJobsProcessed": review_data["totalReviews"],
        "aiJobsGrowth": review_data["reviewsGrowth"],
    }


def build_usage_data(cursor: "pyodbc.Cursor") -> list[dict[str, Any]]:
    """Return 12-month review usage trend as list[{label, value}]."""
    return get_usage_trend(cursor)


def build_review_data(cursor: "pyodbc.Cursor") -> list[dict[str, Any]]:
    """Return per-platform review distribution as list[{label, value}]."""
    return get_review_metrics(cursor)["byPlatform"]


def build_system_alerts(cursor: "pyodbc.Cursor") -> list[dict[str, Any]]:
    """Return system alerts list matching the SystemAlert frontend shape."""
    return get_system_alerts(cursor)


def build_recent_activity(cursor: "pyodbc.Cursor") -> list[dict[str, Any]]:
    """Return recent activity list matching the RecentActivity frontend shape."""
    return get_recent_activity(cursor)
