"""
Monitoring routes — scraping platforms, jobs, and server status.

Migrated from admin-backend/app/monitoring_router.py.
"""

from app.modules.admin.services.admin_activity_logger import log_admin_activity

from datetime import date, datetime

import pyodbc
from fastapi import APIRouter, HTTPException

from app.core.db_utils import (
    execute_query,
    get_connection_string,
    table_exists,
)
from app.core.pyodbc_connection import get_raw_connection
from app.modules.admin.schemas import (
    BatchConfigResponse,
    BatchConfigUpdatePayload,
    ScrapingPlatformCreatePayload,
    ScrapingPlatformUpdatePayload,
)
from app.modules.admin.services.monitoring_service import (
    create_platform_in_db,
    fetch_platforms_from_db,
    find_platform_row,
    format_duration_from_created_at,
    format_job_start_time,
    get_platform_details_from_db,
    job_status_to_ui,
    organization_from_url,
    platform_visuals,
    scraping_backend_get,
    scraping_backend_post,
    server_usage,
    update_platform_in_db,
)

router = APIRouter(prefix="/monitoring", tags=["Admin - Monitoring"])


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


@router.get("/frontend-status")
def frontend_status() -> dict[str, float | str]:
    """Returns status and resource usage for the frontend server."""
    cpu_percent, ram_percent = server_usage()
    return {
        "service": "frontend",
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
    result = create_platform_in_db(payload)
    log_admin_activity(
        "scrape_completed",
        "Scraping Platform Created",
        f"Platform '{payload.name}' added",
    )
    return result


@router.get("/scraping/platforms/{platform_id}")
def scraping_platform_details(platform_id: str) -> dict[str, object]:
    """Returns editable platform metadata and table attributes for one platform."""
    return get_platform_details_from_db(platform_id)


@router.put("/scraping/platforms/{platform_id}")
def update_scraping_platform(platform_id: str, payload: ScrapingPlatformUpdatePayload) -> dict[str, object]:
    """Updates platform metadata and synchronizes its backing review table schema."""
    result = update_platform_in_db(platform_id, payload)
    log_admin_activity(
        "scrape_completed",
        "Scraping Platform Updated",
        f"Platform '{payload.name}' (ID: {platform_id}) updated",
    )
    return result


@router.patch("/scraping/platforms/{platform_id}/toggle")
def toggle_scraping_platform(platform_id: str) -> dict[str, str | bool]:
    """Flips the enabled/disabled state of a scraping platform in the DB."""
    try:
        with pyodbc.connect(get_connection_string()) as connection:
            cursor = connection.cursor()

            if not table_exists(cursor, "platform"):
                raise HTTPException(status_code=400, detail="platform table does not exist")

            try:
                pid = int(platform_id)
                row = execute_query(
                    cursor,
                    "SELECT TOP 1 platform_id, platform_name, platform_status FROM dbo.platform WHERE platform_id = ?",
                    (pid,),
                ).fetchone()
            except ValueError:
                row = execute_query(
                    cursor,
                    "SELECT TOP 1 platform_id, platform_name, platform_status FROM dbo.platform WHERE LOWER(platform_name) = LOWER(?)",
                    (platform_id,),
                ).fetchone()

            if row is None:
                raise HTTPException(status_code=404, detail=f"Platform '{platform_id}' not found")

            found_id = int(row[0])
            found_name = str(row[1])
            current_status = str(row[2] or "active").strip().lower()
            current_enabled = current_status == "active"
            new_enabled = not current_enabled
            new_status = "active" if new_enabled else "inactive"

            execute_query(
                cursor,
                "UPDATE dbo.platform SET platform_status = ?, updated_at = SYSUTCDATETIME() WHERE platform_id = ?",
                (new_status, found_id),
            )
            connection.commit()

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to toggle platform: {exc}") from exc

    log_admin_activity(
        "scrape_completed",
        f"Platform {'Enabled' if new_enabled else 'Disabled'}",
        f"Platform '{found_name}' toggled to {'active' if new_enabled else 'inactive'}",
    )
    return {
        "id": str(found_id),
        "name": found_name,
        "enabled": new_enabled,
        "status": "active" if new_enabled else "maintenance",
    }


@router.delete("/scraping/platforms/{platform_id}")
def delete_scraping_platform(platform_id: str) -> dict[str, str]:
    """Deletes a scraping platform from the platform table."""
    try:
        with pyodbc.connect(get_connection_string()) as connection:
            cursor = connection.cursor()

            if not table_exists(cursor, "platform"):
                raise HTTPException(status_code=400, detail="platform table does not exist in the configured database")

            select_cols = "platform_id, platform_name"

            row = find_platform_row(cursor, platform_id, select_cols)
            if row is None:
                raise HTTPException(status_code=404, detail=f"Platform '{platform_id}' not found")

            found_id = int(row[0])
            found_name = str(row[1])

            execute_query(
                cursor,
                "DELETE FROM dbo.platform WHERE platform_id = ?",
                (found_id,),
            )
            connection.commit()

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete platform: {exc}") from exc

    log_admin_activity(
        "scrape_failed",
        "Scraping Platform Deleted",
        f"Platform '{found_name}' (ID: {found_id}) deleted",
    )
    return {"status": "deleted", "id": str(found_id), "name": found_name}


@router.get("/scraping/stats")
def scraping_stats() -> dict[str, int | float | bool]:
    """Returns scraping stats derived from the scraping backend runtime APIs."""
    try:
        active_payload = scraping_backend_get("/api/system/jobs")
        all_payload = scraping_backend_get("/api/system/jobs/all")
    except HTTPException as exc:
        if exc.status_code == 502:
            return {
                "activeJobs": 0,
                "activeJobsChange": 0,
                "completedToday": 0,
                "successRate": 0.0,
                "failedJobs": 0,
                "requiresAttention": False,
                "reviewsIngested": 0,
                "reviewsChange": 0,
            }
        raise

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
        db_stats = scraping_backend_get("/api/db/stats")
        if isinstance(db_stats, dict):
            reviews_ingested = db_stats.get("total_reviews", 0)
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


def normalize_url(url: str | None) -> str:
    if not url:
        return ""
    try:
        from urllib.parse import urlparse, urlunparse
        parsed = urlparse(url)
        netloc = parsed.netloc or parsed.path
        netloc = netloc.lower().replace("www.", "").strip()
        path = parsed.path if parsed.netloc else ""
        path = path.rstrip("/")
        normalized = urlunparse((
            parsed.scheme or "https",
            netloc,
            path,
            "",
            "",
            ""
        ))
        return normalized
    except Exception:
        return url or ""


@router.get("/scraping/jobs")
def scraping_jobs(
    page: int = 1,
    limit: int = 10,
    search: str | None = None,
) -> dict:
    """Returns paginated, recent scraping jobs from the scraping backend."""
    page = max(1, page)
    limit = max(1, limit)
    offset = (page - 1) * limit

    try:
        payload = scraping_backend_get("/api/system/jobs/all")
    except HTTPException as exc:
        if exc.status_code == 502:
            return {
                "data": [],
                "total": 0,
                "page": page,
                "limit": limit
            }
        raise
    
    rows = payload.get("jobs", []) if isinstance(payload, dict) else []
    rows = sorted(
        rows,
        key=lambda item: str(item.get("created_at", "")),
        reverse=True,
    )

    url_to_org = {}
    try:
        with pyodbc.connect(get_connection_string()) as connection:
            cursor = connection.cursor()
            if table_exists(cursor, "source") and table_exists(cursor, "organization"):
                q = """
                    SELECT s.source_url, o.organization_name
                    FROM dbo.source s
                    JOIN dbo.organization o ON s.organization_id = o.organization_id
                """
                db_rows = execute_query(cursor, q).fetchall()
                for r in db_rows:
                    if r[0] and r[1]:
                        raw_url = r[0]
                        org_name = r[1]
                        url_to_org[raw_url] = org_name
                        url_to_org[normalize_url(raw_url)] = org_name
    except Exception as db_exc:
        import logging
        logging.getLogger(__name__).error(f"Error fetching organization names for scraping jobs: {db_exc}")

    mapped_jobs: list[dict[str, str | int | None]] = []
    for index, row in enumerate(rows, start=1):
        platform = str(row.get("platform", "Unknown")).strip() or "Unknown"
        
        # Get organization name from database lookup, fallback to platform url parsing
        job_url = row.get("url")
        org_name = ""
        if job_url:
            org_name = url_to_org.get(job_url) or url_to_org.get(normalize_url(job_url))
        if not org_name:
            org_name = organization_from_url(job_url) or ""

        status_ui = job_status_to_ui(str(row.get("status", "")))

        # Filter by search string if provided
        if search:
            search_lower = search.lower()
            if not (search_lower in platform.lower() or 
                    search_lower in org_name.lower() or 
                    search_lower in status_ui.lower()):
                continue

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
                "organization": org_name,
                "status": status_ui,
                "startTime": format_job_start_time(row.get("created_at")),
                "duration": format_duration_from_created_at(
                    row.get("created_at"), 
                    row.get("ended_at")
                ),
                "reviews": int(reviews_value) if reviews_value is not None else None,
            }
        )

    total = len(mapped_jobs)
    sliced_jobs = mapped_jobs[offset:offset + limit]

    return {
        "data": sliced_jobs,
        "total": total,
        "page": page,
        "limit": limit
    }


