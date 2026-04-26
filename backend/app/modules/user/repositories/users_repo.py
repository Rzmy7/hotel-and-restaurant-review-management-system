"""
User Repository Module
Handles direct database operations for the User entity.
"""

from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session

from app.modules.auth.models import User, Role
from app.modules.auth.constants.roles import TENANT


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Retrieves a user by their email address."""
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: UUID | str) -> Optional[User]:
    """Retrieves a user by their unique identifier."""
    return db.query(User).filter(User.user_id == user_id).first()


def create_user(
    db: Session,
    email: str,
    password_hash: Optional[str] = None,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    phone: Optional[str] = None,
    job_title: Optional[str] = None,
    bio: Optional[str] = None,
    location: Optional[str] = None,
    profile_image_url: Optional[str] = None,
    google_id: Optional[str] = None,
    is_email_verified: bool = False,
) -> User:
    """
    Creates a new user record with a default role.
    """
    # Fetch default role from database
    role = db.query(Role).filter(Role.role_name == TENANT).first()
    if not role:
        raise ValueError(
            f"CRITICAL: Default role '{TENANT}' not found. Please seed the database."
        )

    user = User(
        email=email,
        password_hash=password_hash,
        first_name=first_name,
        last_name=last_name,
        phone=phone,
        job_title=job_title,
        bio=bio,
        location=location,
        profile_image_url=profile_image_url,
        google_id=google_id,
        is_email_verified=is_email_verified,
        role_id=role.role_id,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def get_user_profile(db: Session, user_id: UUID | str) -> Optional[User]:
    """Retrieves a user profile by ID, typically for profile management."""
    return db.query(User).filter(User.user_id == user_id).first()


def update_user_profile(
    db: Session,
    user: User,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    phone: Optional[str] = None,
    job_title: Optional[str] = None,
    bio: Optional[str] = None,
    location: Optional[str] = None,
    profile_image_url: Optional[str] = None,
) -> User:
    """
    Updates the fields of an existing User object and persists changes.
    """
    if first_name is not None:
        user.first_name = first_name
    if last_name is not None:
        user.last_name = last_name
    if phone is not None:
        user.phone = phone
    if job_title is not None:
        user.job_title = job_title
    if bio is not None:
        user.bio = bio
    if location is not None:
        user.location = location
    if profile_image_url is not None:
        user.profile_image_url = profile_image_url

    db.commit()
    db.refresh(user)

    return user


def update_user_password(db: Session, user: User, password_hash: str) -> User:
    """Updates the password hash for a specific user."""
    user.password_hash = password_hash
    db.commit()
    db.refresh(user)
    return user
