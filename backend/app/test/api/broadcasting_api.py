import os
import uuid
from datetime import datetime
from typing import Literal, Optional

import pyodbc
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field

load_dotenv()

router = APIRouter(prefix="/api/broadcasting", tags=["broadcasting"])


class BroadcastCreate(BaseModel):
    subject: str = Field(..., min_length=1, max_length=120)
    body: str = Field(..., min_length=1, max_length=5000)
    channel: Literal["email", "notification", "both"]
    audienceType: Literal["all", "role", "plan"]
    audienceValue: Optional[str] = None
    messageType: Literal["info", "warning", "maintenance", "announcement"]
    scheduleType: Literal["now", "scheduled"]
    scheduledAt: Optional[str] = None


class EstimatedRecipientsResponse(BaseModel):
    count: int


class StatisticsResponse(BaseModel):
    total: int
    sent: int
    scheduled: int
    failed: int


def _connection_string() -> str:
    server = os.getenv("DB_SERVER")
    database = os.getenv("DB_NAME")
    uid = os.getenv("DB_UID")
    pwd = os.getenv("DB_PWD")
    driver = os.getenv("DB_DRIVER", "ODBC Driver 17 for SQL Server")

    missing = [
        name
        for name, value in {
            "DB_SERVER": server,
            "DB_NAME": database,
            "DB_UID": uid,
            "DB_PWD": pwd,
        }.items()
        if not value
    ]
    if missing:
        raise HTTPException(status_code=500, detail=f"Missing DB config: {', '.join(missing)}")

    return (
        f"DRIVER={{{driver}}};"
        f"SERVER={server};"
        f"DATABASE={database};"
        f"UID={uid};"
        f"PWD={pwd};"
        "TrustServerCertificate=yes;"
    )


def _table_exists(cursor: pyodbc.Cursor, table_name: str, schema: str = "dbo") -> bool:
    row = cursor.execute(
        """
        SELECT 1
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        """,
        schema,
        table_name,
    ).fetchone()
    return row is not None


def _ensure_broadcast_events_table(cursor: pyodbc.Cursor) -> None:
    cursor.execute(
        """
        IF OBJECT_ID('dbo.broadcast_events', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.broadcast_events (
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
                ON dbo.broadcast_events (created_at DESC);
        END;
        """
    )


def _ensure_notifications_table(cursor: pyodbc.Cursor) -> None:
    cursor.execute(
        """
        IF OBJECT_ID('dbo.notifications', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.notifications (
                notification_id UNIQUEIDENTIFIER NOT NULL
                    CONSTRAINT PK_notifications PRIMARY KEY
                    CONSTRAINT DF_notifications_notification_id DEFAULT NEWID(),
                user_id UNIQUEIDENTIFIER NOT NULL,
                title NVARCHAR(200) NOT NULL,
                message NVARCHAR(MAX) NOT NULL,
                notification_type NVARCHAR(30) NOT NULL
                    CONSTRAINT DF_notifications_type DEFAULT 'info',
                is_read BIT NOT NULL
                    CONSTRAINT DF_notifications_is_read DEFAULT 0,
                created_at DATETIME2(7) NOT NULL
                    CONSTRAINT DF_notifications_created_at DEFAULT SYSUTCDATETIME(),
                read_at DATETIME2(7) NULL,
                CONSTRAINT FK_notifications_users
                    FOREIGN KEY (user_id)
                    REFERENCES dbo.users(user_id)
                    ON DELETE CASCADE,
                CONSTRAINT CK_notifications_type_valid
                    CHECK (notification_type IN ('info', 'success', 'warning', 'error', 'maintenance', 'announcement'))
            );

            CREATE INDEX IX_notifications_user_read_created
                ON dbo.notifications (user_id, is_read, created_at DESC);
        END;
        """
    )


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


def _derive_plan_bucket(is_admin: bool, is_email_verified: bool, is_phone_verified: bool) -> str:
    if is_admin:
        return "enterprise"
    if is_email_verified and is_phone_verified:
        return "professional"
    if is_email_verified:
        return "starter"
    return "free"


def _get_active_users(cursor: pyodbc.Cursor) -> list[tuple[str, bool, bool, bool, bool]]:
    if not _table_exists(cursor, "users"):
        return []

    rows = cursor.execute(
        """
        SELECT
            CAST(user_id AS NVARCHAR(36)) AS user_id,
            CAST(COALESCE(is_active, 0) AS BIT) AS is_active,
            CAST(COALESCE(is_email_verified, 0) AS BIT) AS is_email_verified,
            CAST(COALESCE(is_phone_verified, 0) AS BIT) AS is_phone_verified,
            CAST(COALESCE(is_super_admin, 0) AS BIT) AS is_super_admin
        FROM dbo.users
        """
    ).fetchall()

    return [
        (
            str(row[0]),
            bool(row[1]),
            bool(row[2]),
            bool(row[3]),
            bool(row[4]),
        )
        for row in rows
    ]


