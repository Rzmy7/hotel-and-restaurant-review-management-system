"""
Groups API router.

Architecture: All group operations are org-scoped.
The JWT carries both user_id and organization_id (current org context).
Route order matters — static paths (/invites/my, /join/{token}, /search-organizations)
must be registered before the parameterized /{group_id} routes.
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

def _get_current_org_id(current_user: dict, db: Session) -> str:
    """
    Get the organization_id for the current request context.
    The JWT may carry 'organization_id' directly; otherwise resolve from user_id.
    """
    org_id = current_user.get("organization_id")
    if org_id:
        return org_id
    # Fallback: look up via user's tenant
    resolved = repo.get_user_current_org_id(db, current_user["user_id"])
    if not resolved:
        raise HTTPException(
            status_code=400,
            detail="No organization found for your account. Please create or select an organization first."
        )
    return resolved


def _require_owner(group_id: str, organization_id: str, db: Session):
    role = repo.get_org_group_role(db, group_id, organization_id)
    if role != "GROUP_OWNER":
        raise HTTPException(status_code=403, detail="Only the group owner can perform this action.")
    return role


def _require_member(group_id: str, organization_id: str, db: Session):
    role = repo.get_org_group_role(db, group_id, organization_id)
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
    """
    Return all pending group invites for ALL organizations owned by the current user.
    This is user-scoped (not org-scoped) so the user sees all their orgs' invites at once.
    """
    invites = repo.list_pending_invites_for_user(db, current_user["user_id"])
    return {"invites": invites, "count": len(invites)}


@router.post("/invites/{invite_id}/accept")
def accept_invite(
    invite_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Accept a pending group invite. Verifies the current user owns the invited organization."""
    invite = repo.get_invite(db, invite_id)
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found.")

    if not invite.invited_org_id:
        raise HTTPException(status_code=400, detail="This invite has no target organization.")

    # Verify the current user owns the invited organization (org-agnostic, works with multi-org users)
    if not repo.is_user_org_owner(db, current_user["user_id"], str(invite.invited_org_id)):
        raise HTTPException(status_code=403, detail="This invite is not for one of your organizations.")

    if invite.status != "pending":
        raise HTTPException(status_code=400, detail=f"Invite is already {invite.status}.")

    target_org_id = str(invite.invited_org_id)

    # Check not already a member
    if repo.get_member(db, str(invite.group_id), target_org_id):
        repo.update_invite_status(db, invite, "accepted")
        return {"message": "Your organization is already a member of this group."}

    repo.add_member(db, str(invite.group_id), target_org_id)
    repo.update_invite_status(db, invite, "accepted")

    # Notify the group owner
    try:
        group = repo.get_group(db, str(invite.group_id))
        from app.services.notification_helpers import notify_group_invite_accepted
        org_row = db.execute(
            text("SELECT organization_name FROM organization WHERE organization_id = :oid"),
            {"oid": target_org_id},
        ).fetchone()
        org_name = org_row.organization_name if org_row else "An organization"
        notify_group_invite_accepted(
            owner_id=str(invite.invited_by),
            member_name=org_name,
            group_name=group.group_name if group else "the group",
            db_for_name=db,
            user_id=current_user["user_id"],
        )
    except Exception:
        pass

    return {"message": "Your organization has joined the group successfully."}


