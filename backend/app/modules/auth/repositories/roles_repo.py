from sqlalchemy.orm import Session
from app.models import Role, UserRole


# --------------------------------------------------
# Get role object by role name
# --------------------------------------------------
def get_role_by_name(db: Session, role_name: str):
    return db.query(Role).filter(Role.role_name == role_name).first()


# --------------------------------------------------
# Assign role to user
# --------------------------------------------------
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


# --------------------------------------------------
# Get all roles for a user
# --------------------------------------------------
def get_user_role_names(db: Session, user_id):

    rows = (
        db.query(Role.role_name)
        .join(UserRole, UserRole.role_id == Role.role_id)
        .filter(UserRole.user_id == user_id)
        .all()
    )

    return [row[0] for row in rows]


# --------------------------------------------------
# Get single primary role (useful for login redirect)
# --------------------------------------------------
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


# --------------------------------------------------
# Check if user has a specific role
# --------------------------------------------------
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