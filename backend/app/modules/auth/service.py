"""
Auth service — login, OAuth, and email logic.

Merged from auth_service.py, email_service.py, and oauth_service.py.
"""

from datetime import datetime
import smtplib
from email.mime.text import MIMEText

from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from authlib.integrations.starlette_client import OAuth

from app.core.config import (
    SMTP_EMAIL, SMTP_PASSWORD, SMTP_HOST, SMTP_PORT,
    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
)
from app.core.security import verify_password, create_access_token
from app.modules.auth.models import User
from app.modules.auth.repository import get_user_primary_role


# ── Login ───────────────────────────────────────────────────────────

def login_user(db: Session, email: str, password: str) -> dict:
    """Authenticate a user by email/password and return a JWT token."""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    if not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password login not available for this account",
        )

    if not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    role = get_user_primary_role(db, user.user_id)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no assigned role",
        )

    user.last_login_at = datetime.utcnow()
    db.commit()

    access_token = create_access_token(
        user_id=str(user.user_id),
        role=role,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": str(user.user_id),
            "email": user.email,
            "full_name": user.full_name,
            "role": role,
        },
    }


# ── Emails ──────────────────────────────────────────────────────────

def send_reset_email(to_email: str, link: str) -> None:
    """Send a password-reset email to the given address."""
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        raise RuntimeError(
            "SMTP is not configured (SMTP_EMAIL / SMTP_PASSWORD missing)"
        )

    body = (
        "Click the link to reset your password:\n\n"
        f"{link}\n\n"
        "If you didn't request this, ignore this email."
    )

    msg = MIMEText(body)
    msg["Subject"] = "Hotel System Password Reset"
    msg["From"] = SMTP_EMAIL
    msg["To"] = to_email

    server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
    try:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.sendmail(SMTP_EMAIL, [to_email], msg.as_string())
    finally:
        server.quit()


# ── OAuth ───────────────────────────────────────────────────────────

oauth = OAuth()

if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET:
    oauth.register(
        name="google",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )
