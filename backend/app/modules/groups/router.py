"""
Groups API router.

Route order matters — static paths (/invites/my, /join/{token}, /search-organizations)
must be registered before the parameterized /{group_id} routes to avoid shadowing.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional

from app.database import get_db
from app.core.dependencies import get_current_user
from app.modules.groups import repository as repo
from app.modules.groups.schemas import (
    GroupCreate,
    GroupUpdate,
    GroupSettings,
    InviteCreate,
)

router = APIRouter(prefix="/groups", tags=["Groups"])


# ── helpers ──────────────────────────────────────────────────────────

def _require_owner(group_id: str, user_id: str, db: Session):
    role = repo.get_user_group_role(db, group_id, user_id)
    if role != "GROUP_OWNER":
        raise HTTPException(status_code=403, detail="Only the group owner can perform this action.")
    return role


def _require_member(group_id: str, user_id: str, db: Session):
    role = repo.get_user_group_role(db, group_id, user_id)
    if role not in ("GROUP_OWNER", "GROUP_MEMBER"):
        raise HTTPException(status_code=403, detail="You are not a member of this group.")
    return role


def _get_group_or_404(group_id: str, db: Session):
    group = repo.get_group(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")
    return group


# ══════════════════════════════════════════════════════════════════════
#  STATIC ROUTES (must be before /{group_id})
# ══════════════════════════════════════════════════════════════════════

@router.get("/invites/my")
def get_my_invites(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all pending group invites sent to the authenticated user."""
    invites = repo.list_my_pending_invites(db, current_user["user_id"])
    return {"invites": invites, "count": len(invites)}


@router.post("/invites/{invite_id}/accept")
def accept_invite(
    invite_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Accept a pending group invite."""
    invite = repo.get_invite(db, invite_id)
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found.")
    if str(invite.invited_user_id) != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="This invite is not for you.")
    if invite.status != "pending":
        raise HTTPException(status_code=400, detail=f"Invite is already {invite.status}.")

    # Check not already a member
    if repo.get_member(db, str(invite.group_id), current_user["user_id"]):
        repo.update_invite_status(db, invite, "accepted")
        return {"message": "You are already a member of this group."}

    repo.add_member(db, str(invite.group_id), current_user["user_id"])
    repo.update_invite_status(db, invite, "accepted")

    # Notify the group owner
    try:
        group = repo.get_group(db, str(invite.group_id))
        from app.services.notification_helpers import notify_group_invite_accepted
        notify_group_invite_accepted(
            owner_id=str(invite.invited_by),
            member_name=current_user.get("user_id", "A user"),
            group_name=group.group_name if group else "the group",
            db_for_name=db,
            user_id=current_user["user_id"],
        )
    except Exception:
        pass

    return {"message": "You have joined the group successfully."}


@router.post("/invites/{invite_id}/reject")
def reject_invite(
    invite_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reject a pending group invite."""
    invite = repo.get_invite(db, invite_id)
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found.")
    if str(invite.invited_user_id) != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="This invite is not for you.")
    if invite.status != "pending":
        raise HTTPException(status_code=400, detail=f"Invite is already {invite.status}.")

    repo.update_invite_status(db, invite, "rejected")
    return {"message": "Invite rejected."}


