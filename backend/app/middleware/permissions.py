"""
Permission guards — system-level and group-level RBAC.

Cross-cutting concern: used by multiple domain modules.
"""

from fastapi import Depends, HTTPException, status

from app.modules.auth.constants.roles import SYSTEM_ADMIN, TENANT
from app.core.dependencies import get_current_user
from app.modules.groups.repository import get_user_group_role


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

def require_group_owner(group_id, current_user, db):
    """Require GROUP_OWNER role for a specific group."""
    role = get_user_group_role(db, group_id, current_user["user_id"])
    if role != "GROUP_OWNER":
        raise HTTPException(status_code=403, detail="Group owner access required.")


def require_group_member(group_id, current_user, db):
    """Require at least GROUP_MEMBER role for a specific group."""
    role = get_user_group_role(db, group_id, current_user["user_id"])
    if role not in ("GROUP_OWNER", "GROUP_MEMBER"):
        raise HTTPException(status_code=403, detail="Group membership required.")


# Keep old name as alias so any existing callers don't break
def require_group_manager(group_id, current_user, db):
    """Deprecated alias for require_group_owner."""
    return require_group_owner(group_id, current_user, db)
