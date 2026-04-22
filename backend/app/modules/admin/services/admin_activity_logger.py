"""
Admin Activity Logger — fire-and-forget logging of admin-panel actions.

Every mutating admin endpoint calls ``log_admin_activity`` after a successful
operation. The helper opens its own DB connection so caller transactions are
never affected. Failures are silently swallowed — activity logging must never
break the primary workflow.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime
from typing import Optional

import pyodbc

from app.core.db_utils import get_connection_string

logger = logging.getLogger("admin_activity_logger")

# ── Table bootstrap ────────────────────────────────────────────────


def ensure_admin_activity_log_table(cursor: pyodbc.Cursor) -> None:
    """Create ``dbo.admin_activity_log`` if it does not already exist."""
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
            CREATE NONCLUSTERED INDEX IX_admin_activity_log_created
                ON dbo.admin_activity_log (created_at DESC);
        END
        """
    )


# ── Public API ─────────────────────────────────────────────────────


def log_admin_activity(
    action_type: str,
    title: str,
    description: str = "",
    admin_user: Optional[str] = None,
) -> None:
    """
    Insert a row into ``dbo.admin_activity_log``.

    Opens a **dedicated** connection so the caller's transaction is never
    disturbed.  Wrapped in a blanket ``except`` — logging must never raise.

    Parameters
    ----------
    action_type:
        One of the ``RecentActivity.type`` literals used on the frontend
        (e.g. ``"user_joined"``, ``"settings_updated"``, ``"subscription_changed"``).
    title:
        Short human-readable headline shown in the activity feed.
    description:
        Optional extra detail shown below the title.
    admin_user:
        E-mail or display-name of the admin who performed the action.
    """
    try:
        conn = pyodbc.connect(get_connection_string())
        try:
            cursor = conn.cursor()
            ensure_admin_activity_log_table(cursor)
            cursor.execute(
                """
                INSERT INTO dbo.admin_activity_log
                    (id, action_type, title, description, admin_user, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid.uuid4()),
                    action_type,
                    title[:200],
                    (description or "")[:500],
                    (admin_user or "System Admin")[:200],
                    datetime.utcnow(),
                ),
            )
            conn.commit()
        finally:
            conn.close()
    except Exception as exc:
        logger.warning("Failed to log admin activity (%s): %s", title, exc)