def _get_recipient_ids(
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
            return [user_id for user_id, _, _, _, is_super_admin in active_users if is_super_admin]
        if role_value == "user":
            return [user_id for user_id, _, _, _, is_super_admin in active_users if not is_super_admin]
        return []

    if audience_type == "plan":
        requested_plan = (audience_value or "").lower()
        if requested_plan not in {"free", "starter", "professional", "enterprise"}:
            return []

        matched: list[str] = []
        for user_id, _, is_email_verified, is_phone_verified, is_super_admin in active_users:
            plan_bucket = _derive_plan_bucket(
                is_admin=is_super_admin,
                is_email_verified=is_email_verified,
                is_phone_verified=is_phone_verified,
            )
            if plan_bucket == requested_plan:
                matched.append(user_id)
        return matched

    return []


def _get_audience_label(audience_type: str, audience_value: Optional[str]) -> str:
    if audience_type == "all":
        return "All Users"
    if audience_type == "role":
        role_labels = {"admin": "Admins only", "user": "Users (non-admin)"}
        return f"Role: {role_labels.get((audience_value or '').lower(), 'Unknown')}"
    if audience_type == "plan":
        plan_labels = {
            "free": "Free plan",
            "starter": "Starter plan",
            "professional": "Professional plan",
            "enterprise": "Enterprise plan",
        }
        return f"Plan: {plan_labels.get((audience_value or '').lower(), 'Unknown')}"
    return "Unknown"


def _to_record(row) -> dict:
    sent_at = row.sent_at or row.scheduled_at or row.created_at
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
        "sentAt": sent_at.isoformat() if sent_at else "",
        "sentBy": row.sent_by or "Admin User",
    }


def _create_notifications(
    cursor: pyodbc.Cursor,
    recipient_ids: list[str],
    subject: str,
    body: str,
    message_type: str,
    created_at: datetime,
) -> None:
    if not recipient_ids:
        return

    rows = [
        (
            str(uuid.uuid4()),
            recipient_id,
            subject,
            body,
            message_type,
            0,
            created_at,
            None,
        )
        for recipient_id in recipient_ids
    ]

    cursor.executemany(
        """
        INSERT INTO dbo.notifications (
            notification_id,
            user_id,
            title,
            message,
            notification_type,
            is_read,
            created_at,
            read_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        rows,
    )


@router.post("/send")
def send_broadcast(payload: BroadcastCreate, request: Request) -> dict:
    admin_identifier = request.headers.get("x-admin-user", "Admin User")

    connection = pyodbc.connect(_connection_string())
    try:
        cursor = connection.cursor()
        _ensure_broadcast_events_table(cursor)
        _ensure_notifications_table(cursor)

        recipient_ids = _get_recipient_ids(cursor, payload.audienceType, payload.audienceValue)
        recipient_count = len(recipient_ids)
        audience_label = _get_audience_label(payload.audienceType, payload.audienceValue)

        now_utc = datetime.utcnow()
        scheduled_at = _parse_iso_datetime(payload.scheduledAt)
        status = "pending" if payload.scheduleType == "scheduled" else "sent"
        sent_at = scheduled_at if status == "pending" else now_utc

        broadcast_id = str(uuid.uuid4())
        cursor.execute(
            """
            INSERT INTO dbo.broadcast_events (
                broadcast_id,
                subject,
                body,
                channel,
                audience_type,
                audience_value,
                audience_label,
                message_type,
                recipient_count,
                status,
                schedule_type,
                scheduled_at,
                sent_at,
                sent_by,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                broadcast_id,
                payload.subject,
                payload.body,
                payload.channel,
                payload.audienceType,
                payload.audienceValue,
                audience_label,
                payload.messageType,
                recipient_count,
                status,
                payload.scheduleType,
                scheduled_at,
                sent_at,
                admin_identifier,
                now_utc,
            ),
        )

        if status == "sent" and payload.channel in {"notification", "both"}:
            _create_notifications(
                cursor,
                recipient_ids,
                payload.subject,
                payload.body,
                payload.messageType,
                now_utc,
            )

        connection.commit()

        return {
            "success": True,
            "broadcastId": broadcast_id,
            "message": f"Broadcast {status} for {recipient_count} recipients",
        }
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Error sending broadcast: {exc}")
    finally:
        connection.close()


@router.get("/estimate-recipients", response_model=EstimatedRecipientsResponse)
def estimate_recipients(
    audienceType: str = Query(...),
    audienceValue: str | None = Query(None),
) -> EstimatedRecipientsResponse:
    connection = pyodbc.connect(_connection_string())
    try:
        cursor = connection.cursor()
        recipient_ids = _get_recipient_ids(cursor, audienceType, audienceValue)
        return EstimatedRecipientsResponse(count=len(recipient_ids))
    finally:
        connection.close()


