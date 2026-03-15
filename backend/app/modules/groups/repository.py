"""
Group repository — data access for groups and members.

Moved from repositories/groups_repo.py.
"""

from sqlalchemy.orm import Session
import uuid

from app.modules.groups.models import Group, GroupMember


def create_group(db: Session, group_name: str, created_by):
    group = Group(
        group_id=uuid.uuid4(),
        group_name=group_name,
        created_by=created_by
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


def add_member_to_group(db: Session, group_id, user_id, role="GROUP_MEMBER"):
    member = GroupMember(
        membership_id=uuid.uuid4(),
        group_id=group_id,
        user_id=user_id,
        role=role
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


def get_user_group_role(db: Session, group_id, user_id):
    member = (
        db.query(GroupMember)
        .filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id
        )
        .first()
    )

    if not member:
        return None

    return member.role
