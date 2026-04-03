"""Maintenance mode routes for globally controlling user-frontend availability."""

import pyodbc
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.modules.admin.db_utils import get_connection_string
from app.modules.admin.services.system_settings_service import (
    ensure_system_settings_table,
    get_setting,
    set_setting,
)

router = APIRouter(prefix="/maintenance", tags=["Admin Maintenance"])


class MaintenanceStatusPayload(BaseModel):
    maintenanceMode: bool


def _resolve_maintenance_mode(cursor: pyodbc.Cursor) -> bool:
    value = get_setting(cursor, "maintenance_mode")
    if value is None:
        set_setting(cursor, "maintenance_mode", "false")
        return False

    return value.strip().lower() in {"1", "true", "yes", "on"}


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
            ensure_system_settings_table(cursor)

            setting_value = "true" if payload.maintenanceMode else "false"
            set_setting(cursor, "maintenance_mode", setting_value)

            connection.commit()
            return {"success": True, "maintenanceMode": payload.maintenanceMode}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to update maintenance status: {exc}") from exc