@router.get("/join/{token}")
def get_join_info(
    token: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return group info for a valid invite-link token (pre-join preview)."""
    group = repo.get_group_by_invite_token(db, token)
    if not group:
        raise HTTPException(status_code=404, detail="Invite link is invalid or has expired.")

    member_count = db.execute(
        text("SELECT COUNT(*) FROM group_member WHERE group_id = :gid"),
        {"gid": str(group.group_id)},
    ).scalar()

    already_member = repo.get_member(db, str(group.group_id), current_user["user_id"]) is not None

    return {
        "group_id": str(group.group_id),
        "group_name": group.group_name,
        "description": group.description,
        "member_count": member_count or 0,
        "already_member": already_member,
    }


@router.post("/join/{token}")
def join_via_link(
    token: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Join a group using a valid invite-link token."""
    group = repo.get_group_by_invite_token(db, token)
    if not group:
        raise HTTPException(status_code=404, detail="Invite link is invalid or has expired.")

    if repo.get_member(db, str(group.group_id), current_user["user_id"]):
        return {"message": "You are already a member of this group.", "group_id": str(group.group_id)}

    repo.add_member(db, str(group.group_id), current_user["user_id"])
    return {
        "message": f"You have joined '{group.group_name}' successfully.",
        "group_id": str(group.group_id),
    }


@router.get("/search-organizations")
def search_organizations(
    q: str = Query(..., min_length=1),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Search organizations by name — used in the invite modal."""
    results = repo.search_organizations(db, q)
    return {"organizations": results}


# ══════════════════════════════════════════════════════════════════════
#  COLLECTION ROUTES
# ══════════════════════════════════════════════════════════════════════

@router.get("")
def list_groups(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all groups the current user belongs to."""
    groups = repo.list_user_groups(db, current_user["user_id"])
    return {"groups": groups, "count": len(groups)}


@router.post("")
def create_group(
    body: GroupCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new group. The creator becomes the GROUP_OWNER."""
    group = repo.create_group(
        db,
        group_name=body.group_name,
        created_by=current_user["user_id"],
        description=body.description,
        is_private=body.is_private,
        settings=body.settings,
    )
    repo.add_member(db, str(group.group_id), current_user["user_id"], role="GROUP_OWNER")

    try:
        from app.services.notification_helpers import notify_group_created
        notify_group_created(current_user["user_id"], group.group_name)
    except Exception:
        pass

    return {
        "message": "Group created successfully.",
        "group_id": str(group.group_id),
        "group_name": group.group_name,
    }


# ══════════════════════════════════════════════════════════════════════
#  GROUP-SPECIFIC ROUTES  /{group_id}
# ══════════════════════════════════════════════════════════════════════

@router.get("/{group_id}")
def get_group(
    group_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return full group details for a member."""
    detail = repo.get_group_detail(db, group_id, current_user["user_id"])
    if not detail:
        raise HTTPException(status_code=404, detail="Group not found or you are not a member.")
    return detail


@router.put("/{group_id}")
def update_group(
    group_id: str,
    body: GroupUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update group name / description / privacy. Owner only."""
    _require_owner(group_id, current_user["user_id"], db)
    group = _get_group_or_404(group_id, db)
    updated = repo.update_group(
        db, group,
        group_name=body.group_name,
        description=body.description,
        is_private=body.is_private,
    )
    return {"message": "Group updated.", "group_id": str(updated.group_id)}


@router.delete("/{group_id}")
def delete_group(
    group_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Permanently delete a group. Owner only."""
    _require_owner(group_id, current_user["user_id"], db)
    group = _get_group_or_404(group_id, db)
    repo.delete_group(db, group)
    return {"message": "Group deleted."}


# ── Members ──────────────────────────────────────────────────────────

@router.get("/{group_id}/members")
def list_members(
    group_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return member list.
    Owners always have access; members need show_members_to_members = True.
    """
    role = _require_member(group_id, current_user["user_id"], db)
    if role == "GROUP_MEMBER":
        group = _get_group_or_404(group_id, db)
        from app.modules.groups.repository import _parse_settings
        settings = _parse_settings(group.settings)
        if not settings.show_members_to_members:
            raise HTTPException(status_code=403, detail="Member list is not visible to members in this group.")

    members = repo.list_members(db, group_id)
    return {"members": members, "count": len(members)}


@router.delete("/{group_id}/members/{user_id}")
def remove_member(
    group_id: str,
    user_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a member from the group. Owner only. Owner cannot remove themselves."""
    _require_owner(group_id, current_user["user_id"], db)
    if user_id == current_user["user_id"]:
        raise HTTPException(status_code=400, detail="Owner cannot remove themselves. Delete the group instead.")
    removed = repo.remove_member(db, group_id, user_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Member not found.")

    try:
        from app.services.notification_helpers import notify_group_member_removed
        group = repo.get_group(db, group_id)
        notify_group_member_removed(user_id, group.group_name if group else "a group")
    except Exception:
        pass

    return {"message": "Member removed."}


# ── Settings ─────────────────────────────────────────────────────────

@router.get("/{group_id}/settings")
def get_settings(
    group_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return group permission settings. Owner only."""
    _require_owner(group_id, current_user["user_id"], db)
    group = _get_group_or_404(group_id, db)
    from app.modules.groups.repository import _parse_settings
    return _parse_settings(group.settings).model_dump()


@router.put("/{group_id}/settings")
def update_settings(
    group_id: str,
    body: GroupSettings,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update group permission settings. Owner only."""
    _require_owner(group_id, current_user["user_id"], db)
    group = _get_group_or_404(group_id, db)
    repo.update_group_settings(db, group, body)
    return {"message": "Settings updated.", "settings": body.model_dump()}


# ── Analytics ────────────────────────────────────────────────────────

@router.get("/{group_id}/analytics")
def get_analytics(
    group_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return group analytics.
    Owners always have access; members need show_analytics_to_members = True.
    """
    role = _require_member(group_id, current_user["user_id"], db)
    if role == "GROUP_MEMBER":
        group = _get_group_or_404(group_id, db)
        from app.modules.groups.repository import _parse_settings
        settings = _parse_settings(group.settings)
        if not settings.show_analytics_to_members:
            raise HTTPException(status_code=403, detail="Analytics are not visible to members in this group.")

    return repo.get_group_analytics(db, group_id)


# ── Invites ───────────────────────────────────────────────────────────

@router.get("/{group_id}/invites")
def list_invites(
    group_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all invites for this group. Owner only."""
    _require_owner(group_id, current_user["user_id"], db)
    invites = repo.list_group_invites(db, group_id)
    return {"invites": invites, "count": len(invites)}


@router.post("/{group_id}/invites")
def send_invite(
    group_id: str,
    body: InviteCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Send a group invite by searching and selecting an organization.
    The invite goes to the organization's owner user.
    Owner can always invite; members need can_members_invite = True.
    """
    role = _require_member(group_id, current_user["user_id"], db)
    group = _get_group_or_404(group_id, db)

    if role == "GROUP_MEMBER":
        from app.modules.groups.repository import _parse_settings
        settings = _parse_settings(group.settings)
        if not settings.can_members_invite:
            raise HTTPException(status_code=403, detail="Members are not allowed to invite in this group.")

    # Resolve the organization owner user
    invited_user_id = repo.get_org_owner_user_id(db, body.organization_id)
    if not invited_user_id:
        raise HTTPException(status_code=404, detail="Organization not found.")

    # Check they're not already a member
    if repo.get_member(db, group_id, invited_user_id):
        raise HTTPException(status_code=400, detail="This user is already a member of the group.")

    # Check no active invite already
    if repo.has_pending_invite(db, group_id, invited_user_id):
        raise HTTPException(status_code=400, detail="There is already a pending invite for this user.")

    invite = repo.create_user_invite(
        db,
        group_id=group_id,
        invited_by=current_user["user_id"],
        invited_user_id=invited_user_id,
        message=body.message,
    )

    # Send in-app notification to the invited user
    try:
        from app.services.notification_helpers import notify_group_invite
        inviter_row = db.execute(
            text("SELECT first_name, last_name FROM [user] WHERE user_id = :uid"),
            {"uid": current_user["user_id"]},
        ).fetchone()
        inviter_name = (
            f"{inviter_row.first_name or ''} {inviter_row.last_name or ''}".strip()
            if inviter_row else "Someone"
        )
        notify_group_invite(
            user_id=invited_user_id,
            inviter_name=inviter_name,
            group_name=group.group_name,
        )
    except Exception:
        pass

    return {
        "message": "Invite sent successfully.",
        "invite_id": str(invite.invite_id),
    }


@router.delete("/{group_id}/invites/{invite_id}")
def cancel_invite(
    group_id: str,
    invite_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel a pending invite. Owner only."""
    _require_owner(group_id, current_user["user_id"], db)
    invite = repo.get_invite(db, invite_id)
    if not invite or str(invite.group_id) != group_id:
        raise HTTPException(status_code=404, detail="Invite not found.")
    if invite.status != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot cancel an invite that is already {invite.status}.")
    repo.cancel_invite(db, invite)
    return {"message": "Invite cancelled."}


# ── Invite link ───────────────────────────────────────────────────────

@router.post("/{group_id}/invite-link")
def generate_invite_link(
    group_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate (or regenerate) an invite link for the group. Owner only."""
    _require_owner(group_id, current_user["user_id"], db)
    group = _get_group_or_404(group_id, db)
    token = repo.generate_invite_link(db, group)
    return {
        "message": "Invite link generated.",
        "token": token,
        "expires_in_days": 7,
    }


@router.delete("/{group_id}/invite-link")
def revoke_invite_link(
    group_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Revoke the current invite link for the group. Owner only."""
    _require_owner(group_id, current_user["user_id"], db)
    group = _get_group_or_404(group_id, db)
    if not group.invite_link_token:
        raise HTTPException(status_code=400, detail="No active invite link to revoke.")
    repo.revoke_invite_link(db, group)
    return {"message": "Invite link revoked."}
