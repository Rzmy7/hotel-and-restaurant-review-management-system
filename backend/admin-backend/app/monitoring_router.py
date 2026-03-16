import os
from datetime import date, datetime
from urllib.parse import urlparse

import psutil
import pyodbc
import requests
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException

from app.dashboard_router import _connection_string, _execute_query, _table_exists

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])

load_dotenv()

DEFAULT_SCRAPING_BACKEND_URL = os.getenv("SCRAPING_BACKEND_URL", "http://localhost:8001").rstrip("/")


def _to_relative_timestamp(value: datetime | date | None) -> str:
    if value is None:
        return "never"

    if isinstance(value, date) and not isinstance(value, datetime):
        value = datetime.combine(value, datetime.min.time())

    now = datetime.now(value.tzinfo) if isinstance(value, datetime) and value.tzinfo else datetime.now()
    delta = now - value
    seconds = int(delta.total_seconds())

    if seconds < 60:
        return "just now"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes}m ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours}h ago"
    days = hours // 24
    return f"{days}d ago"


def _platform_visuals(platform_name: str) -> tuple[str, str]:
    key = platform_name.strip().lower()
    mapping = {
        "booking": ("B", "#003580"),
        "booking.com": ("B", "#003580"),
        "tripadvisor": ("T", "#00AF87"),
        "agoda": ("Ag", "#5E4B8B"),
        "google": ("G", "#4285F4"),
        "google maps": ("G", "#4285F4"),
        "expedia": ("E", "#FFCB00"),
    }
    return mapping.get(key, (platform_name[:2].upper() if platform_name else "P", "#6B7280"))


def _get_table_columns(cursor: pyodbc.Cursor, table_name: str, schema: str = "dbo") -> set[str]:
    rows = _execute_query(
        cursor,
        """
        SELECT LOWER(COLUMN_NAME)
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        """,
        (schema, table_name),
    ).fetchall()
    return {str(row[0]) for row in rows}


def _fetch_platforms_from_db() -> list[dict[str, str | bool]]:
    try:
        with pyodbc.connect(_connection_string()) as connection:
            cursor = connection.cursor()

            if _table_exists(cursor, "sources"):
                columns = _get_table_columns(cursor, "sources")
                is_active_col = "is_active" if "is_active" in columns else None

                rows = _execute_query(
                    cursor,
                    """
                    SELECT source_id, platform_name, base_url
                    FROM dbo.sources
                    ORDER BY source_id
                    """,
                ).fetchall()

                last_synced: dict[int, datetime | date | None] = {}
                if _table_exists(cursor, "organization_sources"):
                    sync_rows = _execute_query(
                        cursor,
                        """
                        SELECT source_id, MAX(last_synced_at) AS last_synced_at
                        FROM dbo.organization_sources
                        GROUP BY source_id
                        """,
                    ).fetchall()
                    last_synced = {int(row[0]): row[1] for row in sync_rows if row[0] is not None}

                platforms: list[dict[str, str | bool]] = []
                for row in rows:
                    source_id = int(row[0])
                    platform_name = str(row[1] or "Platform").strip()
                    icon, color = _platform_visuals(platform_name)

                    enabled = True
                    if is_active_col:
                        active_value = _execute_query(
                            cursor,
                            f"SELECT TOP 1 {is_active_col} FROM dbo.sources WHERE source_id = ?",
                            (source_id,),
                        ).fetchone()
                        if active_value is not None:
                            enabled = bool(active_value[0])

                    platforms.append(
                        {
                            "id": str(source_id),
                            "name": platform_name,
                            "icon": icon,
                            "color": color,
                            "enabled": enabled,
                            "lastRun": _to_relative_timestamp(last_synced.get(source_id)),
                            "status": "active" if enabled else "maintenance",
                        }
                    )
                return platforms

            if _table_exists(cursor, "ProcessedReviews"):
                rows = _execute_query(
                    cursor,
                    """
                    SELECT
                        NULLIF(LTRIM(RTRIM(source)), '') AS platform_name,
                        MAX(COALESCE(
                            CAST(lastUpdated AS datetime),
                            CAST(scrapedAt AS datetime),
                            CAST(reviewDate AS datetime)
                        )) AS last_run
                    FROM dbo.ProcessedReviews
                    WHERE NULLIF(LTRIM(RTRIM(source)), '') IS NOT NULL
                    GROUP BY NULLIF(LTRIM(RTRIM(source)), '')
                    ORDER BY platform_name
                    """,
                ).fetchall()

                platforms = []
                for index, row in enumerate(rows, start=1):
                    platform_name = str(row[0]).strip()
                    icon, color = _platform_visuals(platform_name)
                    platforms.append(
                        {
                            "id": str(index),
                            "name": platform_name,
                            "icon": icon,
                            "color": color,
                            "enabled": True,
                            "lastRun": _to_relative_timestamp(row[1]),
                            "status": "active",
                        }
                    )
                return platforms

    except Exception:
        return []

    return []


def _scraping_backend_get(path: str) -> dict | list:
    target = f"{DEFAULT_SCRAPING_BACKEND_URL}{path}"
    try:
        response = requests.get(target, timeout=8)
        response.raise_for_status()
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Scraping backend request failed for {path}: {exc}") from exc

    try:
        return response.json()
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=f"Invalid JSON from scraping backend for {path}") from exc


