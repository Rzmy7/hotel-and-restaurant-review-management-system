"""
Group service — business logic for groups, hotels, and members.
"""

import uuid
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.groups.models import Group, GroupMember
from app.constants.roles import GROUP_MANAGER, GROUP_MEMBER
from app.modules.groups.repository import (
    create_group,
    get_group_by_id,
    delete_group_by_id,
    get_groups_for_user,
    add_member_to_group,
    get_group_members,
    get_member,
    change_member_role,
    remove_member_from_group,
    find_user_by_email,
    get_group_hotels,
    add_hotel_to_group,
    remove_hotel_by_id,
)


def _require_group(db: Session, group_id) -> Group:
    group = get_group_by_id(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group


def _require_manager(db: Session, group_id, user_id):
    role = _get_role(db, group_id, user_id)
    if role != GROUP_MANAGER:
        raise HTTPException(status_code=403, detail="Only group managers can perform this action")


def _require_member(db: Session, group_id, user_id):
    role = _get_role(db, group_id, user_id)
    if not role:
        raise HTTPException(status_code=403, detail="You are not a member of this group")


def _get_role(db: Session, group_id, user_id) -> str:
    from app.modules.groups.repository import get_user_group_role
    return get_user_group_role(db, group_id, user_id)


def _get_uid(current_user) -> str:
    if isinstance(current_user, dict):
        return current_user.get("id") or current_user.get("user_id")
    return str(current_user.user_id)


# ── Groups ──────────────────────────────────────────────────────────

def svc_list_groups(db: Session, current_user):
    user_id = _get_uid(current_user)
    return get_groups_for_user(db, user_id)


def svc_create_group(db: Session, current_user, group_name: str, description: str = None):
    user_id = _get_uid(current_user)
    group = create_group(db, group_name=group_name, created_by=user_id, description=description)
    # Creator auto-becomes GROUP_MANAGER
    add_member_to_group(db, group.group_id, user_id, GROUP_MANAGER)
    return {
        "id": str(group.group_id),
        "name": group.group_name,
        "description": group.description or "",
        "createdAt": group.created_at.isoformat() if group.created_at else None,
    }


def svc_get_group_detail(db: Session, current_user, group_id: str):
    gid = uuid.UUID(group_id)
    group = _require_group(db, gid)
    uid = _get_uid(current_user)
    _require_member(db, gid, uid)

    hotels = get_group_hotels(db, gid)
    members = get_group_members(db, gid)
    role = _get_role(db, gid, uid)

    return {
        "id": str(group.group_id),
        "name": group.group_name,
        "description": group.description or "",
        "currentUserRole": "owner" if role == GROUP_MANAGER else "member",
        "createdAt": group.created_at.isoformat() if group.created_at else None,
        "hotels": hotels,
        "members": members,
    }


def svc_delete_group(db: Session, current_user, group_id: str):
    gid = uuid.UUID(group_id)
    _require_group(db, gid)
    uid = _get_uid(current_user)
    _require_manager(db, gid, uid)
    delete_group_by_id(db, gid)
    return {"message": "Group deleted successfully"}


# ── Hotels ──────────────────────────────────────────────────────────

def svc_list_hotels(db: Session, current_user, group_id: str):
    gid = uuid.UUID(group_id)
    _require_group(db, gid)
    uid = _get_uid(current_user)
    _require_member(db, gid, uid)
    return get_group_hotels(db, gid)


def svc_remove_hotel(db: Session, current_user, group_id: str, hotel_id: str):
    gid = uuid.UUID(group_id)
    _require_group(db, gid)
    uid = _get_uid(current_user)
    _require_manager(db, gid, uid)
    success = remove_hotel_by_id(db, uuid.UUID(hotel_id))
    if not success:
        raise HTTPException(status_code=404, detail="Hotel not found")
    return {"message": "Hotel removed"}


# ── Members ─────────────────────────────────────────────────────────

def svc_list_members(db: Session, current_user, group_id: str):
    gid = uuid.UUID(group_id)
    _require_group(db, gid)
    uid = _get_uid(current_user)
    _require_member(db, gid, uid)
    return get_group_members(db, gid)


def svc_create_invite(db: Session, current_user, group_id: str, hotel_name: str, location: str, email: str, role: str = "member"):
    gid = uuid.UUID(group_id)
    group = _require_group(db, gid)
    uid = _get_uid(current_user)
    _require_manager(db, gid, uid)

    db_role = GROUP_MANAGER if role == "manager" else GROUP_MEMBER
    
    from app.core.security import create_invite_token
    token = create_invite_token(str(gid), db_role, hotel_name, location)
    
    import os
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    link = f"{frontend_url}/accept-invite?token={token}"
    
    from app.modules.auth.models import User
    inviter_user = db.query(User).filter(User.user_id == uid).first()
    inviter_name = inviter_user.full_name if inviter_user else "A user"
    
    from app.modules.auth.service import send_group_invite_email
    send_group_invite_email(email, group.group_name, hotel_name, inviter_name, link)
    
    return {"message": "Hotel invitation sent successfully", "link": link}


def svc_accept_invite(db: Session, current_user, token: str):
    from app.core.security import decode_invite_token
    from jose import JWTError
    try:
        payload = decode_invite_token(token)
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired invitation token")
        
    gid = uuid.UUID(payload["group_id"])
    role = payload["role"]
    hotel_name = payload.get("hotel_name")
    location = payload.get("location", "")
    uid = _get_uid(current_user)
    
    group = _require_group(db, gid)
    
    existing = get_member(db, gid, uid)
    if not existing:
        add_member_to_group(db, gid, uid, role)
        
    if hotel_name:
        add_hotel_to_group(db, gid, hotel_name, location)
        
    return {"message": "Successfully joined the group and added hotel", "group_id": str(gid)}


def svc_change_member_role(db: Session, current_user, group_id: str, target_user_id: str, new_role: str):
    gid = uuid.UUID(group_id)
    _require_group(db, gid)
    uid = _get_uid(current_user)
    _require_manager(db, gid, uid)

    db_role = GROUP_MANAGER if new_role == "manager" else GROUP_MEMBER
    result = change_member_role(db, gid, uuid.UUID(target_user_id), db_role)
    if not result:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"message": f"Member role changed to {new_role}"}


def svc_remove_member(db: Session, current_user, group_id: str, target_user_id: str):
    gid = uuid.UUID(group_id)
    _require_group(db, gid)
    uid = _get_uid(current_user)
    _require_member(db, gid, uid)

    # Can't remove yourself only check
    target_role = _get_role(db, gid, target_user_id)
    if target_role == GROUP_MANAGER and uid != _get_uid(current_user):
        raise HTTPException(status_code=403, detail="Cannot remove a group manager")

    success = remove_member_from_group(db, gid, uuid.UUID(target_user_id))
    if not success:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"message": "Member removed successfully"}
