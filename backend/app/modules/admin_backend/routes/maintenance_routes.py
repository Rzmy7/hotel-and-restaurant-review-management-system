"""Maintenance mode routes for globally controlling user-frontend availability."""

import pyodbc
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.modules.admin_backend.db_utils import get_connection_string

router = APIRouter(prefix="/api/maintenance", tags=["Maintenance"])


class MaintenanceStatusPayload(BaseModel):
    maintenanceMode: bool


def _ensure_system_settings_table(cursor: pyodbc.Cursor) -> None:
    cursor.execute(
        """
        IF OBJECT_ID('dbo.system_settings', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.system_settings (
                setting_key NVARCHAR(100) NOT NULL
                    CONSTRAINT PK_system_settings PRIMARY KEY,
                setting_value NVARCHAR(255) NOT NULL,
                updated_at DATETIME2(7) NOT NULL
                    CONSTRAINT DF_system_settings_updated_at DEFAULT SYSUTCDATETIME()
            );
        END;
        """
    )


def _resolve_maintenance_mode(cursor: pyodbc.Cursor) -> bool:
    _ensure_system_settings_table(cursor)

    row = cursor.execute(
        """
        SELECT setting_value
        FROM dbo.system_settings
        WHERE setting_key = 'maintenance_mode'
        """
    ).fetchone()

    if not row:
        cursor.execute(
            """
            INSERT INTO dbo.system_settings (setting_key, setting_value)
            VALUES ('maintenance_mode', 'false')
            """
        )
        return False

    value = str(row[0] or "").strip().lower()
    return value in {"1", "true", "yes", "on"}


@router.get("/status")
def get_maintenance_status() -> dict:
    try:
        with pyodbc.connect(get_connection_string()) as connection:
            cursor = connection.cursor()
            maintenance_mode = _resolve_maintenance_mode(cursor)
            connection.commit()
            return {"maintenanceMode": maintenance_mode}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to get maintenance status: {exc}") from exc


@router.patch("/status")
def update_maintenance_status(payload: MaintenanceStatusPayload) -> dict:
    try:
        with pyodbc.connect(get_connection_string()) as connection:
            cursor = connection.cursor()
            _ensure_system_settings_table(cursor)

            setting_value = "true" if payload.maintenanceMode else "false"
            cursor.execute(
                """
                IF EXISTS (SELECT 1 FROM dbo.system_settings WHERE setting_key = 'maintenance_mode')
                BEGIN
                    UPDATE dbo.system_settings
                    SET setting_value = ?, updated_at = SYSUTCDATETIME()
                    WHERE setting_key = 'maintenance_mode'
                END
                ELSE
                BEGIN
                    INSERT INTO dbo.system_settings (setting_key, setting_value)
                    VALUES ('maintenance_mode', ?)
                END
                """,
                (setting_value, setting_value),
            )

            connection.commit()
            return {"success": True, "maintenanceMode": payload.maintenanceMode}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to update maintenance status: {exc}") from exc
