"""Groups group management service — create and member management."""

import uuid
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.groups.models import Group, GroupMember
from app.modules.auth.constants.roles import GROUP_MANAGER, GROUP_MEMBER
from app.modules.groups.repository import create_group, add_member_to_group
from app.middleware.permissions import require_group_manager
from app.modules.admin.services.subscription_service import (
    increment_feature_usage,
    check_feature_limit,
    send_limit_reached_notification,
)
from app.core.db_utils import get_connection_string
import pyodbc


def _get_group_or_404(db: Session, group_id: uuid.UUID) -> Group:
    group = db.query(Group).filter(Group.group_id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group


def create_group_service(db: Session, group_name: str, current_user):
    # ── Check group limit ──
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            limit_info = check_feature_limit(cursor, str(current_user.user_id), "groups")
            if not limit_info["allowed"]:
                send_limit_reached_notification(str(current_user.user_id), limit_info["feature_name"])
                raise HTTPException(
                    status_code=403,
                    detail=f"Group limit reached for your current plan. "
                           f"You have used {limit_info['used']}/{limit_info['limit']}. "
                           f"Please upgrade your subscription plan to add more groups.",
                )
    except HTTPException:
        raise
    except Exception as limit_err:
        print(f"LIMIT CHECK WARNING (groups): {limit_err}")

    group = create_group(db, group_name=group_name, created_by=current_user.user_id)
    add_member_to_group(db, group.group_id, current_user.user_id, GROUP_MANAGER)
    db.commit()
    db.refresh(group)

    # ── Send group created notification ──
    try:
        from app.services.notification_helpers import notify_group_created
        notify_group_created(str(current_user.user_id), group_name)
    except Exception:
        pass  # Best-effort

    # ----------------------------------------------------
    # Increment usage for the user
    # ----------------------------------------------------
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            increment_feature_usage(cursor, str(current_user.user_id), "groups")
            conn.commit()
    except Exception as e:
        print(f"FAILED TO INCREMENT GROUP USAGE: {e}")

    return group


def add_group_member_service(db: Session, group_id: uuid.UUID, user_id: uuid.UUID, role: str, current_user):
    _get_group_or_404(db, group_id)
    require_group_manager(group_id, current_user, db)
    member = add_member_to_group(db, group_id, user_id, role or GROUP_MEMBER)
    db.commit()
    db.refresh(member)
    return member
