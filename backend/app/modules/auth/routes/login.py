"""
Login route — POST /login
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.auth.schemas import LoginModel, LoginTwoFactorModel
from app.modules.auth.services.auth_service import login_user, verify_login_2fa

router = APIRouter()


@router.post("/login")
def login(payload: LoginModel, db: Session = Depends(get_db)):
    result = login_user(
        db=db,
        email=payload.email.lower(),
        password=payload.password,
    )
    # Return 202 if 2FA is needed, otherwise 200
    if result.get("require_2fa"):
        return result
    return {"message": "Login successful", **result}


@router.post("/login/2fa")
def verify_login_two_factor(
    payload: LoginTwoFactorModel, db: Session = Depends(get_db)
):
    result = verify_login_2fa(db=db, email=payload.email.lower(), code=payload.code)
    return {"message": "Login successful", **result}
