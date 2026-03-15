"""
Group endpoints: create, add members, get role, get reviews.

Extracted from the monolithic main.py.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.groups_repo import (
    create_group,
    add_member_to_group,
    get_user_group_role,
)
from app.auth.permissions import require_group_manager, require_group_member

router = APIRouter(prefix="/groups", tags=["Groups"])


def _get_current_user(request: Request):
    """Session-based current user extraction (used by group routes)."""
    user = request.session.get("user")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@router.post("")
def create_group_api(
    group_name: str,
    current_user=Depends(_get_current_user),
    db: Session = Depends(get_db),
):
    group = create_group(db, group_name, current_user["id"])

    add_member_to_group(db, group.group_id, current_user["id"], "GROUP_MANAGER")

    return {
        "message": "Group created successfully",
        "group_id": str(group.group_id),
        "group_name": group.group_name,
    }


@router.post("/{group_id}/members")
def add_member_api(
    group_id: str,
    user_id: str,
    current_user=Depends(_get_current_user),
    db: Session = Depends(get_db),
):
    require_group_manager(group_id, current_user, db)

    member = add_member_to_group(db, group_id, user_id, "GROUP_MEMBER")

    return {
        "message": "User added to group",
        "group_id": group_id,
        "user_id": user_id,
        "role": member.role,
    }


@router.get("/{group_id}/my-role")
def get_my_group_role(
    group_id: str,
    current_user=Depends(_get_current_user),
    db: Session = Depends(get_db),
):
    role = get_user_group_role(db, group_id, current_user["id"])
    return {"group_id": group_id, "role": role}


@router.get("/{group_id}/reviews")
def get_group_reviews(
    group_id: str,
    current_user=Depends(_get_current_user),
    db: Session = Depends(get_db),
):
    require_group_member(group_id, current_user, db)
    return {"message": "You can access group reviews"}