@router.post("/scraping/jobs/{job_id}/cancel")
def cancel_scraping_job(job_id: str) -> dict[str, str]:
    """Cancels a running or queued scraping job by its internal job UUID."""
    result = scraping_backend_post(f"/api/system/jobs/cancel/{job_id}")
    log_admin_activity(
        "scrape_failed",
        "Scraping Job Cancelled",
        f"Job {job_id} was cancelled by admin",
    )
    return result


# ── Review processing endpoints ─────────────────────────────────────


@router.get("/review-processing/stats")
def review_processing_stats() -> dict:
    """Returns review-processing pipeline statistics from dbo.processed_review."""
    from app.modules.reviews.repository import get_processing_metrics

    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            metrics = get_processing_metrics(cursor)

            total = metrics.get("total", 0)
            processed = metrics.get("processed", 0)
            failed = metrics.get("failed", 0)
            pending = metrics.get("pending", 0)
            processing = metrics.get("processing", 0)

            # Completed today: reviews with last_attempt = today and status = 'processed'
            completed_today = 0
            try:
                row = execute_query(
                    cursor,
                    "SELECT COUNT(*) FROM dbo.processed_review "
                    "WHERE status = 'processed' AND CAST(last_attempt AS DATE) = CAST(GETDATE() AS DATE)",
                ).fetchone()
                completed_today = row[0] if row else 0
            except Exception:
                pass

            success_rate = 0.0
            terminal = processed + failed
            if terminal > 0:
                success_rate = round((processed / terminal) * 100, 1)

            from app.modules.admin.services.system_settings_service import get_setting_bool, get_setting
            is_paused = get_setting_bool(cursor, "review_processing_paused", default=False)
            pause_reason = get_setting(cursor, "review_processing_pause_reason")
            if is_paused and not pause_reason:
                pause_reason = "manual"
            elif not is_paused:
                pause_reason = None

            return {
                "activeJobs": processing,
                "activeJobsChange": 0,
                "completedToday": completed_today,
                "successRate": success_rate,
                "failedJobs": failed,
                "reviewsProcessed": processed,
                "reviewsChange": 0,
                "pendingReviews": pending,
                "isPaused": is_paused,
                "pauseReason": pause_reason,
            }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch review processing stats: {exc}") from exc


