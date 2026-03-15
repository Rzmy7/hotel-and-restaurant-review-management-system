"""
Permission guards — consolidated from auth/auth_permissions.py + auth_permissions.py.

Contains both system-level role checks (admin, tenant) and
group-level role checks (group manager, group member).
"""

from fastapi import Depends, HTTPException, status

from app.constants.roles import SYSTEM_ADMIN, TENANT
from app.auth.dependencies import get_current_user
from app.repositories.groups_repo import get_user_group_role


# ── System-level permissions ────────────────────────────────────────

def require_admin(current_user=Depends(get_current_user)):
    """Require SYSTEM_ADMIN role."""
    if current_user["role"] != SYSTEM_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


def require_tenant(current_user=Depends(get_current_user)):
    """Require TENANT role."""
    if current_user["role"] != TENANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant access required",
        )
    return current_user


def require_admin_or_tenant(current_user=Depends(get_current_user)):
    """Require either SYSTEM_ADMIN or TENANT role."""
    if current_user["role"] not in {SYSTEM_ADMIN, TENANT}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    return current_user


# ── Group-level permissions ─────────────────────────────────────────

def require_group_manager(group_id, current_user, db):
    """Require GROUP_MANAGER role for a specific group."""
    role = get_user_group_role(db, group_id, current_user["user_id"])
    if role != "GROUP_MANAGER":
        raise HTTPException(status_code=403, detail="Not group manager")


def require_group_member(group_id, current_user, db):
    """Require at least GROUP_MEMBER role for a specific group."""
    role = get_user_group_role(db, group_id, current_user["user_id"])
    if role not in ["GROUP_MANAGER", "GROUP_MEMBER"]:
        raise HTTPException(status_code=403, detail="Not group member")
