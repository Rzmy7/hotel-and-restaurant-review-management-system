"""
System Alert Logger — fire-and-forget logging of system-level alerts.

Records API failures (Gemini quota, scraping errors), system health issues,
and other operational events into ``dbo.system_alert_log``. This table is
consumed by the admin dashboard's System Alerts panel.

All writes are best-effort: failures are silently logged and never disrupt
the primary workflow.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime
from typing import Optional

import pyodbc

from app.core.db_utils import get_connection_string

logger = logging.getLogger("system_alert_logger")


# ── Alert categories ───────────────────────────────────────────────

ALERT_GEMINI_QUOTA = "gemini_quota_exceeded"
ALERT_GEMINI_API_ERROR = "gemini_api_error"
ALERT_SCRAPING_FAILURE = "scraping_failure"
ALERT_SCRAPER_ENGINE_DOWN = "scraper_engine_unreachable"
ALERT_DB_ERROR = "database_error"
ALERT_REVIEW_PROCESSING_FAILED = "review_processing_failed"
ALERT_API_KEY_MISSING = "api_key_missing"
ALERT_SYSTEM_ERROR = "system_error"


# ── Table bootstrap ────────────────────────────────────────────────


def ensure_system_alert_log_table(cursor: pyodbc.Cursor) -> None:
    """Create ``dbo.system_alert_log`` if it does not already exist."""
    cursor.execute("""
        IF NOT EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'system_alert_log'
        )
        BEGIN
            CREATE TABLE dbo.system_alert_log (
                id            NVARCHAR(36)   NOT NULL PRIMARY KEY DEFAULT NEWID(),
                alert_type    NVARCHAR(50)   NOT NULL,
                severity      NVARCHAR(10)   NOT NULL DEFAULT 'error',
                title         NVARCHAR(200)  NOT NULL,
                message       NVARCHAR(1000) NULL,
                category      NVARCHAR(50)   NOT NULL DEFAULT 'system',
                is_read       BIT            NOT NULL DEFAULT 0,
                is_dismissed  BIT            NOT NULL DEFAULT 0,
                created_at    DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME()
            );
            CREATE NONCLUSTERED INDEX IX_system_alert_log_created
                ON dbo.system_alert_log (created_at DESC);
            CREATE NONCLUSTERED INDEX IX_system_alert_log_dismissed
                ON dbo.system_alert_log (is_dismissed, created_at DESC);
        END
        """)


# ── Public API ─────────────────────────────────────────────────────


def log_system_alert(
    alert_type: str,
    title: str,
    message: str = "",
    severity: str = "error",
    category: str = "system",
) -> None:
    """
    Insert a row into ``dbo.system_alert_log``.

    Opens a **dedicated** connection so the caller's transaction is never
    disturbed.  Wrapped in a blanket ``except`` — logging must never raise.

    Parameters
    ----------
    alert_type:
        Machine-readable category (e.g. ``ALERT_GEMINI_QUOTA``).
    title:
        Short human-readable headline shown in the alerts panel.
    message:
        Optional longer description with details.
    severity:
        One of ``"error"``, ``"warning"``, ``"info"``.
    category:
        Grouping bucket: ``"api"``, ``"scraping"``, ``"system"``, ``"database"``.
    """
    try:
        conn = pyodbc.connect(get_connection_string())
        try:
            cursor = conn.cursor()
            ensure_system_alert_log_table(cursor)

            # Deduplicate: don't insert if an identical un-dismissed alert
            # already exists within the last 30 minutes
            cursor.execute(
                """
                SELECT COUNT(*) FROM dbo.system_alert_log
                WHERE alert_type = ?
                  AND title = ?
                  AND is_dismissed = 0
                  AND created_at > DATEADD(MINUTE, -30, SYSUTCDATETIME())
                """,
                (alert_type, title[:200]),
            )
            existing = cursor.fetchone()[0]
            if existing > 0:
                logger.debug(
                    "Skipping duplicate system alert: %s (already logged within 30 min)",
                    title,
                )
                return

            cursor.execute(
                """
                INSERT INTO dbo.system_alert_log
                    (id, alert_type, severity, title, message, category, is_read, is_dismissed, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)
                """,
                (
                    str(uuid.uuid4()),
                    alert_type[:50],
                    severity[:10],
                    title[:200],
                    (message or "")[:1000],
                    category[:50],
                    datetime.utcnow(),
                ),
            )
            conn.commit()
        finally:
            conn.close()
    except Exception as exc:
        logger.warning("Failed to log system alert (%s): %s", title, exc)


# ── Pre-built alert helpers ────────────────────────────────────────


def alert_gemini_quota_exceeded(detail: str = "") -> None:
    """Log an alert when the Gemini API returns 429 / RESOURCE_EXHAUSTED."""
    log_system_alert(
        alert_type=ALERT_GEMINI_QUOTA,
        title="Gemini API Quota Exceeded",
        message=(
            "The Gemini API quota has been exhausted. Review processing is paused "
            "until quota resets. Check your Google AI billing or plan limits."
            + (f" Detail: {detail}" if detail else "")
        ),
        severity="error",
        category="api",
    )


def alert_gemini_api_error(error_msg: str = "") -> None:
    """Log an alert for a non-quota Gemini API failure."""
    log_system_alert(
        alert_type=ALERT_GEMINI_API_ERROR,
        title="Gemini API Error",
        message=(
            "A Gemini API call failed during review analysis. "
            f"Error: {error_msg[:500]}"
            if error_msg
            else "A Gemini API call failed during review analysis."
        ),
        severity="error",
        category="api",
    )


def alert_gemini_key_missing() -> None:
    """Log an alert when no Gemini API key is configured."""
    log_system_alert(
        alert_type=ALERT_API_KEY_MISSING,
        title="Gemini API Key Not Configured",
        message=(
            "No Gemini API key is configured. Review analysis cannot proceed. "
            "Set a key via Admin Panel → Settings → Review Processing."
        ),
        severity="warning",
        category="api",
    )


def alert_scraping_failure(
    platform: str, error_msg: str = "", org_name: str = ""
) -> None:
    """Log an alert when a scraping job fails."""
    org_info = f" for '{org_name}'" if org_name else ""
    log_system_alert(
        alert_type=ALERT_SCRAPING_FAILURE,
        title=f"Scraping Failed: {platform}",
        message=(
            f"A data sync job for {platform}{org_info} has failed."
            + (f" Error: {error_msg[:400]}" if error_msg else "")
            + " The system will retry on the next scheduled sync."
        ),
        severity="error",
        category="scraping",
    )


def alert_scraper_engine_unreachable(endpoint: str = "") -> None:
    """Log an alert when the scraper microservice is unreachable."""
    log_system_alert(
        alert_type=ALERT_SCRAPER_ENGINE_DOWN,
        title="Scraper Engine Unreachable",
        message=(
            "The scraper microservice could not be contacted. "
            "Review data syncing is halted until connectivity is restored."
            + (f" Endpoint: {endpoint[:300]}" if endpoint else "")
        ),
        severity="error",
        category="scraping",
    )


def alert_review_processing_batch_failed(batch_size: int, error_msg: str = "") -> None:
    """Log an alert when an entire batch of reviews fails AI processing."""
    log_system_alert(
        alert_type=ALERT_REVIEW_PROCESSING_FAILED,
        title=f"Review Processing Failed ({batch_size} reviews)",
        message=(
            f"A batch of {batch_size} reviews failed during AI analysis and has been "
            "marked for retry." + (f" Error: {error_msg[:400]}" if error_msg else "")
        ),
        severity="warning",
        category="api",
    )


def alert_database_error(operation: str, error_msg: str = "") -> None:
    """Log an alert for a critical database error."""
    log_system_alert(
        alert_type=ALERT_DB_ERROR,
        title=f"Database Error: {operation}",
        message=(
            f"A database error occurred during '{operation}'."
            + (f" Detail: {error_msg[:400]}" if error_msg else "")
        ),
        severity="error",
        category="database",
    )


def alert_review_processing_batch_failed_orm(
    db: "Session", batch_size: int, error_msg: str = ""
) -> None:
    """ORM-based alert logging for batch failures."""
    from app.modules.admin.models import SystemAlertLog

    title = f"Review Processing Failed ({batch_size} reviews)"
    message = (
        f"A batch of {batch_size} reviews failed during AI analysis and has been marked for retry."
        + (f" Error: {error_msg[:400]}" if error_msg else "")
    )

    alert = SystemAlertLog(
        alert_type=ALERT_REVIEW_PROCESSING_FAILED,
        title=title,
        message=message,
        severity="warning",
        category="api",
    )
    db.add(alert)
    # We don't commit here, the caller (pipeline) should commit
