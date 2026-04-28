"""
Stats Service — provides aggregated metrics for the Admin Dashboard.
Unified within the reviews module to maintain a single source of truth for review data.
"""

import pyodbc
from typing import List, Dict, Any
from datetime import datetime, timedelta

def get_review_metrics(cursor: pyodbc.Cursor) -> Dict[str, Any]:
    """Calculate system-wide review KPIs."""
    # Total count
    cursor.execute("SELECT COUNT(*) FROM dbo.processed_review")
    total = cursor.fetchone()[0] or 0
    
    # Collected today
    cursor.execute("SELECT COUNT(*) FROM dbo.processed_review WHERE CAST(scrapedAt AS DATE) = CAST(GETUTCDATE() AS DATE)")
    today = cursor.fetchone()[0] or 0
    
    # Processed reviews (those that have been through AI analysis)
    cursor.execute("SELECT COUNT(*) FROM dbo.processed_review WHERE [status] = 'Replied'")
    processed = cursor.fetchone()[0] or 0

    # Growth (Placeholder: in a real app, you'd compare vs previous period)
    return {
        "totalReviews": total,
        "reviewsCollectedToday": today,
        "reviewsGrowth": 5.2,
        "processedReviewsCount": processed,
    }

def get_usage_trend(cursor: pyodbc.Cursor) -> List[Dict[str, Any]]:
    """Return 12-month review volume trend as list of {label, value}."""
    sql = """
        SELECT TOP 12
            FORMAT(scrapedAt, 'MMM yyyy') as label,
            COUNT(*) as value,
            YEAR(scrapedAt) as yr,
            MONTH(scrapedAt) as mn
        FROM dbo.processed_review
        WHERE scrapedAt IS NOT NULL
        GROUP BY FORMAT(scrapedAt, 'MMM yyyy'), YEAR(scrapedAt), MONTH(scrapedAt)
        ORDER BY yr DESC, mn DESC
    """
    try:
        cursor.execute(sql)
        rows = cursor.fetchall()
        # Reverse to get chronological order (oldest to newest for charts)
        return [{"label": str(row[0]), "value": int(row[1])} for row in reversed(rows)]
    except Exception:
        return []

def get_recent_activity(cursor: pyodbc.Cursor) -> List[Dict[str, Any]]:
    """Return latest admin-panel actions for the activity feed.

    Reads from ``dbo.admin_activity_log`` which is populated by the
    ``admin_activity_logger`` helper whenever an admin performs a
    mutating action in the admin panel.
    """
    # Ensure the table exists before querying
    try:
        cursor.execute(
            """
            IF NOT EXISTS (
                SELECT 1 FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'admin_activity_log'
            )
            BEGIN
                CREATE TABLE dbo.admin_activity_log (
                    id          NVARCHAR(36)   NOT NULL PRIMARY KEY DEFAULT NEWID(),
                    action_type NVARCHAR(50)   NOT NULL,
                    title       NVARCHAR(200)  NOT NULL,
                    description NVARCHAR(500)  NULL,
                    admin_user  NVARCHAR(200)  NULL,
                    created_at  DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME()
                );
            END
            """
        )
    except Exception:
        pass

    sql = """
        SELECT TOP 10
            CAST(id AS VARCHAR(36)) as id,
            action_type as [type],
            title,
            ISNULL(description, '') as description,
            CONVERT(VARCHAR(50), created_at, 126) as [timestamp],
            admin_user as [user]
        FROM dbo.admin_activity_log
        ORDER BY created_at DESC
    """
    try:
        cursor.execute(sql)
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]
    except Exception:
        return []

