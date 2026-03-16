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
        if not _table_exists(cursor, "Organizations"):
            conn.close()
            return []
        cursor.execute("SELECT id, name, plan, memberCount, status, createdAt FROM dbo.Organizations ORDER BY name")
        rows = cursor.fetchall()
        conn.close()
        return [{"id": r.id, "name": r.name, "plan": r.plan, "memberCount": r.memberCount, "status": r.status, "createdAt": r.createdAt.isoformat() if r.createdAt else None} for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