@router.post("/invites/{invite_id}/reject")
def reject_invite(
    invite_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reject a pending group invite. Verifies the current user owns the invited organization."""
    invite = repo.get_invite(db, invite_id)
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found.")

    if not invite.invited_org_id:
        raise HTTPException(status_code=400, detail="This invite has no target organization.")

    # Verify ownership — works for multi-org users regardless of JWT org context
    if not repo.is_user_org_owner(db, current_user["user_id"], str(invite.invited_org_id)):
        raise HTTPException(status_code=403, detail="This invite is not for one of your organizations.")

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
    org_id = _get_current_org_id(current_user, db)
    group = repo.get_group_by_invite_token(db, token)
    if not group:
        raise HTTPException(status_code=404, detail="Invite link is invalid or has expired.")

    member_count = db.execute(
        text("SELECT COUNT(*) FROM group_member WHERE group_id = :gid"),
        {"gid": str(group.group_id)},
    ).scalar()

    already_member = repo.get_member(db, str(group.group_id), org_id) is not None

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
    """Join a group using a valid invite-link token (current org joins)."""
    org_id = _get_current_org_id(current_user, db)
    group = repo.get_group_by_invite_token(db, token)
    if not group:
        raise HTTPException(status_code=404, detail="Invite link is invalid or has expired.")

    if repo.get_member(db, str(group.group_id), org_id):
        return {"message": "Your organization is already a member of this group.", "group_id": str(group.group_id)}

    repo.add_member(db, str(group.group_id), org_id)
    return {
        "message": f"Your organization has joined '{group.group_name}' successfully.",
        "group_id": str(group.group_id),
    }


@router.get("/search-organizations")
def search_organizations(
    q: str = Query(..., min_length=1),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Search organizations by name — used in the invite modal. Excludes current org."""
    org_id = _get_current_org_id(current_user, db)
    results = repo.search_organizations(db, q, exclude_org_id=org_id)
    return {"organizations": results}


# ══════════════════════════════════════════════════════════════════════
#  COLLECTION ROUTES
# ══════════════════════════════════════════════════════════════════════

@router.get("")
def list_groups(
    organization_id: Optional[str] = Query(None, description="Organization ID to scope groups to"),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all groups the specified (or current) organization belongs to."""
    # Explicit org_id from query param takes priority — this is what the frontend sends
    if organization_id:
        org_id = organization_id
    else:
        org_id = _get_current_org_id(current_user, db)
    groups = repo.list_org_groups(db, org_id)
    return {"groups": groups, "count": len(groups)}


@router.post("")
def create_group(
    body: GroupCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new group. The specified (or current) organization becomes the GROUP_OWNER."""
    org_id = body.organization_id or _get_current_org_id(current_user, db)
    group = repo.create_group(
        db,
        group_name=body.group_name,
        created_by=current_user["user_id"],
        description=body.description,
        is_private=body.is_private,
        settings=body.settings,
    )
    repo.add_member(db, str(group.group_id), org_id, role="GROUP_OWNER")

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
    organization_id: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return full group details for a member organization."""
    org_id = organization_id or _get_current_org_id(current_user, db)
    detail = repo.get_group_detail(db, group_id, org_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Group not found or your organization is not a member.")
    return detail


@router.put("/{group_id}")
def update_group(
    group_id: str,
    body: GroupUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update group name / description / privacy. Owner organization only."""
    org_id = _get_current_org_id(current_user, db)
    _require_owner(group_id, org_id, db)
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
    """Permanently delete a group. Owner organization only."""
    org_id = _get_current_org_id(current_user, db)
    _require_owner(group_id, org_id, db)
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
    Return member organizations.
    Owners always have access; members need show_members_to_members = True.
    """
    org_id = _get_current_org_id(current_user, db)
    role = _require_member(group_id, org_id, db)
    if role == "GROUP_MEMBER":
        group = _get_group_or_404(group_id, db)
        from app.modules.groups.repository import _parse_settings
        settings = _parse_settings(group.settings)
        if not settings.show_members_to_members:
            raise HTTPException(status_code=403, detail="Member list is not visible to members in this group.")

    members = repo.list_members(db, group_id)
    return {"members": members, "count": len(members)}


@router.delete("/{group_id}/members/{organization_id}")
def remove_member(
    group_id: str,
    organization_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a member organization from the group. Owner only. Owner cannot remove themselves."""
    org_id = _get_current_org_id(current_user, db)
    _require_owner(group_id, org_id, db)
    if organization_id == org_id:
        raise HTTPException(status_code=400, detail="Owner organization cannot remove itself. Delete the group instead.")
    removed = repo.remove_member(db, group_id, organization_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Member organization not found.")

    try:
        from app.services.notification_helpers import notify_group_member_removed
        group = repo.get_group(db, group_id)
        # Notify the owner of the removed org
        owner_user_id = repo.get_org_owner_user_id(db, organization_id)
        if owner_user_id:
            notify_group_member_removed(owner_user_id, group.group_name if group else "a group")
    except Exception:
        pass

    return {"message": "Member organization removed."}


# ── Settings ─────────────────────────────────────────────────────────

@router.get("/{group_id}/settings")
def get_settings(
    group_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return group permission settings. Owner only."""
    org_id = _get_current_org_id(current_user, db)
    _require_owner(group_id, org_id, db)
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
    org_id = _get_current_org_id(current_user, db)
    _require_owner(group_id, org_id, db)
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
    org_id = _get_current_org_id(current_user, db)
    role = _require_member(group_id, org_id, db)
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
    org_id = _get_current_org_id(current_user, db)
    _require_owner(group_id, org_id, db)
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
    Send a group invite to an organization.
    Owner can always invite; members need can_members_invite = True.
    Checks that the TARGET ORGANIZATION is not already a member (not the user).
    """
    org_id = _get_current_org_id(current_user, db)
    role = _require_member(group_id, org_id, db)
    group = _get_group_or_404(group_id, db)

    if role == "GROUP_MEMBER":
        from app.modules.groups.repository import _parse_settings
        settings = _parse_settings(group.settings)
        if not settings.can_members_invite:
            raise HTTPException(status_code=403, detail="Members are not allowed to invite in this group.")

    target_org_id = body.organization_id

    # Prevent self-invite
    if target_org_id == org_id:
        raise HTTPException(status_code=400, detail="You cannot invite your own organization.")

    # Check the TARGET ORGANIZATION is not already a member
    if repo.get_member(db, group_id, target_org_id):
        raise HTTPException(status_code=400, detail="This organization is already a member of the group.")

    # Check no active invite for this org already
    if repo.has_pending_invite_for_org(db, group_id, target_org_id):
        raise HTTPException(status_code=400, detail="There is already a pending invite for this organization.")

    invite = repo.create_org_invite(
        db,
        group_id=group_id,
        invited_by_user_id=current_user["user_id"],
        invited_by_org_id=org_id,
        invited_org_id=target_org_id,
        message=body.message,
    )

    # Send in-app notification to the target org's owner
    try:
        from app.services.notification_helpers import notify_group_invite
        invited_owner_user_id = repo.get_org_owner_user_id(db, target_org_id)
        if invited_owner_user_id:
            inviter_org_row = db.execute(
                text("SELECT organization_name FROM organization WHERE organization_id = :oid"),
                {"oid": org_id},
            ).fetchone()
            inviter_org_name = inviter_org_row.organization_name if inviter_org_row else "An organization"
            notify_group_invite(
                user_id=invited_owner_user_id,
                inviter_name=inviter_org_name,
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
    org_id = _get_current_org_id(current_user, db)
    _require_owner(group_id, org_id, db)
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
    org_id = _get_current_org_id(current_user, db)
    _require_owner(group_id, org_id, db)
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
    org_id = _get_current_org_id(current_user, db)
    _require_owner(group_id, org_id, db)
    group = _get_group_or_404(group_id, db)
    if not group.invite_link_token:
        raise HTTPException(status_code=400, detail="No active invite link to revoke.")
    repo.revoke_invite_link(db, group)
    return {"message": "Invite link revoked."}
