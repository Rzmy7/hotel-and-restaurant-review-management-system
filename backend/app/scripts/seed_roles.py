# app/scripts/seed_roles.py

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.modules.auth.models import Role
from app.constants.roles import SYSTEM_ADMIN, TENANT


def seed_roles():
    db: Session = SessionLocal()

    roles = [SYSTEM_ADMIN, TENANT]

    for role_name in roles:

        role_exists = db.query(Role).filter(Role.role_name == role_name).first()

        if not role_exists:
            role = Role(role_name=role_name)
            db.add(role)

    db.commit()
    db.close()


if __name__ == "__main__":
    seed_roles()