@router.post("/review-processing/resume")
def resume_review_processing() -> dict:
    """Resumes review processing by unsetting the paused flag."""
    from app.modules.admin.services.system_settings_service import set_setting
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            set_setting(cursor, "review_processing_paused", "false")
            set_setting(cursor, "review_processing_pause_reason", "")
            conn.commit()

        try:
            from app.modules.scheduler.services.scheduler_service import scheduler
            if scheduler.get_job('process_reviews_job'):
                scheduler.resume_job('process_reviews_job')
                logger.info("Scheduler: Resumed process_reviews_job via API resume call.")
        except Exception as sched_err:
            logger.error(f"Failed to resume scheduler job: {sched_err}")

        log_admin_activity(
            "settings_updated",
            "Review Processing Resumed",
            "Review processing was manually resumed after API limit pause",
        )
        return {"status": "success", "message": "Review processing resumed."}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to resume review processing: {exc}") from exc


@router.post("/review-processing/pause")
def pause_review_processing() -> dict:
    """Manually pauses review processing."""
    from app.modules.admin.services.system_settings_service import set_setting
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            set_setting(cursor, "review_processing_paused", "true")
            set_setting(cursor, "review_processing_pause_reason", "manual")
            conn.commit()

        try:
            from app.modules.scheduler.services.scheduler_service import scheduler
            if scheduler.get_job('process_reviews_job'):
                scheduler.pause_job('process_reviews_job')
                logger.info("Scheduler: Paused process_reviews_job via API pause call.")
        except Exception as sched_err:
            logger.error(f"Failed to pause scheduler job: {sched_err}")

        log_admin_activity(
            "settings_updated",
            "Review Processing Paused",
            "Review processing was manually paused",
        )
        return {"status": "success", "message": "Review processing paused."}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to pause review processing: {exc}") from exc


