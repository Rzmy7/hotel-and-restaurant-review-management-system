import os
import uuid
from datetime import datetime

import pyodbc
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Query

load_dotenv()

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


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


def _resolve_target_user_id(cursor: pyodbc.Cursor, user_id: str | None) -> str:
    if user_id:
        try:
            return str(uuid.UUID(user_id))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid userId")

    admin_row = cursor.execute(
        """
        SELECT TOP 1 CAST(user_id AS NVARCHAR(36)) AS user_id
        FROM dbo.users
        WHERE COALESCE(is_super_admin, 0) = 1 AND COALESCE(is_active, 0) = 1
        ORDER BY created_at DESC
        """
    ).fetchone()

    if admin_row and admin_row.user_id:
        return str(admin_row.user_id)

    fallback_row = cursor.execute(
        """
        SELECT TOP 1 CAST(user_id AS NVARCHAR(36)) AS user_id
        FROM dbo.users
        WHERE COALESCE(is_active, 0) = 1
        ORDER BY created_at DESC
        """
    ).fetchone()

    if fallback_row and fallback_row.user_id:
        return str(fallback_row.user_id)

    raise HTTPException(status_code=404, detail="No active user available for notifications")


@router.get("/admin")
def get_admin_notifications(
    userId: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
) -> dict:
    connection = pyodbc.connect(_connection_string())
    try:
        cursor = connection.cursor()
        _ensure_notifications_table(cursor)

        target_user_id = _resolve_target_user_id(cursor, userId)
        safe_limit = max(1, min(limit, 100))

        rows = cursor.execute(
            f"""
            SELECT TOP {safe_limit}
                CAST(notification_id AS NVARCHAR(36)) AS notification_id,
                CAST(user_id AS NVARCHAR(36)) AS user_id,
                title,
                message,
                notification_type,
                CAST(COALESCE(is_read, 0) AS BIT) AS is_read,
                created_at,
                read_at
            FROM dbo.notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
            """,
            target_user_id,
        ).fetchall()

        notifications = [
            {
                "notification_id": str(row.notification_id),
                "user_id": str(row.user_id),
                "title": str(row.title or ""),
                "message": str(row.message or ""),
                "notification_type": str(row.notification_type or "info"),
                "is_read": bool(row.is_read),
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "read_at": row.read_at.isoformat() if row.read_at else None,
            }
            for row in rows
        ]

        return {
            "userId": target_user_id,
            "notifications": notifications,
        }
    finally:
        connection.close()


@router.get("/admin/unread-count")
def get_admin_unread_count(userId: str | None = Query(None)) -> dict:
    connection = pyodbc.connect(_connection_string())
    try:
        cursor = connection.cursor()
        _ensure_notifications_table(cursor)

        target_user_id = _resolve_target_user_id(cursor, userId)

        row = cursor.execute(
            """
            SELECT COUNT(*)
            FROM dbo.notifications
            WHERE user_id = ? AND COALESCE(is_read, 0) = 0
            """,
            target_user_id,
        ).fetchone()

        return {
            "userId": target_user_id,
            "count": int(row[0] or 0),
        }
    finally:
        connection.close()


@router.post("/{notification_id}/read")
def mark_notification_read(notification_id: str, userId: str | None = Query(None)) -> dict:
    try:
        parsed_notification_id = str(uuid.UUID(notification_id))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid notification id")

    connection = pyodbc.connect(_connection_string())
    try:
        cursor = connection.cursor()
        _ensure_notifications_table(cursor)

        target_user_id = _resolve_target_user_id(cursor, userId)

        row = cursor.execute(
            """
            SELECT 1
            FROM dbo.notifications
            WHERE notification_id = ? AND user_id = ?
            """,
            parsed_notification_id,
            target_user_id,
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Notification not found")

        cursor.execute(
            """
            UPDATE dbo.notifications
            SET is_read = 1,
                read_at = ?
            WHERE notification_id = ? AND user_id = ?
            """,
            datetime.utcnow(),
            parsed_notification_id,
            target_user_id,
        )
        connection.commit()

        return {
            "success": True,
            "message": "Notification marked as read",
        }
    except HTTPException:
        connection.rollback()
        raise
    finally:
        connection.close()


@router.post("/admin/read-all")
def mark_all_admin_notifications_read(userId: str | None = Query(None)) -> dict:
    connection = pyodbc.connect(_connection_string())
    try:
        cursor = connection.cursor()
        _ensure_notifications_table(cursor)

        target_user_id = _resolve_target_user_id(cursor, userId)
        now_utc = datetime.utcnow()

        cursor.execute(
            """
            UPDATE dbo.notifications
            SET is_read = 1,
                read_at = ?
            WHERE user_id = ? AND COALESCE(is_read, 0) = 0
            """,
            now_utc,
            target_user_id,
        )

        updated_count = int(cursor.rowcount or 0)
        connection.commit()

        return {
            "success": True,
            "updated": updated_count,
            "message": "Notifications marked as read",
        }
    finally:
        connection.close()
