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
    
    # Growth (Placeholder: in a real app, you'd compare vs previous period)
    return {
        "totalReviews": total,
        "reviewsCollectedToday": today,
        "reviewsGrowth": 5.2
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
    """Report recent sync failures as system alerts."""
    sql = """
        SELECT TOP 5
            CAST(log_id AS VARCHAR(36)) as id,
            'Sync Failure' as type,
            'High' as severity,
            LEFT(error_message, 100) as message,
            [timestamp] as [timestamp]
        FROM dbo.sync_log
        WHERE status = 'Failed'
        ORDER BY [timestamp] DESC
    """
    try:
        cursor.execute(sql)
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]
    except Exception:
        return []