@router.post("/review-processing/retry/{source_id}")
def retry_failed_reviews(source_id: str) -> dict:
    """Reset all failed reviews for a source back to 'pending' for reprocessing."""
    try:
        with get_raw_connection() as conn:
            cursor = conn.cursor()
            sql = """
                UPDATE dbo.processed_review
                SET status = 'pending',
                    retry_count = 0,
                    error_message = NULL,
                    last_attempt = NULL
                WHERE source_id = CAST(? AS UNIQUEIDENTIFIER)
                  AND status = 'failed'
            """
            cursor.execute(sql, source_id)
            affected = cursor.rowcount
            conn.commit()

        log_admin_activity(
            "settings_updated",
            "Failed Reviews Retried",
            f"Reset {affected} failed reviews for source {source_id} to pending",
        )
        return {"status": "success", "message": f"{affected} reviews reset to pending.", "count": affected}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to retry reviews: {exc}") from exc


@router.post("/review-processing/retry-all")
def retry_all_failed_reviews() -> dict:
    """Reset ALL failed reviews across all sources back to 'pending' for reprocessing."""
    try:
        with get_raw_connection() as conn:
            cursor = conn.cursor()
            sql = """
                UPDATE dbo.processed_review
                SET status = 'pending',
                    retry_count = 0,
                    error_message = NULL,
                    last_attempt = NULL
                WHERE status = 'failed'
            """
            cursor.execute(sql)
            affected = cursor.rowcount
            conn.commit()

        log_admin_activity(
            "settings_updated",
            "All Failed Reviews Retried",
            f"Reset {affected} failed reviews across all sources to pending",
        )
        return {"status": "success", "message": f"{affected} reviews reset to pending.", "count": affected}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to retry all reviews: {exc}") from exc


