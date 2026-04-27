"""Groups group management service — create and member management.

NOTE: The canonical group CRUD logic now lives in repository.py.
This service layer only wraps subscription-limit checks and notifications.
It is used only if you call these helpers directly; the router.py does
NOT use these — it calls repository.py directly.
"""

import uuid
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.groups.models import Group
from app.modules.auth.constants.roles import GROUP_OWNER, GROUP_MEMBER
from app.modules.groups import repository as repo


def _get_group_or_404(db: Session, group_id: uuid.UUID) -> Group:
    group = db.query(Group).filter(Group.group_id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group


def create_group_service(db: Session, group_name: str, organization_id: str, current_user):
    """
    Create a group and add the given organization as GROUP_OWNER.
    Runs subscription limit checks.
    """
    # ── Check group limit ──
    try:
        import pyodbc
        from app.core.db_utils import get_connection_string
        from app.modules.admin.services.subscription_service import (
            increment_feature_usage,
            check_feature_limit,
            send_limit_reached_notification,
        )
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            limit_info = check_feature_limit(cursor, str(current_user.user_id), "groups")
            if not limit_info["allowed"]:
                send_limit_reached_notification(str(current_user.user_id), limit_info["feature_name"])
                raise HTTPException(
                    status_code=403,
                    detail=(
                        f"Group limit reached for your current plan. "
                        f"You have used {limit_info['used']}/{limit_info['limit']}. "
                        f"Please upgrade your subscription plan to add more groups."
                    ),
                )
    except HTTPException:
        raise
    except Exception as limit_err:
        print(f"LIMIT CHECK WARNING (groups): {limit_err}")

    group = repo.create_group(
        db,
        group_name=group_name,
        created_by=str(current_user.user_id),
    )
    repo.add_member(db, str(group.group_id), organization_id, role=GROUP_OWNER)

    # ── Send group created notification ──
    try:
        from app.services.notification_helpers import notify_group_created
        notify_group_created(str(current_user.user_id), group_name)
    except Exception:
        pass  # Best-effort

    # ── Increment usage ──
    try:
        import pyodbc
        from app.core.db_utils import get_connection_string
        from app.modules.admin.services.subscription_service import increment_feature_usage
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            increment_feature_usage(cursor, str(current_user.user_id), "groups")
            conn.commit()
    except Exception as e:
        print(f"FAILED TO INCREMENT GROUP USAGE: {e}")

    return group


def add_group_member_service(
    db: Session,
    group_id: str,
    organization_id: str,
    current_user,
    role: str = GROUP_MEMBER,
):
    """Add an organization to a group. Only the GROUP_OWNER org may call this."""
    _get_group_or_404(db, group_id)
    caller_role = repo.get_org_group_role(db, group_id, str(current_user.organization_id))
    if caller_role != GROUP_OWNER:
        raise HTTPException(status_code=403, detail="Only the group owner can add members.")
    member = repo.add_member(db, group_id, organization_id, role=role)
    return member
