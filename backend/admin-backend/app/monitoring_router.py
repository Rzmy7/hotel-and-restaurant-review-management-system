import os
from datetime import date, datetime
from urllib.parse import urlparse

import psutil
import pyodbc
import requests
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.dashboard_router import _connection_string, _execute_query, _table_exists

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])

load_dotenv()

DEFAULT_SCRAPING_BACKEND_URL = os.getenv("SCRAPING_BACKEND_URL", "http://localhost:8001").rstrip("/")


class ScrapingPlatformCreatePayload(BaseModel):
    name: str
    baseUrl: str | None = None
    enabled: bool = True


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
                # Prefer the newer is_enabled column; fall back to is_active.
                is_active_col = (
                    "is_enabled" if "is_enabled" in columns
                    else "is_active" if "is_active" in columns
                    else None
                )

                # Only select base_url if it actually exists in the table.
                select_cols = "source_id, platform_name"
                has_base_url = "base_url" in columns
                if has_base_url:
                    select_cols += ", base_url"

                rows = _execute_query(
                    cursor,
                    f"SELECT {select_cols} FROM dbo.sources ORDER BY source_id",
                ).fetchall()

                last_synced: dict[int, datetime | date | None] = {}
                if _table_exists(cursor, "organization_sources"):
                    org_cols = _get_table_columns(cursor, "organization_sources")
                    # Find any timestamp column that tracks last sync.
                    sync_ts_col = next(
                        (c for c in ("last_synced_at", "synced_at", "updated_at", "last_run_at") if c in org_cols),
                        None,
                    )
                    if sync_ts_col:
                        sync_rows = _execute_query(
                            cursor,
                            f"""
                            SELECT source_id, MAX({sync_ts_col}) AS last_synced_at
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

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch platforms from database: {exc}") from exc

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


def _create_platform_in_db(payload: ScrapingPlatformCreatePayload) -> dict[str, str | bool]:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Platform name is required")

    base_url = payload.baseUrl.strip() if payload.baseUrl else None

    try:
        with pyodbc.connect(_connection_string()) as connection:
            cursor = connection.cursor()

            if not _table_exists(cursor, "sources"):
                raise HTTPException(status_code=400, detail="sources table does not exist in the configured database")

            columns = _get_table_columns(cursor, "sources")
            if "platform_name" not in columns:
                raise HTTPException(status_code=500, detail="sources table is missing required platform_name column")

            existing = _execute_query(
                cursor,
                "SELECT TOP 1 source_id FROM dbo.sources WHERE LOWER(platform_name) = LOWER(?)",
                (name,),
            ).fetchone()
            if existing is not None:
                raise HTTPException(status_code=409, detail=f"Platform '{name}' already exists")

            insert_columns = ["platform_name"]
            insert_values: list[str | bool | None] = [name]

            if "base_url" in columns:
                insert_columns.append("base_url")
                insert_values.append(base_url)

            enabled_col = (
                "is_enabled" if "is_enabled" in columns
                else "is_active" if "is_active" in columns
                else None
            )
            if enabled_col:
                insert_columns.append(enabled_col)
                insert_values.append(payload.enabled)

            placeholders = ", ".join("?" for _ in insert_columns)
            columns_sql = ", ".join(insert_columns)
            _execute_query(
                cursor,
                f"INSERT INTO dbo.sources ({columns_sql}) VALUES ({placeholders})",
                tuple(insert_values),
            )
            connection.commit()

            created = _execute_query(
                cursor,
                "SELECT TOP 1 source_id FROM dbo.sources WHERE LOWER(platform_name) = LOWER(?) ORDER BY source_id DESC",
                (name,),
            ).fetchone()
            created_id = str(created[0]) if created is not None else name.lower().replace(" ", "-")

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to create platform: {exc}") from exc

    icon, color = _platform_visuals(name)
    return {
        "id": created_id,
        "name": name,
        "icon": icon,
        "color": color,
        "enabled": payload.enabled,
        "lastRun": "never",
        "status": "active" if payload.enabled else "maintenance",
    }


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


@router.post("/scraping/platforms")
def create_scraping_platform(payload: ScrapingPlatformCreatePayload) -> dict[str, str | bool]:
    """
    Creates a scraping platform entry in the SQL database sources table.
    """
    return _create_platform_in_db(payload)


@router.patch("/scraping/platforms/{platform_id}/toggle")
def toggle_scraping_platform(platform_id: str) -> dict[str, str | bool]:
    """
    Flips the enabled/disabled state of a scraping platform in the DB.
    Works with both is_enabled and is_active column names.
    """
    try:
        with pyodbc.connect(_connection_string()) as connection:
            cursor = connection.cursor()

            if not _table_exists(cursor, "sources"):
                raise HTTPException(status_code=400, detail="sources table does not exist")

            columns = _get_table_columns(cursor, "sources")
            enabled_col = (
                "is_enabled" if "is_enabled" in columns
                else "is_active" if "is_active" in columns
                else None
            )
            if not enabled_col:
                raise HTTPException(status_code=400, detail="sources table has no is_enabled or is_active column")

            try:
                source_id = int(platform_id)
                row = _execute_query(
                    cursor,
                    f"SELECT TOP 1 source_id, platform_name, {enabled_col} FROM dbo.sources WHERE source_id = ?",
                    (source_id,),
                ).fetchone()
            except ValueError:
                row = _execute_query(
                    cursor,
                    f"SELECT TOP 1 source_id, platform_name, {enabled_col} FROM dbo.sources WHERE LOWER(platform_name) = LOWER(?)",
                    (platform_id,),
                ).fetchone()

            if row is None:
                raise HTTPException(status_code=404, detail=f"Platform '{platform_id}' not found")

            found_id = int(row[0])
            found_name = str(row[1])
            current_enabled = bool(row[2]) if row[2] is not None else True
            new_enabled = not current_enabled

            _execute_query(
                cursor,
                f"UPDATE dbo.sources SET {enabled_col} = ? WHERE source_id = ?",
                (new_enabled, found_id),
            )
            connection.commit()

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to toggle platform: {exc}") from exc

    return {
        "id": str(found_id),
        "name": found_name,
        "enabled": new_enabled,
        "status": "active" if new_enabled else "maintenance",
    }


@router.delete("/scraping/platforms/{platform_id}")
def delete_scraping_platform(platform_id: str) -> dict[str, str]:
    """
    Deletes a scraping platform from the SQL database sources table by its source_id.
    Also cascades removal of linked organization_sources rows if the DB enforces FK cascades.
    """
    try:
        with pyodbc.connect(_connection_string()) as connection:
            cursor = connection.cursor()

            if not _table_exists(cursor, "sources"):
                raise HTTPException(status_code=400, detail="sources table does not exist in the configured database")

            # Accept both integer IDs and platform name slugs for resilience.
            try:
                source_id = int(platform_id)
                row = _execute_query(
                    cursor,
                    "SELECT TOP 1 source_id, platform_name FROM dbo.sources WHERE source_id = ?",
                    (source_id,),
                ).fetchone()
            except ValueError:
                row = _execute_query(
                    cursor,
                    "SELECT TOP 1 source_id, platform_name FROM dbo.sources WHERE LOWER(platform_name) = LOWER(?)",
                    (platform_id,),
                ).fetchone()

            if row is None:
                raise HTTPException(status_code=404, detail=f"Platform '{platform_id}' not found")

            found_id = int(row[0])
            found_name = str(row[1])

            _execute_query(
                cursor,
                "DELETE FROM dbo.sources WHERE source_id = ?",
                (found_id,),
            )
            connection.commit()

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete platform: {exc}") from exc

    return {"status": "deleted", "id": str(found_id), "name": found_name}


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
