"""Groups membership service — ownership transfer and member removal.

NOTE: The canonical membership logic now lives in repository.py.
GroupMember is org-based (primary key: group_id + organization_id).
This service is a thin wrapper for permission-checked operations.
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.auth.constants.roles import GROUP_OWNER, GROUP_MEMBER
from app.modules.groups import repository as repo
from app.modules.groups.services.group_service import _get_group_or_404


def transfer_group_ownership(
    db: Session,
    group_id: str,
    new_owner_org_id: str,
    caller_org_id: str,
):
    """
    Transfer GROUP_OWNER role from caller_org_id to new_owner_org_id.
    Both must already be members of the group.
    """
    _get_group_or_404(db, group_id)

    caller_role = repo.get_org_group_role(db, group_id, caller_org_id)
    if caller_role != GROUP_OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the group owner can transfer ownership.",
        )

    target = repo.get_member(db, group_id, new_owner_org_id)
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target organization is not a member of this group.",
        )

    # Demote caller, promote target
    caller_member = repo.get_member(db, group_id, caller_org_id)
    if caller_member and caller_org_id != new_owner_org_id:
        caller_member.role = GROUP_MEMBER

    target.role = GROUP_OWNER
    db.commit()

    return {"message": "Ownership transferred successfully"}


def remove_group_member(
    db: Session,
    group_id: str,
    organization_id: str,
    caller_org_id: str,
):
    """
    Remove an organization from a group.
    Only GROUP_OWNER can remove members; owner cannot remove itself.
    """
    _get_group_or_404(db, group_id)

    caller_role = repo.get_org_group_role(db, group_id, caller_org_id)
    if caller_role != GROUP_OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the group owner can remove members.",
        )

    if organization_id == caller_org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Owner organization cannot remove itself. Delete the group instead.",
        )

    removed = repo.remove_member(db, group_id, organization_id)
    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member organization not found.",
        )

    return {"message": "Member removed successfully"}
