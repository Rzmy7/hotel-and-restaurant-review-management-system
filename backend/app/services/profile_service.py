from sqlalchemy.orm import Session
from app.repositories.users_repo import get_user_profile, update_user_profile


def get_profile(db: Session, user_id):

    user = get_user_profile(db, user_id)

    return {
        "firstName": user.first_name,
        "lastName": user.last_name,
        "email": user.email,
        "phone": user.phone,
        "jobTitle": user.job_title,
        "bio": user.bio,
        "location": user.location,
        "avatar": user.profile_image_url,
        "joinedDate": str(user.created_at),
    }


def update_profile(db: Session, user_id, data):

    user = get_user_profile(db, user_id)

    return update_user_profile(
        db,
        user,
        first_name=data.firstName,
        last_name=data.lastName,
        phone=data.phone,
        job_title=data.jobTitle,
        bio=data.bio,
        location=data.location,
    )