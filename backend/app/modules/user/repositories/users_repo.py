from sqlalchemy.orm import Session
from app.modules.auth.models import User, Role
from app.modules.auth.constants.roles import TENANT


def get_user_by_email(db: Session, email: str):
    # Find a user using email
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id):
    return db.query(User).filter(User.user_id == user_id).first()


def create_user(
    db: Session,
    email: str,
    password_hash: str | None = None,
    first_name: str | None = None,
    last_name: str | None = None,
    phone: str | None = None,
    job_title: str | None = None,
    bio: str | None = None,
    location: str | None = None,
    profile_image_url: str | None = None,
    google_id: str | None = None,
    is_email_verified: bool = False,
):
    
    # Get default role (TENANT)
    role = db.query(Role).filter(Role.role_name == TENANT).first()
    if not role:
        # Fallback case — if roles table isn't seeded correctly
        raise ValueError(f"CRITICAL: Default role '{TENANT}' not found in Roles table. Please seed the database.")


    # Create user with mandatory role_id
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
        role_id=role.role_id 
    )

    # Save user to DB
    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def get_user_profile(db: Session, user_id):
    # Get full user profile by ID
    return db.query(User).filter(User.user_id == user_id).first()

def update_user_profile(
    db: Session,
    user: User,
    first_name: str | None = None,
    last_name: str | None = None,
    phone: str | None = None,
    job_title: str | None = None,
    bio: str | None = None,
    location: str | None = None,
    profile_image_url: str | None = None,
):

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

def update_user_password(db: Session, user: User, password_hash: str):
    user.password_hash = password_hash
    db.commit()
    db.refresh(user)
    return user
