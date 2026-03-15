"""
Admin endpoints: organizations, users CRUD, admin dashboard.

Moved from routers/admin.py.
"""

from fastapi import APIRouter

from app.modules.admin.schemas import AdminUserCreatePayload, AdminUserUpdatePayload
from app.modules.admin.service import (
    get_organizations as get_orgs,
    get_admin_users as get_users,
    create_admin_user as create_user,
    update_admin_user as update_user,
    delete_admin_user as delete_user,
    get_dashboard_stats as get_stats,
    generate_ai_insights as get_insights,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/organizations")
def get_organizations():
    return get_orgs()


@router.get("/users")
def get_admin_users():
    return get_users()


@router.post("/users")
def create_admin_user(payload: AdminUserCreatePayload):
    return create_user(payload)


@router.put("/users/{user_id}")
def update_admin_user(user_id: str, payload: AdminUserUpdatePayload):
    return update_user(user_id, payload)


@router.delete("/users/{user_id}")
def delete_admin_user(user_id: str):
    return delete_user(user_id)


@router.get("/dashboard")
def admin_dashboard():
    return get_stats()


@router.get("/insights")
def admin_ai_insights():
    return get_insights()