@router.get("/review-processing/jobs")
def review_processing_jobs(
    page: int = 1,
    limit: int = 10,
    search: str | None = None,
) -> dict:
    """Returns paginated review processing activity grouped by source as job-like rows."""
    page = max(1, page)
    limit = max(1, limit)
    offset = (page - 1) * limit

    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()

            # Check if processing is currently paused (e.g. LLM API rate limit)
            from app.modules.admin.services.system_settings_service import get_setting_bool
            is_paused = get_setting_bool(cursor, "review_processing_paused", default=False)

            # Get the single source_id that has the oldest pending review
            cursor.execute("""
                SELECT TOP 1 source_id 
                FROM dbo.processed_review 
                WHERE status = 'pending' 
                ORDER BY scrapedAt ASC, id ASC
            """)
            row_running = cursor.fetchone()
            running_source_id = str(row_running[0]) if (row_running and row_running[0]) else None

            where_clauses = []
            params = []
            if search:
                search_pattern = f"%{search.strip()}%"
                where_clauses.append(
                    "(p.platform_name LIKE ? OR o.organization_name LIKE ? OR r.status LIKE ?)"
                )
                params.extend([search_pattern] * 3)

            where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

            # Count query
            count_sql = f"""
                SELECT COUNT(*) FROM (
                    SELECT r.source_id, r.status
                    FROM dbo.processed_review r
                    LEFT JOIN dbo.source s ON r.source_id = s.source_id
                    LEFT JOIN dbo.platform p ON s.platform_id = p.platform_id
                    LEFT JOIN dbo.organization o ON s.organization_id = o.organization_id
                    {where_sql}
                    GROUP BY r.source_id, p.platform_name, o.organization_name, r.status
                ) AS grouped_jobs
            """
            cursor.execute(count_sql, params)
            total = int(cursor.fetchone()[0] or 0)

            # Paginated query
            sql = f"""
                SELECT 
                    r.source_id,
                    p.platform_name,
                    o.organization_name AS organization_name,
                    r.status,
                    COUNT(*) AS review_count,
                    MIN(r.last_attempt) AS earliest_attempt,
                    MAX(r.last_attempt) AS latest_attempt,
                    (SELECT COUNT(*) FROM dbo.processed_review t WHERE t.source_id = r.source_id) AS total_reviews,
                    (SELECT COUNT(*) FROM dbo.processed_review t WHERE t.source_id = r.source_id AND t.status = 'processed') AS processed_reviews
                FROM dbo.processed_review r
                LEFT JOIN dbo.source s ON r.source_id = s.source_id
                LEFT JOIN dbo.platform p ON s.platform_id = p.platform_id
                LEFT JOIN dbo.organization o ON s.organization_id = o.organization_id
                {where_sql}
                GROUP BY r.source_id, p.platform_name, o.organization_name, r.status
                ORDER BY 
                    CASE WHEN MAX(r.last_attempt) IS NULL THEN 1 ELSE 0 END DESC, 
                    MAX(r.last_attempt) DESC,
                    r.source_id DESC,
                    r.status DESC
                OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
            """
            cursor.execute(sql, params + [offset, limit])
            rows = cursor.fetchall()

            jobs = []
            for idx, row in enumerate(rows, start=1):
                source_id = str(row[0]) if row[0] else str(idx)
                platform_name = str(row[1] or "Unknown")
                org_name = str(row[2] or "Unknown")
                status_raw = str(row[3] or "pending").lower()
                review_count = int(row[4] or 0)
                earliest = row[5]
                latest = row[6]
                total_reviews = int(row[7] or 0)
                processed_reviews = int(row[8] or 0)

                icon, color = platform_visuals(platform_name)
                short_id = source_id[-6:].upper() if len(source_id) >= 6 else str(idx)

                # Map DB status to UI status
                if status_raw == "processed":
                    ui_status = "Completed"
                elif status_raw == "failed":
                    ui_status = "Failed"
                elif status_raw == "processing":
                    ui_status = "Paused" if is_paused else "Running"
                elif status_raw == "pending":
                    ui_status = "Queued"
                else:
                    ui_status = "Queued"

                # Format start time — return ISO so the frontend applies timezone
                start_time = "--"
                if earliest:
                    try:
                        dt = earliest if isinstance(earliest, datetime) else datetime.fromisoformat(str(earliest))
                        start_time = dt.isoformat()
                        if dt.tzinfo is None:
                            start_time += "Z"
                    except Exception:
                        start_time = str(earliest)[:16]

                # Format duration
                duration = "--"
                if earliest and latest:
                    try:
                        dt_start = earliest if isinstance(earliest, datetime) else datetime.fromisoformat(str(earliest))
                        dt_end = latest if isinstance(latest, datetime) else datetime.fromisoformat(str(latest))
                        delta = dt_end - dt_start
                        total_secs = int(delta.total_seconds())
                        if total_secs < 60:
                            duration = f"{total_secs}s"
                        elif total_secs < 3600:
                            duration = f"{total_secs // 60}m {total_secs % 60}s"
                        else:
                            duration = f"{total_secs // 3600}h {(total_secs % 3600) // 60}m"
                    except Exception:
                        duration = "--"

                jobs.append({
                    "id": f"{source_id}-{status_raw}",
                    "jobId": f"#RPJ-{short_id}",
                    "platform": platform_name.title(),
                    "platformIcon": icon,
                    "platformColor": color,
                    "organization": org_name,
                    "status": ui_status,
                    "startTime": start_time,
                    "duration": duration,
                    "reviewsProcessed": processed_reviews,
                    "totalReviews": total_reviews,
                })

            return {
                "data": jobs,
                "total": total,
                "page": page,
                "limit": limit
            }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch review processing jobs: {exc}") from exc


# Legacy provider-specific config endpoints removed — use /api/admin/llm-models instead.


# ── Batch size configuration ────────────────────────────────────────

