from sqlalchemy.orm import Session
from app.models import User


def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()


def create_user(
    db: Session,
    email: str,
    password_hash: str | None,
    full_name: str | None = None,
    phone: str | None = None,
    profile_image_url: str | None = None,
    is_email_verified: bool = False,
):
    user = User(
        email=email,
        password_hash=password_hash,
        full_name=full_name,
        phone=phone,
        profile_image_url=profile_image_url,
        is_email_verified=is_email_verified,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user