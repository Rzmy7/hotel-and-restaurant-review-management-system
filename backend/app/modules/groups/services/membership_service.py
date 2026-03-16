"""Groups membership service — ownership transfer and member removal."""

import uuid
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.groups.models import GroupMember
from app.constants.roles import GROUP_MANAGER, GROUP_MEMBER
from app.middleware.permissions import require_group_manager

from app.modules.groups.services.group_service import _get_group_or_404


def transfer_group_ownership(db: Session, group_id: uuid.UUID, new_manager_user_id: uuid.UUID, current_user):
    _get_group_or_404(db, group_id)
    require_group_manager(group_id, current_user, db)

    target = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == new_manager_user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target user is not a group member")

    current = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == current_user.user_id).first()
    target.role = GROUP_MANAGER
    if current and current.user_id != new_manager_user_id:
        current.role = GROUP_MEMBER

    db.commit()
    return {"message": "Ownership transferred successfully"}


def remove_group_member(db: Session, group_id: uuid.UUID, user_id: uuid.UUID, current_user):
    _get_group_or_404(db, group_id)
    require_group_manager(group_id, current_user, db)

    target = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")

    if target.role == GROUP_MANAGER:
        manager_count = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.role == GROUP_MANAGER).count()
        if manager_count <= 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove last GROUP_MANAGER")

    db.delete(target)
    db.commit()
    return {"message": "Member removed successfully"}
