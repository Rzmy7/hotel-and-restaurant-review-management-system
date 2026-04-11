"""
Groups router — 11 endpoints, JWT-based auth (matches competitors pattern).
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.database import get_db
from app.core.dependencies import get_current_user
from app.modules.groups.services.group_service import (
    create_group_service,
    list_user_groups,
    list_user_subgroups,
    get_group_detail,
    delete_group_service,
    update_group_service,
    remove_member_service,
    change_role_service,
    get_group_analytics,
)
from app.modules.groups.services.invitation_service import (
    invite_member,
    respond_to_invitation,
    get_pending_invitations_for_user,
)

router = APIRouter(prefix="/groups", tags=["Groups"])


def _user_id(current_user) -> uuid.UUID:
    uid = current_user["user_id"] if isinstance(current_user, dict) else str(current_user.user_id)
    return uuid.UUID(uid)


# ---------- Pydantic schemas ----------

class CreateGroupRequest(BaseModel):
    group_name: str
    description: str | None = None
    parent_group_id: str | None = None


class UpdateGroupRequest(BaseModel):
    group_name: str | None = None
    description: str | None = None


class InviteRequest(BaseModel):
    email: str
    role: str = "GROUP_MEMBER"


class RespondRequest(BaseModel):
    action: str  # "accept" or "reject"


class ChangeRoleRequest(BaseModel):
    role: str


# ---------- Endpoints ----------

@router.post("")
def create_group(
    payload: CreateGroupRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    uid = _user_id(current_user)
    parent = uuid.UUID(payload.parent_group_id) if payload.parent_group_id else None
    return create_group_service(db, payload.group_name, payload.description, uid, parent)


@router.get("")
def list_groups(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_user_groups(db, _user_id(current_user))


@router.get("/subgroups")
def list_subgroups(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_user_subgroups(db, _user_id(current_user))


@router.get("/invitations/pending")
def pending_invitations(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_pending_invitations_for_user(db, _user_id(current_user))


@router.get("/{group_id}")
def get_group(
    group_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_group_detail(db, uuid.UUID(group_id), _user_id(current_user))


@router.patch("/{group_id}")
def update_group(
    group_id: str,
    payload: UpdateGroupRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_group_service(db, uuid.UUID(group_id), payload.group_name, payload.description, _user_id(current_user))


@router.delete("/{group_id}")
def delete_group(
    group_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return delete_group_service(db, uuid.UUID(group_id), _user_id(current_user))


@router.post("/{group_id}/invite")
def invite_to_group(
    group_id: str,
    payload: InviteRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return invite_member(db, uuid.UUID(group_id), payload.email, payload.role, _user_id(current_user))


@router.post("/{group_id}/invitations/{invitation_id}/respond")
def respond_invite(
    group_id: str,
    invitation_id: str,
    payload: RespondRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return respond_to_invitation(
        db,
        uuid.UUID(group_id),
        uuid.UUID(invitation_id),
        payload.action,
        _user_id(current_user),
    )


@router.delete("/{group_id}/members/{user_id}")
def remove_member(
    group_id: str,
    user_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return remove_member_service(db, uuid.UUID(group_id), uuid.UUID(user_id), _user_id(current_user))


@router.patch("/{group_id}/members/{user_id}/role")
def change_member_role(
    group_id: str,
    user_id: str,
    payload: ChangeRoleRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return change_role_service(db, uuid.UUID(group_id), uuid.UUID(user_id), payload.role, _user_id(current_user))


@router.get("/{group_id}/analytics")
def group_analytics(
    group_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_group_analytics(db, uuid.UUID(group_id), _user_id(current_user))
