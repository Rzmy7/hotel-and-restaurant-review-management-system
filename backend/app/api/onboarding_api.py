from fastapi import APIRouter, Depends
from app.auth_utils import get_current_user
from app.db import get_db

router = APIRouter()

@router.post("/onboarding/skip")
def skip_onboarding(user=Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE users
        SET onboarding_completed = 1
        WHERE user_id = ?
    """, (user["user_id"],))

    conn.commit()
    conn.close()

    return {"message": "Skipped"}