@router.get("/statistics", response_model=StatisticsResponse)
def get_statistics() -> StatisticsResponse:
    connection = pyodbc.connect(_connection_string())
    try:
        cursor = connection.cursor()
        _ensure_broadcast_events_table(cursor)
        row = cursor.execute(
            """
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS scheduled,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
            FROM dbo.broadcast_events
            """
        ).fetchone()

        return StatisticsResponse(
            total=int(row[0] or 0),
            sent=int(row[1] or 0),
            scheduled=int(row[2] or 0),
            failed=int(row[3] or 0),
        )
    finally:
        connection.close()


@router.get("/history")
def get_history() -> list[dict]:
    connection = pyodbc.connect(_connection_string())
    try:
        cursor = connection.cursor()
        _ensure_broadcast_events_table(cursor)
        rows = cursor.execute(
            """
            SELECT
                broadcast_id,
                subject,
                body,
                channel,
                audience_type,
                audience_value,
                audience_label,
                message_type,
                recipient_count,
                status,
                schedule_type,
                scheduled_at,
                sent_at,
                sent_by,
                created_at
            FROM dbo.broadcast_events
            ORDER BY created_at DESC
            """
        ).fetchall()

        return [_to_record(row) for row in rows]
    finally:
        connection.close()


@router.get("/{broadcast_id}")
def get_broadcast_detail(broadcast_id: str) -> dict:
    try:
        parsed_id = str(uuid.UUID(broadcast_id))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid broadcast id")

    connection = pyodbc.connect(_connection_string())
    try:
        cursor = connection.cursor()
        _ensure_broadcast_events_table(cursor)
        row = cursor.execute(
            """
            SELECT
                broadcast_id,
                subject,
                body,
                channel,
                audience_type,
                audience_value,
                audience_label,
                message_type,
                recipient_count,
                status,
                schedule_type,
                scheduled_at,
                sent_at,
                sent_by,
                created_at
            FROM dbo.broadcast_events
            WHERE broadcast_id = ?
            """,
            parsed_id,
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Broadcast not found")
        return _to_record(row)
    finally:
        connection.close()


@router.post("/{broadcast_id}/resend")
def resend_broadcast(broadcast_id: str) -> dict:
    try:
        parsed_id = str(uuid.UUID(broadcast_id))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid broadcast id")

    connection = pyodbc.connect(_connection_string())
    try:
        cursor = connection.cursor()
        _ensure_broadcast_events_table(cursor)
        _ensure_notifications_table(cursor)

        event = cursor.execute(
            """
            SELECT
                subject,
                body,
                channel,
                audience_type,
                audience_value,
                message_type
            FROM dbo.broadcast_events
            WHERE broadcast_id = ?
            """,
            parsed_id,
        ).fetchone()

        if not event:
            raise HTTPException(status_code=404, detail="Broadcast not found")

        recipient_ids = _get_recipient_ids(cursor, str(event.audience_type), str(event.audience_value) if event.audience_value is not None else None)
        now_utc = datetime.utcnow()

        if str(event.channel) in {"notification", "both"}:
            _create_notifications(
                cursor,
                recipient_ids,
                str(event.subject),
                str(event.body),
                str(event.message_type),
                now_utc,
            )

        cursor.execute(
            """
            UPDATE dbo.broadcast_events
            SET status = 'sent',
                sent_at = ?,
                recipient_count = ?,
                schedule_type = 'now'
            WHERE broadcast_id = ?
            """,
            now_utc,
            len(recipient_ids),
            parsed_id,
        )

        connection.commit()
        return {
            "success": True,
            "message": f"Broadcast resent to {len(recipient_ids)} recipients",
        }
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Error resending broadcast: {exc}")
    finally:
        connection.close()


@router.post("/{broadcast_id}/cancel")
def cancel_broadcast(broadcast_id: str) -> dict:
    try:
        parsed_id = str(uuid.UUID(broadcast_id))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid broadcast id")

    connection = pyodbc.connect(_connection_string())
    try:
        cursor = connection.cursor()
        _ensure_broadcast_events_table(cursor)

        row = cursor.execute(
            """
            SELECT status
            FROM dbo.broadcast_events
            WHERE broadcast_id = ?
            """,
            parsed_id,
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Broadcast not found")

        if str(row.status) != "pending":
            return {
                "success": False,
                "message": "Only scheduled/pending broadcasts can be cancelled",
            }

        cursor.execute(
            """
            UPDATE dbo.broadcast_events
            SET status = 'failed'
            WHERE broadcast_id = ?
            """,
            parsed_id,
        )
        connection.commit()

        return {
            "success": True,
            "message": "Broadcast cancelled",
        }
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Error cancelling broadcast: {exc}")
    finally:
        connection.close()
