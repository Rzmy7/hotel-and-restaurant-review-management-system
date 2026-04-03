"""Admin organization service."""

import pyodbc
from fastapi import HTTPException
from app.core.pyodbc_connection import get_connection_string


def _table_exists(cursor, table_name: str) -> bool:
    cursor.execute("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = ?", table_name)
    return cursor.fetchone()[0] > 0


def get_organizations():
    try:
        conn = pyodbc.connect(get_connection_string())
        cursor = conn.cursor()
        if not _table_exists(cursor, "organization"):
            conn.close()
            return []
        # Using the new singular table and columns
        cursor.execute("SELECT organization_id, organization_name, created_at FROM dbo.organization ORDER BY organization_name")
        rows = cursor.fetchall()
        conn.close()
        return [
            {
                "id": str(r.organization_id),
                "name": r.organization_name,
                "plan": "Pro", # Placeholder for now
                "memberCount": 0,
                "status": "Active",
                "createdAt": r.created_at.isoformat() if r.created_at else None
            } 
            for r in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
