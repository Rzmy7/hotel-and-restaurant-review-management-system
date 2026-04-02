from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.modules.auth.utils.auth_utils import get_current_user
from app.database.session import get_db

router = APIRouter()

@router.post("/onboarding/skip")
def skip_onboarding(user=Depends(get_current_user), db: Session = Depends(get_db)):
    db.execute(text("""
        UPDATE users
        SET onboarding_completed = 1
        WHERE user_id = :user_id
    """), {"user_id": user.user_id})

    db.commit()

    return {"message": "Skipped"}
