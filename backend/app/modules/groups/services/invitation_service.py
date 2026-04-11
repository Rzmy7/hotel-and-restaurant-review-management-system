"""Invitation service — invite by email, respond to invite."""

import uuid
import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.modules.groups.models import Group, GroupMember, GroupInvitation
from app.modules.auth.models import User, Notification, UserNotification


def _get_group_or_404(db: Session, group_id: uuid.UUID) -> Group:
    g = db.query(Group).filter(Group.group_id == group_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    return g


def _require_role(db: Session, group_id: uuid.UUID, user_id: uuid.UUID, allowed: list[str]):
    m = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id,
    ).first()
    if not m or m.role not in allowed:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return m


def invite_member(db: Session, group_id: uuid.UUID, email: str, role: str, inviter_id: uuid.UUID):
    """
    1. Verify inviter is owner/manager.
    2. Look up email in dbo.user.
    3. If not found → 404 with friendly message.
    4. If already a member → 409.
    5. If already has pending invite → 409.
    6. Insert group_invitation row.
    7. Create UserNotification for invited user.
    """
    group = _get_group_or_404(db, group_id)
    _require_role(db, group_id, inviter_id, ["GROUP_OWNER", "GROUP_MANAGER"])

    # Lookup invited user
    invited_user = db.query(User).filter(User.email == email.lower().strip()).first()
    if not invited_user:
        raise HTTPException(
            status_code=404,
            detail="This email does not have an account in our system"
        )

    # Check if already a member
    already_member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == invited_user.user_id,
    ).first()
    if already_member:
        raise HTTPException(status_code=409, detail="This user is already a member of the group")

    # Check if pending invite already exists
    existing_invite = db.query(GroupInvitation).filter(
        GroupInvitation.group_id == group_id,
        GroupInvitation.invited_user_id == invited_user.user_id,
        GroupInvitation.status == "pending",
    ).first()
    if existing_invite:
        raise HTTPException(status_code=409, detail="A pending invitation already exists for this user")

    # Get inviter name
    inviter = db.query(User).filter(User.user_id == inviter_id).first()
    inviter_name = f"{inviter.first_name} {inviter.last_name}".strip() if inviter else "Someone"

    role_label = "Manager" if role == "GROUP_MANAGER" else "Member"

    # Create invitation row
    invitation = GroupInvitation(
        invitation_id=uuid.uuid4(),
        group_id=group_id,
        invited_email=email.lower().strip(),
        invited_user_id=invited_user.user_id,
        invited_by=inviter_id,
        status="pending",
        role=role,
    )
    db.add(invitation)
    db.flush()  # get invitation_id

    # Build notification metadata
    meta = json.dumps({
        "invitation_id": str(invitation.invitation_id),
        "group_id": str(group_id),
        "group_name": group.group_name,
        "role": role,
    })

    # Create Notification row
    notif = Notification(
        title=f"Group Invitation: {group.group_name}",
        message=f"{inviter_name} invited you to join '{group.group_name}' as {role_label}.",
        notification_type="group_invite",
        extra_data=meta,
    )
    db.add(notif)
    db.flush()

    # Create UserNotification row for the invited user
    user_notif = UserNotification(
        notification_id=notif.notification_id,
        user_id=invited_user.user_id,
        is_read=False,
    )
    db.add(user_notif)

    # Link notification back to invitation
    invitation.notification_id = notif.notification_id

    db.commit()

    return {
        "message": f"Invitation sent to {email}",
        "invitation_id": str(invitation.invitation_id),
    }


def respond_to_invitation(
    db: Session,
    group_id: uuid.UUID,
    invitation_id: uuid.UUID,
    action: str,  # "accept" or "reject"
    current_user_id: uuid.UUID,
):
    inv = db.query(GroupInvitation).filter(
        GroupInvitation.invitation_id == invitation_id,
        GroupInvitation.group_id == group_id,
        GroupInvitation.invited_user_id == current_user_id,
        GroupInvitation.status == "pending",
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found or already responded")

    now = datetime.now(timezone.utc)

    if action == "accept":
        # Add to group_member
        member = GroupMember(
            group_id=group_id,
            user_id=current_user_id,
            role=inv.role,
        )
        db.add(member)
        inv.status = "accepted"
        inv.responded_at = now
        db.commit()
        return {"message": "You have joined the group!", "role": inv.role}

    elif action == "reject":
        inv.status = "rejected"
        inv.responded_at = now
        db.commit()
        return {"message": "Invitation declined."}

    else:
        raise HTTPException(status_code=400, detail="action must be 'accept' or 'reject'")


def get_pending_invitations_for_user(db: Session, user_id: uuid.UUID):
    invites = db.query(GroupInvitation).filter(
        GroupInvitation.invited_user_id == user_id,
        GroupInvitation.status == "pending",
    ).all()
    result = []
    for inv in invites:
        group = db.query(Group).filter(Group.group_id == inv.group_id).first()
        inviter = db.query(User).filter(User.user_id == inv.invited_by).first()
        result.append({
            "invitation_id": str(inv.invitation_id),
            "group_id": str(inv.group_id),
            "group_name": group.group_name if group else "Unknown",
            "invited_by_name": f"{inviter.first_name} {inviter.last_name}".strip() if inviter else "Unknown",
            "role": inv.role,
            "created_at": inv.created_at.isoformat() if inv.created_at else None,
        })
    return result
