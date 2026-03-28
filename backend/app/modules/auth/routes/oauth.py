"""
Google OAuth routes — GET /login/google, GET /auth/google
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import FRONTEND_URL
from app.database import get_db
from app.core.security import create_access_token
from app.modules.auth.repository import get_user_by_email, create_user, assign_role_to_user, get_user_role_names
from app.modules.auth.services.oauth_service import oauth

router = APIRouter()


@router.get("/login/google")
async def login_google(request: Request):
    if not getattr(oauth, "google", None):
        raise HTTPException(status_code=503, detail="Google OAuth is not configured")
    redirect_uri = request.url_for("auth_google")
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/auth/google")
async def auth_google(request: Request, db: Session = Depends(get_db)):
    token = await oauth.google.authorize_access_token(request)
    user_info = token.get("userinfo") or token

    email = user_info.get("email")
    google_id = user_info.get("sub")

    if not email:
        raise HTTPException(status_code=400, detail="Google did not return an email")

    user = get_user_by_email(db, email.lower())

    if not user:
        user = create_user(
            db=db,
            email=email.lower(),
            password_hash=None,
            full_name=user_info.get("name") or email,
            google_id=google_id,
            is_email_verified=True,
        )
        assign_role_to_user(db, user.user_id, "TENANT")
    else:
        if not user.google_id:
            user.google_id = google_id
            db.commit()

    roles = get_user_role_names(db, user.user_id)

    access_token = create_access_token(
        user_id=str(user.user_id),
        role=roles[0] if roles else "TENANT",
    )

    return RedirectResponse(
        url=f"{FRONTEND_URL}/oauth-success?token={access_token}",
        status_code=302,
    )
