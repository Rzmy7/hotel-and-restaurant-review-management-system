"""
Monitoring routes — scraping platforms, jobs, and server status.

Migrated from admin-backend/app/monitoring_router.py.
"""

import uuid
from datetime import date, datetime

import pyodbc
from fastapi import APIRouter, HTTPException

from app.modules.admin.db_utils import (
    execute_query,
    get_connection_string,
    get_table_columns,
    table_exists,
)
from app.modules.admin.schemas import (
    ScrapingPlatformCreatePayload,
    ScrapingPlatformUpdatePayload,
)
from app.modules.admin.services.monitoring_service import (
    create_platform_in_db,
    drop_dynamic_platform_table,
    fetch_platforms_from_db,
    find_platform_row,
    format_duration_from_created_at,
    format_job_start_time,
    get_platform_details_from_db,
    job_status_to_ui,
    organization_from_url,
    platform_visuals,
    resolve_sources_review_table_column,
    scraping_backend_get,
    server_usage,
    update_platform_in_db,
)

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])


@router.get("/admin-backend-status")
@router.get("/main-backend-status")
def admin_backend_status() -> dict[str, float | str]:
    """Returns status and resource usage for the backend server."""
    cpu_percent, ram_percent = server_usage()
    return {
        "service": "admin-backend",
        "status": "healthy",
        "cpu": cpu_percent,
        "ram": ram_percent,
    }


@router.get("/admin-backend-usage")
@router.get("/main-backend-usage")
def admin_backend_usage() -> dict[str, float]:
    """Returns CPU and RAM usage for the backend server."""
    cpu_percent, ram_percent = server_usage()
    return {"cpu": cpu_percent, "ram": ram_percent}


@router.get("/scraping/platforms")
def scraping_platforms() -> list[dict[str, object]]:
    """Returns scraping platform configuration from the SQL database."""
    return fetch_platforms_from_db()


@router.post("/scraping/platforms")
def create_scraping_platform(payload: ScrapingPlatformCreatePayload) -> dict[str, str | bool]:
    """Creates a scraping platform entry in the SQL database sources table."""
    return create_platform_in_db(payload)


@router.get("/scraping/platforms/{platform_id}")
def scraping_platform_details(platform_id: str) -> dict[str, object]:
    """Returns editable platform metadata and table attributes for one platform."""
    return get_platform_details_from_db(platform_id)


@router.put("/scraping/platforms/{platform_id}")
def update_scraping_platform(platform_id: str, payload: ScrapingPlatformUpdatePayload) -> dict[str, object]:
    """Updates platform metadata and synchronizes its backing review table schema."""
    return update_platform_in_db(platform_id, payload)


@router.patch("/scraping/platforms/{platform_id}/toggle")
def toggle_scraping_platform(platform_id: str) -> dict[str, str | bool]:
    """Flips the enabled/disabled state of a scraping platform in the DB."""
    try:
        with pyodbc.connect(get_connection_string()) as connection:
            cursor = connection.cursor()

            if not table_exists(cursor, "scraping_platform"):
                raise HTTPException(status_code=400, detail="sources table does not exist")

            columns = get_table_columns(cursor, "scraping_platform")
            enabled_col = (
                "is_enabled" if "is_enabled" in columns
                else "is_active" if "is_active" in columns
                else None
            )
            if not enabled_col:
                raise HTTPException(status_code=400, detail="sources table has no is_enabled or is_active column")

            try:
                source_id = int(platform_id)
                row = execute_query(
                    cursor,
                    f"SELECT TOP 1 source_id, platform_name, {enabled_col} FROM dbo.scraping_platform WHERE source_id = ?",
                    (source_id,),
                ).fetchone()
            except ValueError:
                row = execute_query(
                    cursor,
                    f"SELECT TOP 1 source_id, platform_name, {enabled_col} FROM dbo.scraping_platform WHERE LOWER(platform_name) = LOWER(?)",
                    (platform_id,),
                ).fetchone()

            if row is None:
                raise HTTPException(status_code=404, detail=f"Platform '{platform_id}' not found")

            found_id = int(row[0])
            found_name = str(row[1])
            current_enabled = bool(row[2]) if row[2] is not None else True
            new_enabled = not current_enabled

            execute_query(
                cursor,
                f"UPDATE dbo.scraping_platform SET {enabled_col} = ? WHERE source_id = ?",
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
    """Deletes a scraping platform from the SQL database sources table."""
    try:
        with pyodbc.connect(get_connection_string()) as connection:
            cursor = connection.cursor()

            if not table_exists(cursor, "scraping_platform"):
                raise HTTPException(status_code=400, detail="sources table does not exist in the configured database")

            columns = get_table_columns(cursor, "scraping_platform")
            table_name_col = resolve_sources_review_table_column(columns)
            select_cols = "source_id, platform_name"
            if table_name_col:
                select_cols += f", {table_name_col}"

            row = find_platform_row(cursor, platform_id, select_cols)
            if row is None:
                raise HTTPException(status_code=404, detail=f"Platform '{platform_id}' not found")

            found_id = int(row[0])
            found_name = str(row[1])
            review_table = str(row[2]).strip() if table_name_col and row[2] is not None else None

            if table_exists(cursor, "organization_sources"):
                execute_query(
                    cursor,
                    "DELETE FROM dbo.organization_sources WHERE source_id = ?",
                    (found_id,),
                )

            execute_query(
                cursor,
                "DELETE FROM dbo.scraping_platform WHERE source_id = ?",
                (found_id,),
            )

            drop_dynamic_platform_table(cursor, review_table)
            connection.commit()

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete platform: {exc}") from exc

    return {"status": "deleted", "id": str(found_id), "name": found_name}


@router.get("/scraping/stats")
def scraping_stats() -> dict[str, int | float | bool]:
    """Returns scraping stats derived from the scraping backend runtime APIs."""
    active_payload = scraping_backend_get("/api/v1/system/jobs")
    all_payload = scraping_backend_get("/api/v1/system/jobs/all")

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
        sources_payload = scraping_backend_get("/api/v1/sources")
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
    """Returns recent scraping jobs from the scraping backend."""
    payload = scraping_backend_get("/api/v1/system/jobs/all")
    rows = payload.get("jobs", []) if isinstance(payload, dict) else []
    rows = sorted(
        rows,
        key=lambda item: str(item.get("created_at", "")),
        reverse=True,
    )

    mapped_jobs: list[dict[str, str | int | None]] = []
    for index, row in enumerate(rows, start=1):
        platform = str(row.get("platform", "Unknown")).strip() or "Unknown"
        icon, color = platform_visuals(platform)
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
                "organization": organization_from_url(row.get("url")),
                "status": job_status_to_ui(str(row.get("status", ""))),
                "startTime": format_job_start_time(row.get("created_at")),
                "duration": format_duration_from_created_at(row.get("created_at")),
                "reviews": int(reviews_value) if reviews_value is not None else None,
            }
        )

    return mapped_jobs
