"""
Login route — POST /login
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.auth.schemas import LoginModel
from app.modules.auth.services.login_service import login_user

router = APIRouter()


@router.post("/login")
def login(payload: LoginModel, db: Session = Depends(get_db)):
    result = login_user(
        db=db,
        email=payload.email.lower(),
        password=payload.password,
    )
    return {"message": "Login successful", **result}
