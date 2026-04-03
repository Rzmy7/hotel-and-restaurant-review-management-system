"""
Notifications service — business logic for admin notification management.

Migrated from admin-backend/app/notifications_router.py.
"""

import uuid
from datetime import datetime

import pyodbc
from fastapi import HTTPException

from app.modules.admin.db_utils import get_connection_string, table_exists
from app.modules.auth.constants.roles import ADMIN_ROLE_ID
from app.modules.admin.services.broadcasting_service import ensure_notifications_schema


def resolve_target_user_id(cursor: pyodbc.Cursor, user_id: str | None) -> str:
    if user_id:
        try:
            return str(uuid.UUID(user_id))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid userId")

    admin_row = cursor.execute(
        f"""
        SELECT TOP 1 CAST(user_id AS NVARCHAR(36)) AS user_id
        FROM dbo.[user]
        WHERE COALESCE(role_id, 0) = {ADMIN_ROLE_ID} AND COALESCE(is_active, 0) = 1
        ORDER BY created_at DESC
        """
    ).fetchone()

    if admin_row and admin_row.user_id:
        return str(admin_row.user_id)

    fallback_row = cursor.execute(
        """
        SELECT TOP 1 CAST(user_id AS NVARCHAR(36)) AS user_id
        FROM dbo.[user]
        WHERE COALESCE(is_active, 0) = 1
        ORDER BY created_at DESC
        """
    ).fetchone()

    if fallback_row and fallback_row.user_id:
        return str(fallback_row.user_id)

    raise HTTPException(status_code=404, detail="No active user available for notifications")
