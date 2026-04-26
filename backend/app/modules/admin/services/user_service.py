"""Admin user service — CRUD operations for users."""

import pyodbc
from fastapi import HTTPException
from app.core.pyodbc_connection import get_connection_string
from app.modules.admin.schemas import AdminUserCreatePayload, AdminUserUpdatePayload


def get_admin_users():
    try:
        conn = pyodbc.connect(get_connection_string())
        cursor = conn.cursor()
        cursor.execute("""
            SELECT u.user_id, 
                   LTRIM(RTRIM(COALESCE(u.first_name, '') + ' ' + COALESCE(u.last_name, ''))) as full_name, 
                   u.email, u.is_active, 
                   CAST(u.last_login_at AS NVARCHAR(50)) as last_login_at, 
                   CAST(u.created_at AS NVARCHAR(50)) as created_at,
                   r.role_name as role
            FROM dbo.[user] u
            LEFT JOIN dbo.[role] r ON u.role_id = r.role_id
            ORDER BY u.created_at DESC
        """)
        rows = cursor.fetchall()
        conn.close()
        return [
            {
                "id": str(r.user_id),
                "name": r.full_name or "Unknown",
                "email": r.email,
                "role": r.role or "No Role",
                "status": "Active" if r.is_active else "Inactive",
                "lastActive": r.last_login_at,
                "joinedAt": r.created_at,
            }
            for r in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def create_admin_user(payload: AdminUserCreatePayload):
    try:
        conn = pyodbc.connect(get_connection_string())
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM dbo.[user] WHERE email = ?", payload.email)
        if cursor.fetchone()[0] > 0:
            conn.close()
            raise HTTPException(status_code=400, detail="Email already exists")
        cursor.execute(
            "INSERT INTO dbo.[user] (email, first_name, last_name, is_active, created_at, updated_at) OUTPUT INSERTED.user_id VALUES (?, ?, '', 1, GETUTCDATE(), GETUTCDATE())",
            payload.email,
            payload.name,
        )
        new_id = cursor.fetchone()[0]
        conn.commit()
        conn.close()
        return {
            "message": "User created",
            "user": {"id": str(new_id), "name": payload.name, "email": payload.email},
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def update_admin_user(user_id: str, payload: AdminUserUpdatePayload):
    try:
        conn = pyodbc.connect(get_connection_string())
        cursor = conn.cursor()
        sets, params = [], []
        if payload.name is not None:
            sets.append("first_name = ?")
            params.append(payload.name)
        if payload.email is not None:
            sets.append("email = ?")
            params.append(payload.email)
        if payload.status is not None:
            sets.append("is_active = ?")
            params.append(1 if payload.status == "Active" else 0)
        if not sets:
            conn.close()
            return {"message": "No changes"}
        sets.append("updated_at = GETUTCDATE()")
        params.append(user_id)
        cursor.execute(
            f"UPDATE dbo.[user] SET {', '.join(sets)} WHERE user_id = ?", *params
        )
        conn.commit()
        conn.close()
        return {"message": "User updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def delete_admin_user(user_id: str):
    try:
        conn = pyodbc.connect(get_connection_string())
        cursor = conn.cursor()
        cursor.execute("DELETE FROM dbo.[user] WHERE user_id = ?", user_id)
        conn.commit()
        conn.close()
        return {"message": "User deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