def _job_status_to_ui(raw_status: str) -> str:
    normalized = (raw_status or "").strip().lower()
    if normalized in {"running", "pending"}:
        return "Running"
    if normalized == "failed":
        return "Failed"
    return "Completed"


def _format_job_start_time(value: str | None) -> str:
    if not value:
        return "--"

    try:
        dt_value = datetime.fromisoformat(value)
    except ValueError:
        return value

    return dt_value.strftime("%b %d, %Y %I:%M %p")


def _format_duration_from_created_at(value: str | None) -> str:
    if not value:
        return "--"

    try:
        created = datetime.fromisoformat(value)
    except ValueError:
        return "--"

    elapsed = max(0, int((datetime.now(created.tzinfo) - created).total_seconds()))
    minutes = elapsed // 60
    seconds = elapsed % 60
    return f"{minutes}m {seconds:02d}s"


def _organization_from_url(url: str | None) -> str:
    if not url:
        return "Unknown"

    parsed = urlparse(url)
    host = parsed.netloc or parsed.path
    host = host.replace("www.", "").strip()
    return host or "Unknown"


def _server_usage() -> tuple[float, float]:
    cpu_percent = psutil.cpu_percent(interval=0.2)
    ram_percent = psutil.virtual_memory().percent
    return cpu_percent, ram_percent


@router.get("/admin-backend-status")
@router.get("/main-backend-status")
def admin_backend_status() -> dict[str, float | str]:
    """
    Returns status and resource usage for the admin backend server.
    """
    cpu_percent, ram_percent = _server_usage()
    return {
        "service": "admin-backend",
        "status": "healthy",
        "cpu": cpu_percent,
        "ram": ram_percent,
    }


@router.get("/admin-backend-usage")
@router.get("/main-backend-usage")
def admin_backend_usage() -> dict[str, float]:
    """
    Returns CPU and RAM usage for the admin backend server.
    """
    cpu_percent, ram_percent = _server_usage()
    return {"cpu": cpu_percent, "ram": ram_percent}


@router.get("/scraping/platforms")
def scraping_platforms() -> list[dict[str, str | bool]]:
    """
    Returns scraping platform configuration from the SQL database.
    """
    return _fetch_platforms_from_db()


@router.get("/scraping/stats")
def scraping_stats() -> dict[str, int | float | bool]:
    """
    Returns scraping stats derived from the scraping backend runtime APIs.
    """
    active_payload = _scraping_backend_get("/api/v1/system/jobs")
    all_payload = _scraping_backend_get("/api/v1/system/jobs/all")

    active_jobs = active_payload.get("jobs", []) if isinstance(active_payload, dict) else []
    all_jobs = all_payload.get("jobs", []) if isinstance(all_payload, dict) else []

    completed_jobs = [job for job in all_jobs if str(job.get("status", "")).lower() == "completed"]
    failed_jobs = [job for job in all_jobs if str(job.get("status", "")).lower() == "failed"]

    today = date.today()
    completed_today = 0
    for job in completed_jobs:
        created_at = job.get("created_at")
        if not created_at:
            continue
        try:
            if datetime.fromisoformat(created_at).date() == today:
                completed_today += 1
        except ValueError:
            continue

    total_terminal = len(completed_jobs) + len(failed_jobs)
    success_rate = round((len(completed_jobs) / total_terminal) * 100, 1) if total_terminal else 100.0

    reviews_ingested = 0
    try:
        sources_payload = _scraping_backend_get("/api/v1/sources")
        if isinstance(sources_payload, dict):
            source_rows = sources_payload.get("data", [])
            if isinstance(source_rows, list):
                reviews_ingested = sum(int(row.get("total_reviews", 0) or 0) for row in source_rows)
    except HTTPException:
        reviews_ingested = sum(int(job.get("reviews_extracted", 0) or 0) for job in all_jobs)

    return {
        "activeJobs": len(active_jobs),
        "activeJobsChange": 0,
        "completedToday": completed_today,
        "successRate": success_rate,
        "failedJobs": len(failed_jobs),
        "requiresAttention": len(failed_jobs) > 0,
        "reviewsIngested": reviews_ingested,
        "reviewsChange": 0,
    }


@router.get("/scraping/jobs")
def scraping_jobs() -> list[dict[str, str | int | None]]:
    """
    Returns recent scraping jobs from the scraping backend.
    """
    payload = _scraping_backend_get("/api/v1/system/jobs/all")
    rows = payload.get("jobs", []) if isinstance(payload, dict) else []
    rows = sorted(
        rows,
        key=lambda item: str(item.get("created_at", "")),
        reverse=True,
    )

    mapped_jobs: list[dict[str, str | int | None]] = []
    for index, row in enumerate(rows, start=1):
        platform = str(row.get("platform", "Unknown")).strip() or "Unknown"
        icon, color = _platform_visuals(platform)
        job_id = str(row.get("id", index))
        short_id = job_id[-6:].upper() if len(job_id) >= 6 else str(index)

        reviews_value = row.get("reviews_extracted")
        mapped_jobs.append(
            {
                "id": job_id,
                "jobId": f"#SCR-{short_id}",
                "platform": platform.title(),
                "platformIcon": icon,
                "platformColor": color,
                "organization": _organization_from_url(row.get("url")),
                "status": _job_status_to_ui(str(row.get("status", ""))),
                "startTime": _format_job_start_time(row.get("created_at")),
                "duration": _format_duration_from_created_at(row.get("created_at")),
                "reviews": int(reviews_value) if reviews_value is not None else None,
            }
        )

    return mapped_jobs
