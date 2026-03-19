"""
Auth repository — user and role data access.

Merged from users_repo.py and roles_repo.py.
"""

from sqlalchemy.orm import Session
from app.modules.auth.models import User, UserRole, Role
from app.constants.roles import TENANT


# ── Users ───────────────────────────────────────────────────────────

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()


def create_user(
    db: Session,
    email: str,
    password_hash: str | None = None,
    full_name: str | None = None,
    phone: str | None = None,
    profile_image_url: str | None = None,
    google_id: str | None = None,
    is_email_verified: bool = False,
):
    # Split full_name into first/last for the actual DB columns
    first_name, last_name = None, None
    if full_name:
        parts = full_name.strip().split(" ", 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else None

    user = User(
        email=email,
        password_hash=password_hash,
        first_name=first_name,
        last_name=last_name,
        phone=phone,
        profile_image_url=profile_image_url,
        google_id=google_id,
        is_email_verified=is_email_verified,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    # Assign TENANT role by default
    role = db.query(Role).filter(Role.role_name == TENANT).first()

    if role:
        user_role = UserRole(
            user_id=user.user_id,
            role_id=role.role_id
        )

        db.add(user_role)
        db.commit()

    return user


# ── Roles ───────────────────────────────────────────────────────────

def get_role_by_name(db: Session, role_name: str):
    return db.query(Role).filter(Role.role_name == role_name).first()


def assign_role_to_user(db: Session, user_id, role_name: str):
    role = get_role_by_name(db, role_name)

    if not role:
        return None

    # check if role already assigned
    existing = (
        db.query(UserRole)
        .filter(
            UserRole.user_id == user_id,
            UserRole.role_id == role.role_id
        )
        .first()
    )

    if existing:
        return existing

    user_role = UserRole(
        user_id=user_id,
        role_id=role.role_id
    )

    db.add(user_role)
    db.commit()
    db.refresh(user_role)

    return user_role


def get_user_role_names(db: Session, user_id):
    rows = (
        db.query(Role.role_name)
        .join(UserRole, UserRole.role_id == Role.role_id)
        .filter(UserRole.user_id == user_id)
        .all()
    )

    return [row[0] for row in rows]


def get_user_primary_role(db: Session, user_id):
    role = (
        db.query(Role.role_name)
        .join(UserRole, UserRole.role_id == Role.role_id)
        .filter(UserRole.user_id == user_id)
        .first()
    )

    if role:
        return role[0]

    return None


def user_has_role(db: Session, user_id, role_name: str):
    role = (
        db.query(UserRole)
        .join(Role, Role.role_id == UserRole.role_id)
        .filter(
            UserRole.user_id == user_id,
            Role.role_name == role_name
        )
        .first()
    )

    return role is not None
