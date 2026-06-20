"""
Notifications routes — admin notification management.

Migrated from admin-backend/app/notifications_router.py.
"""

import uuid
from datetime import datetime

import pyodbc
from fastapi import APIRouter, HTTPException, Query

from app.core.db_utils import get_connection_string
from app.modules.admin.services.broadcasting_service import ensure_notifications_schema
from app.modules.admin.services.notifications_service import resolve_target_user_id

router = APIRouter(prefix="/notifications", tags=["Admin - Settings"])


@router.get("/")
def get_admin_notifications(
    userId: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
) -> dict:
    connection = pyodbc.connect(get_connection_string())
    try:
        cursor = connection.cursor()
        ensure_notifications_schema(cursor)

        target_user_id = resolve_target_user_id(cursor, userId)
        safe_limit = max(1, min(limit, 100))

        rows = cursor.execute(
            f"""
            SELECT TOP {safe_limit}
                CAST(un.notification_id AS NVARCHAR(36)) AS notification_id,
                CAST(un.user_id AS NVARCHAR(36)) AS user_id,
                n.title,
                n.message,
                n.notification_type,
                CAST(COALESCE(un.is_read, 0) AS BIT) AS is_read,
                CAST(n.created_at AS DATETIME) AS created_at,
                CAST(un.read_at AS DATETIME) AS read_at
            FROM dbo.user_notification AS un
            INNER JOIN dbo.notification AS n
                ON n.notification_id = un.notification_id
            WHERE un.user_id = ?
            ORDER BY n.created_at DESC
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


@router.get("/paginated")
def get_paginated_admin_notifications(
    userId: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
) -> dict:
    connection = pyodbc.connect(get_connection_string())
    try:
        cursor = connection.cursor()
        ensure_notifications_schema(cursor)

        target_user_id = resolve_target_user_id(cursor, userId)
        offset = (page - 1) * limit

        # Get total count
        count_row = cursor.execute(
            """
            SELECT COUNT(*)
            FROM dbo.user_notification
            WHERE user_id = ?
            """,
            target_user_id,
        ).fetchone()
        total = int(count_row[0] if count_row else 0)

        # Get paginated data
        rows = cursor.execute(
            f"""
            SELECT
                CAST(un.notification_id AS NVARCHAR(36)) AS notification_id,
                CAST(un.user_id AS NVARCHAR(36)) AS user_id,
                n.title,
                n.message,
                n.notification_type,
                CAST(COALESCE(un.is_read, 0) AS BIT) AS is_read,
                CAST(n.created_at AS DATETIME) AS created_at,
                CAST(un.read_at AS DATETIME) AS read_at
            FROM dbo.user_notification AS un
            INNER JOIN dbo.notification AS n
                ON n.notification_id = un.notification_id
            WHERE un.user_id = ?
            ORDER BY n.created_at DESC
            OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
            """,
            target_user_id,
            offset,
            limit,
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
            "data": notifications,
            "total": total,
            "page": page,
            "limit": limit
        }
    finally:
        connection.close()


@router.get("/unread-count")
def get_admin_unread_count(userId: str | None = Query(None)) -> dict:
    connection = pyodbc.connect(get_connection_string())
    try:
        cursor = connection.cursor()
        ensure_notifications_schema(cursor)

        target_user_id = resolve_target_user_id(cursor, userId)

        row = cursor.execute(
            """
            SELECT COUNT(*)
            FROM dbo.user_notification
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

    connection = pyodbc.connect(get_connection_string())
    try:
        cursor = connection.cursor()
        ensure_notifications_schema(cursor)

        target_user_id = resolve_target_user_id(cursor, userId)

        row = cursor.execute(
            """
            SELECT 1
            FROM dbo.user_notification
            WHERE notification_id = ? AND user_id = ?
            """,
            parsed_notification_id,
            target_user_id,
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Notification not found")

        cursor.execute(
            """
            UPDATE dbo.user_notification
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


@router.post("/read-all")
def mark_all_admin_notifications_read(userId: str | None = Query(None)) -> dict:
    connection = pyodbc.connect(get_connection_string())
    try:
        cursor = connection.cursor()
        ensure_notifications_schema(cursor)

        target_user_id = resolve_target_user_id(cursor, userId)
        now_utc = datetime.utcnow()

        cursor.execute(
            """
            UPDATE dbo.user_notification
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


@router.delete("/read-all")
def delete_all_read_notifications(userId: str | None = Query(None)) -> dict:
    """Delete all read notifications for the user."""
    connection = pyodbc.connect(get_connection_string())
    try:
        cursor = connection.cursor()
        ensure_notifications_schema(cursor)

        target_user_id = resolve_target_user_id(cursor, userId)

        cursor.execute(
            """
            DELETE FROM dbo.user_notification
            WHERE user_id = ? AND COALESCE(is_read, 0) = 1
            """,
            target_user_id,
        )

        deleted_count = int(cursor.rowcount or 0)
        connection.commit()

        return {
            "success": True,
            "deleted": deleted_count,
            "message": "Read notifications cleared",
        }
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting notifications: {exc}")
    finally:
        connection.close()


@router.delete("/{notification_id}")
def delete_notification(notification_id: str, userId: str | None = Query(None)) -> dict:
    """Delete a specific notification for the user."""
    try:
        parsed_notification_id = str(uuid.UUID(notification_id))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid notification id")

    connection = pyodbc.connect(get_connection_string())
    try:
        cursor = connection.cursor()
        ensure_notifications_schema(cursor)

        target_user_id = resolve_target_user_id(cursor, userId)

        row = cursor.execute(
            """
            SELECT 1
            FROM dbo.user_notification
            WHERE notification_id = ? AND user_id = ?
            """,
            parsed_notification_id,
            target_user_id,
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Notification not found")

        cursor.execute(
            """
            DELETE FROM dbo.user_notification
            WHERE notification_id = ? AND user_id = ?
            """,
            parsed_notification_id,
            target_user_id,
        )
        connection.commit()

        return {
            "success": True,
            "message": "Notification deleted",
        }
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting notification: {exc}")
    finally:
        connection.close()
