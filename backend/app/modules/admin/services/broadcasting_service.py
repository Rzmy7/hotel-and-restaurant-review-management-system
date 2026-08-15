"""
Broadcasting service — business logic for broadcast events.

Migrated from admin-backend/app/broadcasting_router.py.
"""

import uuid
from datetime import datetime
from typing import Optional

import pyodbc
from fastapi import HTTPException

from app.core.db_utils import get_connection_string, table_exists
from app.modules.auth.constants.roles import ADMIN_ROLE_ID, TENANT_ROLE_ID


# ── Schema helpers ──────────────────────────────────────────────────


def _ensure_broadcast_events_table(cursor: pyodbc.Cursor) -> None:
    cursor.execute(
        """
        IF OBJECT_ID('dbo.broadcast_event', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.broadcast_event (
                broadcast_id UNIQUEIDENTIFIER NOT NULL
                    CONSTRAINT PK_broadcast_events PRIMARY KEY
                    CONSTRAINT DF_broadcast_events_id DEFAULT NEWID(),
                subject NVARCHAR(120) NOT NULL,
                body NVARCHAR(MAX) NOT NULL,
                channel NVARCHAR(20) NOT NULL,
                audience_type NVARCHAR(20) NOT NULL,
                audience_value NVARCHAR(100) NULL,
                audience_label NVARCHAR(200) NOT NULL,
                message_type NVARCHAR(30) NOT NULL,
                recipient_count INT NOT NULL CONSTRAINT DF_broadcast_events_recipient_count DEFAULT 0,
                status NVARCHAR(20) NOT NULL CONSTRAINT DF_broadcast_events_status DEFAULT 'sent',
                schedule_type NVARCHAR(20) NOT NULL CONSTRAINT DF_broadcast_events_schedule_type DEFAULT 'now',
                scheduled_at DATETIME2(7) NULL,
                sent_at DATETIME2(7) NULL,
                sent_by NVARCHAR(255) NULL,
                created_at DATETIME2(7) NOT NULL
                    CONSTRAINT DF_broadcast_events_created_at DEFAULT SYSUTCDATETIME(),
                CONSTRAINT CK_broadcast_events_channel_valid
                    CHECK (channel IN ('email', 'notification', 'both')),
                CONSTRAINT CK_broadcast_events_audience_type_valid
                    CHECK (audience_type IN ('all', 'role', 'plan')),
                CONSTRAINT CK_broadcast_events_message_type_valid
                    CHECK (message_type IN ('info', 'warning', 'maintenance', 'announcement')),
                CONSTRAINT CK_broadcast_events_schedule_type_valid
                    CHECK (schedule_type IN ('now', 'scheduled')),
                CONSTRAINT CK_broadcast_events_status_valid
                    CHECK (status IN ('sent', 'failed', 'pending'))
            );
            CREATE INDEX IX_broadcast_events_created_at
                ON dbo.broadcast_event (created_at DESC);
        END;
        """
    )


def _ensure_notifications_schema(cursor: pyodbc.Cursor) -> None:
    cursor.execute(
        """
        IF OBJECT_ID('dbo.notification', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.notification (
                notification_id UNIQUEIDENTIFIER NOT NULL
                    CONSTRAINT PK_notifications PRIMARY KEY
                    CONSTRAINT DF_notifications_notification_id DEFAULT NEWID(),
                title NVARCHAR(200) NOT NULL,
                message NVARCHAR(MAX) NOT NULL,
                notification_type NVARCHAR(30) NOT NULL
                    CONSTRAINT DF_notifications_type DEFAULT 'info',
                created_at DATETIME2(7) NOT NULL
                    CONSTRAINT DF_notifications_created_at DEFAULT SYSUTCDATETIME(),
                CONSTRAINT CK_notifications_type_valid
                    CHECK (notification_type IN ('info', 'success', 'warning', 'error', 'maintenance', 'announcement'))
            );
            CREATE INDEX IX_notifications_created_at
                ON dbo.notification (created_at DESC);
        END;

        IF OBJECT_ID('dbo.user_notification', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.user_notification (
                notification_id UNIQUEIDENTIFIER NOT NULL,
                user_id UNIQUEIDENTIFIER NOT NULL,
                is_read BIT NOT NULL
                    CONSTRAINT DF_user_notifications_is_read DEFAULT 0,
                read_at DATETIME2(7) NULL,
                delivered_at DATETIME2(7) NOT NULL
                    CONSTRAINT DF_user_notifications_delivered_at DEFAULT SYSUTCDATETIME(),
                CONSTRAINT PK_user_notifications PRIMARY KEY (notification_id, user_id),
                CONSTRAINT FK_user_notifications_notification
                    FOREIGN KEY (notification_id)
                    REFERENCES dbo.notification(notification_id)
                    ON DELETE CASCADE,
                CONSTRAINT FK_user_notifications_user
                    FOREIGN KEY (user_id)
                    REFERENCES dbo.[user](user_id)
                    ON DELETE CASCADE
            );
            CREATE INDEX IX_user_notifications_user_read_notification
                ON dbo.user_notification (user_id, is_read, notification_id);
        END;
        """
    )


# ── Audience helpers ────────────────────────────────────────────────


def _parse_iso_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    candidate = value.strip()
    if not candidate:
        return None
    try:
        return datetime.fromisoformat(candidate.replace("Z", "+00:00"))
    except ValueError:
        return None


