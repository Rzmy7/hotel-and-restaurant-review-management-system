"""Admin user management routes."""
from fastapi import APIRouter, HTTPException
from app.modules.admin.schemas import AdminUserCreatePayload, AdminUserUpdatePayload
from app.modules.admin.services.user_service import get_admin_users, create_admin_user, update_admin_user, delete_admin_user

router = APIRouter(prefix="/users", tags=["Admin Users"])

@router.get("/")
def list_users():
    return get_admin_users()

@router.post("/")
def create_user(payload: AdminUserCreatePayload):
    return create_admin_user(payload)

@router.put("/{user_id}")
def update_user(user_id: str, payload: AdminUserUpdatePayload):
    return update_admin_user(user_id, payload)

@router.delete("/{user_id}")
def delete_user(user_id: str):
    return delete_admin_user(user_id)