def get_system_alerts(cursor: pyodbc.Cursor) -> List[Dict[str, Any]]:
    """Return system alerts matching the SystemAlert frontend shape.

    Combines:
    1. Persisted alerts from ``dbo.system_alert_log`` (API failures, scraping
       errors, system issues logged by the system_alert_logger).
    2. Dynamic alerts inferred from current database state (recent sync
       failures, large unprocessed review backlogs).
    """
    from app.modules.admin.services.system_alert_logger import (
        ensure_system_alert_log_table,
    )

    alerts: List[Dict[str, Any]] = []

    # ── 1. Persisted alerts from system_alert_log ──────────────────
    try:
        ensure_system_alert_log_table(cursor)
        cursor.execute(
            """
            SELECT TOP 10
                id,
                severity   AS [type],
                title,
                message,
                CONVERT(VARCHAR(50), created_at, 126) AS [timestamp],
                is_read    AS isRead
            FROM dbo.system_alert_log
            WHERE is_dismissed = 0
            ORDER BY created_at DESC
            """
        )
        columns = [col[0] for col in cursor.description]
        for row in cursor.fetchall():
            d = dict(zip(columns, row))
            # Normalize severity → frontend type
            sev = (d.get("type") or "info").lower()
            if sev not in ("error", "warning", "info"):
                sev = "info"
            d["type"] = sev
            d["isRead"] = bool(d.get("isRead", False))
            alerts.append(d)
    except Exception:
        pass

    # ── 2. Dynamic: recent scraping sync failures (last 24 h) ──────
    try:
        cursor.execute(
            """
            SELECT TOP 5
                CAST(sl.log_id AS VARCHAR(36))                 AS id,
                ISNULL(p.platform_name, 'Unknown Platform')    AS platform,
                LEFT(sl.error_message, 300)                    AS error_msg,
                CONVERT(VARCHAR(50), sl.[timestamp], 126)      AS [timestamp]
            FROM dbo.sync_log sl
            JOIN dbo.source s   ON s.source_id  = sl.source_id
            JOIN dbo.platform p ON p.platform_id = s.platform_id
            WHERE sl.status = 'Failed'
              AND sl.[timestamp] > DATEADD(HOUR, -24, SYSUTCDATETIME())
            ORDER BY sl.[timestamp] DESC
            """
        )
        for row in cursor.fetchall():
            alert_id = f"sync-{row[0]}"
            # Skip if a persisted alert with the same dedup key exists
            if any(a["id"] == alert_id for a in alerts):
                continue
            alerts.append({
                "id": alert_id,
                "type": "error",
                "title": f"Sync Failure — {row[1]}",
                "message": row[2] or "A data sync job failed. Check the scraping logs for details.",
                "timestamp": row[3],
                "isRead": False,
            })
    except Exception:
        pass

    # ── 3. Dynamic: unprocessed review backlog ─────────────────────
    try:
        cursor.execute(
            """
            SELECT COUNT(*) FROM dbo.processed_review
            WHERE status = 'pending'
            """
        )
        pending = cursor.fetchone()[0] or 0
        if pending > 50:
            alerts.append({
                "id": "dynamic-pending-backlog",
                "type": "warning",
                "title": f"Review Processing Backlog ({pending} pending)",
                "message": (
                    f"There are {pending} reviews waiting for AI analysis. "
                    "Ensure the Gemini API key is configured and quota is available."
                ),
                "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S"),
                "isRead": False,
            })
    except Exception:
        pass

    # ── 4. Dynamic: failed reviews (retry exhausted) ───────────────
    try:
        cursor.execute(
            """
            SELECT COUNT(*) FROM dbo.processed_review
            WHERE status = 'failed'
              AND last_attempt > DATEADD(HOUR, -24, GETUTCDATE())
            """
        )
        failed = cursor.fetchone()[0] or 0
        if failed > 0:
            alerts.append({
                "id": "dynamic-failed-reviews",
                "type": "error",
                "title": f"{failed} Reviews Failed Processing",
                "message": (
                    f"{failed} reviews exhausted all retry attempts in the last 24 hours. "
                    "These reviews require manual re-processing or investigation."
                ),
                "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S"),
                "isRead": False,
            })
    except Exception:
        pass

    # Sort by timestamp descending, return top 10
    alerts.sort(key=lambda a: a.get("timestamp", ""), reverse=True)
    return alerts[:10]
