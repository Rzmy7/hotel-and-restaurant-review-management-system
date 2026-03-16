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
            SELECT u.user_id, u.full_name, u.email, u.is_active, u.last_login_at, u.created_at,
                   STRING_AGG(r.role_name, ', ') as roles
            FROM dbo.users u
            LEFT JOIN dbo.user_roles ur ON u.user_id = ur.user_id
            LEFT JOIN dbo.roles r ON ur.role_id = r.role_id
            GROUP BY u.user_id, u.full_name, u.email, u.is_active, u.last_login_at, u.created_at
            ORDER BY u.created_at DESC
        """)
        rows = cursor.fetchall()
        conn.close()
        return [{"id": str(r.user_id), "name": r.full_name or "Unknown", "email": r.email, "role": r.roles or "No Role", "status": "Active" if r.is_active else "Inactive", "lastActive": r.last_login_at.isoformat() if r.last_login_at else None, "joinedAt": r.created_at.isoformat() if r.created_at else None} for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def create_admin_user(payload: AdminUserCreatePayload):
    try:
        conn = pyodbc.connect(get_connection_string())
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM dbo.users WHERE email = ?", payload.email)
        if cursor.fetchone()[0] > 0:
            conn.close()
            raise HTTPException(status_code=400, detail="Email already exists")
        cursor.execute("INSERT INTO dbo.users (email, full_name, is_active, created_at, updated_at) OUTPUT INSERTED.user_id VALUES (?, ?, 1, GETUTCDATE(), GETUTCDATE())", payload.email, payload.name)
        new_id = cursor.fetchone()[0]
        conn.commit()
        conn.close()
        return {"message": "User created", "user": {"id": str(new_id), "name": payload.name, "email": payload.email}}
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
            sets.append("full_name = ?")
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
        cursor.execute(f"UPDATE dbo.users SET {', '.join(sets)} WHERE user_id = ?", *params)
        conn.commit()
        conn.close()
        return {"message": "User updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def delete_admin_user(user_id: str):
    try:
        conn = pyodbc.connect(get_connection_string())
        cursor = conn.cursor()
        cursor.execute("DELETE FROM dbo.users WHERE user_id = ?", user_id)
        conn.commit()
        conn.close()
        return {"message": "User deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