@router.get("/review-processing/batch-config", response_model=BatchConfigResponse)
def get_batch_config() -> BatchConfigResponse:
    """Return the current review-processing batch size, parallel batches count, and their allowed ranges."""
    from app.modules.admin.services.system_settings_service import (
        get_review_batch_size,
        REVIEW_BATCH_SIZE_DEFAULT,
        REVIEW_BATCH_SIZE_MIN,
        REVIEW_BATCH_SIZE_MAX,
        get_review_parallel_batches,
        REVIEW_PARALLEL_BATCHES_DEFAULT,
        REVIEW_PARALLEL_BATCHES_MIN,
        REVIEW_PARALLEL_BATCHES_MAX,
    )
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            batch_size = get_review_batch_size(cursor)
            parallel_batches = get_review_parallel_batches(cursor)
        return BatchConfigResponse(
            batch_size=batch_size,
            min=REVIEW_BATCH_SIZE_MIN,
            max=REVIEW_BATCH_SIZE_MAX,
            default=REVIEW_BATCH_SIZE_DEFAULT,
            parallel_batches=parallel_batches,
            parallel_min=REVIEW_PARALLEL_BATCHES_MIN,
            parallel_max=REVIEW_PARALLEL_BATCHES_MAX,
            parallel_default=REVIEW_PARALLEL_BATCHES_DEFAULT,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch batch config: {exc}") from exc


@router.patch("/review-processing/batch-config", response_model=BatchConfigResponse)
def update_batch_config(payload: BatchConfigUpdatePayload) -> BatchConfigResponse:
    """Persist a new review-processing batch size and parallel batches count."""
    from app.modules.admin.services.system_settings_service import (
        set_review_batch_size,
        REVIEW_BATCH_SIZE_DEFAULT,
        REVIEW_BATCH_SIZE_MIN,
        REVIEW_BATCH_SIZE_MAX,
        set_review_parallel_batches,
        REVIEW_PARALLEL_BATCHES_DEFAULT,
        REVIEW_PARALLEL_BATCHES_MIN,
        REVIEW_PARALLEL_BATCHES_MAX,
    )
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            saved_size = set_review_batch_size(cursor, payload.batch_size)
            saved_parallel = set_review_parallel_batches(cursor, payload.parallel_batches)
            conn.commit()

        log_admin_activity(
            "settings_updated",
            "Batch Config Updated",
            f"Review processing batch size set to {saved_size}, parallel batches set to {saved_parallel}",
        )
        return BatchConfigResponse(
            batch_size=saved_size,
            min=REVIEW_BATCH_SIZE_MIN,
            max=REVIEW_BATCH_SIZE_MAX,
            default=REVIEW_BATCH_SIZE_DEFAULT,
            parallel_batches=saved_parallel,
            parallel_min=REVIEW_PARALLEL_BATCHES_MIN,
            parallel_max=REVIEW_PARALLEL_BATCHES_MAX,
            parallel_default=REVIEW_PARALLEL_BATCHES_DEFAULT,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to update batch config: {exc}") from exc


@router.get("/dupes-test")
def test_duplicates() -> dict:
    """Detects duplicated sources and reviews in the database."""
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            
            # 1. Duplicate Sources (Same URL in same Organization)
            source_sql = """
                SELECT organization_id, source_url, COUNT(*) as count
                FROM dbo.source
                GROUP BY organization_id, source_url
                HAVING COUNT(*) > 1
            """
            cursor.execute(source_sql)
            source_groups = cursor.fetchall()
            duplicate_sources_count = sum(int(row[2]) - 1 for row in source_groups)
            
            # 2. Duplicate Reviews (Same text and reviewerName in same Source)
            # Use casting to VARCHAR(8000) for grouping as text is VARCHAR(MAX)
            review_sql = """
                SELECT source_id, reviewerName, CAST([text] AS VARCHAR(8000)) as review_text, COUNT(*) as count
                FROM dbo.processed_review
                GROUP BY source_id, reviewerName, CAST([text] AS VARCHAR(8000))
                HAVING COUNT(*) > 1
            """
            cursor.execute(review_sql)
            review_groups = cursor.fetchall()
            duplicate_reviews_count = sum(int(row[3]) - 1 for row in review_groups)
            
            return {
                "status": "success",
                "duplicates": {
                    "sources": {
                        "groups": len(source_groups),
                        "redundant": duplicate_sources_count
                    },
                    "reviews": {
                        "groups": len(review_groups),
                        "redundant": duplicate_reviews_count
                    }
                }
            }
    except Exception as exc:
        import traceback
        print(f"Error in test_duplicates: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to test for duplicates: {exc}") from exc


@router.post("/dupes-cleanup")
def cleanup_duplicates() -> dict:
    """Removes duplicated sources and reviews, keeping the most detailed records."""
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            
            # ── 1. Cleanup Reviews ──────────────────────────────────────────
            cursor.execute("""
                SELECT source_id, reviewerName, CAST([text] AS VARCHAR(8000)) as txt
                FROM dbo.processed_review
                GROUP BY source_id, reviewerName, CAST([text] AS VARCHAR(8000))
                HAVING COUNT(*) > 1
            """)
            dupe_groups = cursor.fetchall()
            
            reviews_deleted = 0
            for group in dupe_groups:
                sid, name, txt = group
                
                # Handle potential NULLs in sid, name, or txt
                sql = "SELECT id, heading, sentiment, ai_reply, scrapedAt FROM dbo.processed_review WHERE source_id = ?"
                params = [sid]
                
                if name is None:
                    sql += " AND reviewerName IS NULL"
                else:
                    sql += " AND reviewerName = ?"
                    params.append(name)
                    
                if txt is None:
                    sql += " AND [text] IS NULL"
                else:
                    # Use same casting logic for consistency
                    sql += " AND CAST([text] AS VARCHAR(8000)) = ?"
                    params.append(txt)
                
                cursor.execute(sql, params)
                rows = cursor.fetchall()
                
                if not rows: continue
                
                def get_quality(r):
                    score = 0
                    if r[1]: score += 10 # heading
                    if r[2]: score += 5  # sentiment
                    if r[3]: score += 5  # ai_reply
                    return score

                # Sort by quality DESC, then date DESC
                sorted_rows = sorted(rows, key=lambda r: (get_quality(r), r[4] or datetime.min), reverse=True)
                
                others = [r[0] for r in sorted_rows[1:]]
                if others:
                    for oid in others:
                        cursor.execute("DELETE FROM dbo.processed_review WHERE id = ?", (oid,))
                        reviews_deleted += 1

            # ── 2. Cleanup Sources ──────────────────────────────────────────
            cursor.execute("""
                SELECT organization_id, source_url
                FROM dbo.source
                GROUP BY organization_id, source_url
                HAVING COUNT(*) > 1
            """)
            source_dupes = cursor.fetchall()
            
            sources_deleted = 0
            for group in source_dupes:
                org_id, url = group
                
                cursor.execute("""
                    SELECT source_id, created_at
                    FROM dbo.source
                    WHERE organization_id = ? AND source_url = ?
                """, (org_id, url))
                rows = cursor.fetchall()
                
                if not rows: continue
                
                source_info = []
                for r in rows:
                    sid = r[0]
                    cursor.execute("SELECT COUNT(*) FROM dbo.processed_review WHERE source_id = ?", (sid,))
                    count = cursor.fetchone()[0]
                    source_info.append({"id": sid, "count": count, "created_at": r[1] or datetime.max})
                
                # Keep source with more reviews, then oldest
                sorted_sources = sorted(source_info, key=lambda s: (s["count"], -(s["created_at"].timestamp() if isinstance(s["created_at"], datetime) else 0)), reverse=True)
                
                losers = [s["id"] for s in sorted_sources[1:]]
                for loser_id in losers:
                    cursor.execute("DELETE FROM dbo.processed_review WHERE source_id = ?", (loser_id,))
                    cursor.execute("DELETE FROM dbo.source WHERE source_id = ?", (loser_id,))
                    sources_deleted += 1

            conn.commit()
            
            log_admin_activity(
                "settings_updated",
                "Duplication Cleanup Performed",
                f"Removed {reviews_deleted} reviews and {sources_deleted} sources."
            )
            
            return {
                "status": "success",
                "deleted": {
                    "reviews": reviews_deleted,
                    "sources": sources_deleted
                }
            }
    except Exception as exc:
        import traceback
        print(f"Error in cleanup_duplicates: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to cleanup duplicates: {exc}") from exc