def _get_active_users(cursor: pyodbc.Cursor) -> list[tuple[str, bool, bool, bool, int, str]]:
    if not table_exists(cursor, "user"):
        return []

    has_tenant_and_plans = table_exists(cursor, "tenant") and table_exists(cursor, "plans")
    if has_tenant_and_plans:
        rows = cursor.execute(
            """
            SELECT
                CAST(u.user_id AS NVARCHAR(36)) AS user_id,
                CAST(COALESCE(u.is_active, 0) AS BIT) AS is_active,
                CAST(COALESCE(u.is_email_verified, 0) AS BIT) AS is_email_verified,
                CAST(COALESCE(u.is_phone_verified, 0) AS BIT) AS is_phone_verified,
                COALESCE(u.role_id, ?) AS role_id,
                COALESCE(pl.name, 'Free') AS plan_name
            FROM dbo.[user] u
            LEFT JOIN dbo.tenant t ON t.tenant_id = u.user_id
            LEFT JOIN dbo.plans pl ON pl.plan_id = TRY_CAST(t.[plan] AS INT)
            """,
            (TENANT_ROLE_ID,)
        ).fetchall()
    else:
        rows = cursor.execute(
            """
            SELECT
                CAST(u.user_id AS NVARCHAR(36)) AS user_id,
                CAST(COALESCE(u.is_active, 0) AS BIT) AS is_active,
                CAST(COALESCE(u.is_email_verified, 0) AS BIT) AS is_email_verified,
                CAST(COALESCE(u.is_phone_verified, 0) AS BIT) AS is_phone_verified,
                COALESCE(u.role_id, ?) AS role_id,
                'Free' AS plan_name
            FROM dbo.[user] u
            """,
            (TENANT_ROLE_ID,)
        ).fetchall()

    return [
        (str(row[0]), bool(row[1]), bool(row[2]), bool(row[3]), int(row[4]), str(row[5] or "Free"))
        for row in rows
    ]


def get_recipient_ids(
    cursor: pyodbc.Cursor,
    audience_type: str,
    audience_value: Optional[str],
) -> list[str]:
    users = _get_active_users(cursor)
    active_users = [user for user in users if user[1]]

    if audience_type == "all":
        return [user_id for user_id, *_ in active_users]

    if audience_type == "role":
        role_value = (audience_value or "").lower()
        if role_value == "admin":
            return [user_id for user_id, _, _, _, role_id, _ in active_users if role_id == ADMIN_ROLE_ID]
        if role_value == "user":
            return [user_id for user_id, _, _, _, role_id, _ in active_users if role_id != ADMIN_ROLE_ID]
        return []

    if audience_type == "plan":
        requested_plan = (audience_value or "").strip().lower()
        if not requested_plan:
            return []
        matched: list[str] = []
        for user_id, _, _, _, _, plan_name in active_users:
            if plan_name.strip().lower() == requested_plan:
                matched.append(user_id)
        return matched

    return []


def get_audience_label(audience_type: str, audience_value: Optional[str]) -> str:
    if audience_type == "all":
        return "All Users"
    if audience_type == "role":
        role_labels = {"admin": "Admins only", "user": "Users (non-admin)"}
        return f"Role: {role_labels.get((audience_value or '').lower(), 'Unknown')}"
    if audience_type == "plan":
        plan_name = (audience_value or "").strip()
        if not plan_name:
            return "Plan: Unknown"
        if plan_name.lower().endswith("plan"):
            return f"Plan: {plan_name.title()}"
        return f"Plan: {plan_name.title()} plan"
    return "Unknown"


def to_record(row) -> dict:
    sent_at = row.sent_at or row.scheduled_at or row.created_at

    # Ensure the datetime is serialised as a UTC ISO-8601 string with a 'Z'
    # suffix so the frontend Date parser treats it as UTC (not local time).
    def _to_utc_iso(val) -> str:
        if not val:
            return ""
        if isinstance(val, str):
            s = val.strip().replace(" ", "T")
            # Strip trailing fractional zeros from MSSQL CAST output
            if "." in s:
                s = s.rstrip("0").rstrip(".")
            if not s.endswith("Z") and "+" not in s and "-" not in s[10:]:
                s += "Z"
            return s
        # datetime object
        return val.isoformat() + "Z"

    return {
        "id": str(row.broadcast_id),
        "subject": row.subject,
        "body": row.body,
        "channel": row.channel,
        "audienceType": row.audience_type,
        "audienceLabel": row.audience_label,
        "messageType": row.message_type,
        "recipientCount": int(row.recipient_count or 0),
        "status": row.status,
        "sentAt": _to_utc_iso(sent_at),
        "sentBy": row.sent_by or "Admin User",
    }


def create_notifications(
    cursor: pyodbc.Cursor,
    recipient_ids: list[str],
    subject: str,
    body: str,
    message_type: str,
    created_at: datetime,
) -> None:
    if not recipient_ids:
        return

    notification_id = str(uuid.uuid4())

    cursor.execute(
        """
        INSERT INTO dbo.notification (
            notification_id, title, message, notification_type, created_at
        )
        VALUES (?, ?, ?, ?, ?)
        """,
        (notification_id, subject, body, message_type, created_at),
    )

    rows = [
        (notification_id, recipient_id, 0, None)
        for recipient_id in recipient_ids
    ]

    cursor.executemany(
        """
        INSERT INTO dbo.user_notification (
            notification_id, user_id, is_read, read_at
        )
        VALUES (?, ?, ?, ?)
        """,
        rows,
    )


# Public exports for route handlers
ensure_broadcast_events_table = _ensure_broadcast_events_table
ensure_notifications_schema = _ensure_notifications_schema
