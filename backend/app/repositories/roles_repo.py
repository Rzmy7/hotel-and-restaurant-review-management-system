from sqlalchemy.orm import Session
from app.models import Role, UserRole


def get_role_by_name(db: Session, role_name: str):
    return db.query(Role).filter(Role.role_name == role_name).first()


def assign_role_to_user(db: Session, user_id, role_name: str):
    role = get_role_by_name(db, role_name)
    if not role:
        return None

    existing = (
        db.query(UserRole)
        .filter(UserRole.user_id == user_id, UserRole.role_id == role.role_id)
        .first()
    )
    if existing:
        return existing

    user_role = UserRole(user_id=user_id, role_id=role.role_id)
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