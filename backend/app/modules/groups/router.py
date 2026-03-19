"""
Groups API router — all group, hotel, and member endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.groups.service import (
    svc_list_groups,
    svc_create_group,
    svc_get_group_detail,
    svc_delete_group,
    svc_list_hotels,
    svc_remove_hotel,
    svc_list_members,
    svc_create_invite,
    svc_accept_invite,
    svc_change_member_role,
    svc_remove_member,
)

router = APIRouter(prefix="/groups", tags=["Groups"])


# ── Auth helper ────────────────────────────────────────────────────────
def _get_current_user(request: Request):
    """Decode the JWT Bearer token from the Authorization header."""
    from app.core.security import decode_access_token
    from jose import JWTError

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = auth_header[len("Bearer "):]
    try:
        payload = decode_access_token(token)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return {
        "id": payload.get("user_id"),
        "role": payload.get("role"),
    }


# ── Request Schemas ────────────────────────────────────────────────────
class CreateGroupBody(BaseModel):
    name: str
    description: str = ""


class HotelInviteBody(BaseModel):
    hotel_name: str
    location: str = ""
    email: str
    role: str = "member"  # "member" or "manager"


class AcceptInviteBody(BaseModel):
    token: str


class ChangeRoleBody(BaseModel):
    role: str  # "member" or "manager"


# ── Groups ─────────────────────────────────────────────────────────────
@router.get("")
def list_groups(
    current_user=Depends(_get_current_user),
    db: Session = Depends(get_db),
):
    """List all groups the current user belongs to."""
    return svc_list_groups(db, current_user)


@router.post("")
def create_group(
    body: CreateGroupBody,
    current_user=Depends(_get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new group. The creator becomes GROUP_MANAGER."""
    return svc_create_group(db, current_user, body.name, body.description)


@router.get("/{group_id}")
def get_group_detail(
    group_id: str,
    current_user=Depends(_get_current_user),
    db: Session = Depends(get_db),
):
    """Get full group detail including hotels and members."""
    return svc_get_group_detail(db, current_user, group_id)


@router.delete("/{group_id}")
def delete_group(
    group_id: str,
    current_user=Depends(_get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a group. Only GROUP_MANAGER can do this."""
    return svc_delete_group(db, current_user, group_id)


# ── Hotels ─────────────────────────────────────────────────────────────
@router.get("/{group_id}/hotels")
def list_hotels(
    group_id: str,
    current_user=Depends(_get_current_user),
    db: Session = Depends(get_db),
):
    """List all hotels in a group."""
    return svc_list_hotels(db, current_user, group_id)


@router.delete("/{group_id}/hotels/{hotel_id}")
def remove_hotel(
    group_id: str,
    hotel_id: str,
    current_user=Depends(_get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a hotel from a group. Requires GROUP_MANAGER."""
    return svc_remove_hotel(db, current_user, group_id, hotel_id)


# ── Members ─────────────────────────────────────────────────────────────
@router.get("/{group_id}/members")
def list_members(
    group_id: str,
    current_user=Depends(_get_current_user),
    db: Session = Depends(get_db),
):
    """List all members of a group."""
    return svc_list_members(db, current_user, group_id)


@router.post("/{group_id}/hotel-invites")
def create_hotel_invite(
    group_id: str,
    body: HotelInviteBody,
    current_user=Depends(_get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a combined hotel + member invite link and send it via email."""
    return svc_create_invite(db, current_user, group_id, body.hotel_name, body.location, body.email, body.role)


@router.post("/hotel-invites/accept")
def accept_hotel_invite(
    body: AcceptInviteBody,
    current_user=Depends(_get_current_user),
    db: Session = Depends(get_db),
):
    """Accept a group invitation using a token."""
    return svc_accept_invite(db, current_user, body.token)


@router.patch("/{group_id}/members/{user_id}")
def change_member_role(
    group_id: str,
    user_id: str,
    body: ChangeRoleBody,
    current_user=Depends(_get_current_user),
    db: Session = Depends(get_db),
):
    """Promote or demote a group member. Requires GROUP_MANAGER."""
    return svc_change_member_role(db, current_user, group_id, user_id, body.role)


@router.delete("/{group_id}/members/{user_id}")
def remove_member(
    group_id: str,
    user_id: str,
    current_user=Depends(_get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a member from a group."""
    return svc_remove_member(db, current_user, group_id, user_id)
