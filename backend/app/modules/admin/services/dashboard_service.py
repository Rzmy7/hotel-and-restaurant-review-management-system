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
from app.modules.reviews.services.stats_service import (
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
    """
    Return per-platform review counts as list[{label, value}] sorted
    by count descending (top 8).

    Strategy:
      1. Read platform list (name + review_table) from ReviewMate.dbo.platform.
      2. Call the Scraper Engine's GET /api/tables/row-counts with those table
         names to get the real row counts from the ScraperEngine database.
      3. Map counts back to platform names and return the top 8.

    Falls back to an empty list if the platform table is missing or the
    Scraper Engine is unreachable, so the dashboard never 500s.
    """
    import os
    import logging
    import urllib.request
    import urllib.parse
    import json

    logger = logging.getLogger("dashboard_service")

    # ── Step 1: collect platform → review_table mapping from ReviewMate ──
    platform_map: dict[str, str] = {}  # {review_table: platform_name}
    try:
        cursor.execute(
            """
            SELECT platform_name, review_table
            FROM dbo.platform
            WHERE review_table IS NOT NULL AND LTRIM(RTRIM(review_table)) <> ''
            ORDER BY platform_name
            """
        )
        for row in cursor.fetchall():
            p_name = str(row[0] or "").strip()
            r_table = str(row[1] or "").strip()
            if p_name and r_table:
                platform_map[r_table] = p_name
    except Exception as exc:
        logger.warning("Could not read platform table from ReviewMate: %s", exc)
        return []

    if not platform_map:
        return []

    # ── Step 2: call Scraper Engine row-counts endpoint ──
    scraper_base = os.getenv("SCRAPER_API_URL", "http://127.0.0.1:8001").rstrip("/")
    table_csv = urllib.parse.quote(",".join(platform_map.keys()))
    url = f"{scraper_base}/api/tables/row-counts?table_names={table_csv}"

    counts: dict[str, int] = {}
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = json.loads(resp.read().decode())
            counts = body.get("counts", {})
    except Exception as exc:
        logger.warning(
            "Could not reach Scraper Engine at %s: %s. "
            "Returning empty platform review data.",
            url, exc,
        )
        return []

    # ── Step 3: assemble and sort result ──
    result = [
        {"label": platform_map[tbl], "value": int(counts.get(tbl, 0))}
        for tbl in platform_map
    ]
    result.sort(key=lambda x: x["value"], reverse=True)
    return result[:8]


def build_system_alerts(cursor: "pyodbc.Cursor") -> list[dict[str, Any]]:
    """Return system alerts list matching the SystemAlert frontend shape."""
    return get_system_alerts(cursor)


def build_recent_activity(cursor: "pyodbc.Cursor") -> list[dict[str, Any]]:
    """Return recent activity list matching the RecentActivity frontend shape."""
    return get_recent_activity(cursor)
