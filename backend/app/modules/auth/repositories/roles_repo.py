from sqlalchemy.orm import Session
from app.modules.auth.models import Role
from app.modules.user.models.user_models import User


# Get role object by role name
def get_role_by_name(db: Session, role_name: str):
    return db.query(Role).filter(Role.role_name == role_name).first()


# Assign role to user
def assign_role_to_user(db: Session, user_id, role_name: str):

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


# Get all roles for a user
def get_user_role_names(db: Session, user_id):

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user or not user.role:
        return []

    return [user.role.role_name]


# Get single primary role (useful for login redirect)
def get_user_primary_role(db: Session, user_id):

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user or not user.role:
        return None

    return user.role.role_name


# Check if user has a specific role
def user_has_role(db: Session, user_id, role_name: str):

    user = (
        db.query(User)
        .join(Role, Role.role_id == User.role_id)
        .filter(User.user_id == user_id, Role.role_name == role_name)
        .first()
    )

    return user is not None
