# app/scripts/seed_roles.py

from sqlalchemy.orm import Session

try:
    from app.core.database import SessionLocal
except ImportError:
    from app.database import SessionLocal

try:
    from app.modules.auth.models.auth_models import Role
except ImportError:
    from app.modules.auth.models import Role

from app.modules.auth.constants.roles import SYSTEM_ADMIN, TENANT


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
