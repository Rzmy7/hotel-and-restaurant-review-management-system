"""
Roles Repository Module
Handles database operations related to user roles and permissions.
"""

from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session

from app.modules.auth.models import Role
from app.modules.user.models.user_models import User


def get_role_by_name(db: Session, role_name: str) -> Optional[Role]:
    """Retrieves a Role object by its unique name."""
    return db.query(Role).filter(Role.role_name == role_name).first()


def assign_role_to_user(db: Session, user_id: UUID | str, role_name: str) -> Optional[User]:
    """
    Updates a user's role to the one specified by role_name.
    Returns the updated User object or None if role/user not found.
    """
    role = get_role_by_name(db, role_name)
    if not role:
        return None

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return None

    user.role_id = role.role_id
    db.commit()
    db.refresh(user)

    return user


def get_user_role_names(db: Session, user_id: UUID | str) -> List[str]:
    """
    Returns a list of role names assigned to the user.
    Currently supports a single-role system.
    """
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user or not user.role:
        return []

    return [user.role.role_name]


def get_user_primary_role(db: Session, user_id: UUID | str) -> Optional[str]:
    """
    Returns the primary role name for the user, useful for logic branching.
    """
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user or not user.role:
        return None

    return user.role.role_name


def user_has_role(db: Session, user_id: UUID | str, role_name: str) -> bool:
    """
    Checks if a user is assigned a specific role name.
    """
    user = (
        db.query(User)
        .join(Role, Role.role_id == User.role_id)
        .filter(User.user_id == user_id, Role.role_name == role_name)
        .first()
    )

    return user is not None
