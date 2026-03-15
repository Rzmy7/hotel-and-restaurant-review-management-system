"""
Authentication routes: signup, login, OAuth, password reset.
"""

import hashlib
import os
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import PASSWORD_RESET_EXPIRE_MINUTES, FRONTEND_URL, SMTP_EMAIL
from app.core.database import get_db
from app.modules.auth.schemas import SignupModel, LoginModel, EmailModel, ResetModel
from app.modules.auth.repository import get_user_by_email, create_user, assign_role_to_user, get_user_role_names
from app.modules.auth.service import login_user, send_reset_email, oauth
from app.core.security import hash_password, create_access_token

router = APIRouter(tags=["Auth"])


def _token_sha256(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


# ── Signup ──────────────────────────────────────────────────────────

@router.post("/signup")
def signup(payload: SignupModel, db: Session = Depends(get_db)):
    existing_user = get_user_by_email(db, payload.email.lower())
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already exists in database")

    user = create_user(
        db=db,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        full_name=payload.name,
        is_email_verified=False,
    )

    assigned = assign_role_to_user(db, user.user_id, "TENANT")
    if not assigned:
        raise HTTPException(
            status_code=500,
            detail="User created, but TENANT role not found in roles table",
        )

    roles = get_user_role_names(db, user.user_id)

    return {
        "message": "User registered successfully in database",
        "user": {
            "id": str(user.user_id),
            "name": user.full_name,
            "email": user.email,
            "roles": roles,
        },
    }


# ── Login ───────────────────────────────────────────────────────────

@router.post("/login")
def login(payload: LoginModel, db: Session = Depends(get_db)):
    result = login_user(
        db=db,
        email=payload.email.lower(),
        password=payload.password,
    )
    return {"message": "Login successful", **result}


# ── Google OAuth ────────────────────────────────────────────────────

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


# ── Session check ───────────────────────────────────────────────────

@router.get("/check-session")
def check_session(request: Request):
    user = request.session.get("user")
    if user:
        return {"user": user}
    return {"user": None}


# ── Forgot / Reset password ────────────────────────────────────────

@router.post("/forgot-password")
def forgot_password(payload: EmailModel, db: Session = Depends(get_db)):
    try:
        user = get_user_by_email(db, payload.email.lower())

        if not user:
            return {"message": "If the account exists, a reset link has been sent"}

        raw_token = secrets.token_urlsafe(32)
        token_hash = _token_sha256(raw_token)
        expires_at = datetime.utcnow() + timedelta(minutes=PASSWORD_RESET_EXPIRE_MINUTES)

        db.execute(
            text("""
                UPDATE dbo.password_reset_tokens
                SET used_at = GETUTCDATE()
                WHERE user_id = :user_id AND used_at IS NULL
            """),
            {"user_id": str(user.user_id)},
        )

        db.execute(
            text("""
                INSERT INTO dbo.password_reset_tokens
                    (user_id, token_hash, expires_at, created_at)
                VALUES
                    (:user_id, :token_hash, :expires_at, GETUTCDATE())
            """),
            {
                "user_id": str(user.user_id),
                "token_hash": token_hash,
                "expires_at": expires_at,
            },
        )
        db.commit()

        reset_link = f"{FRONTEND_URL}/reset-password/{raw_token}"

        print(f"\n{'='*60}")
        print(f"DB PASSWORD RESET LINK for {user.email}:")
        print(reset_link)
        print(f"{'='*60}\n")

        try:
            send_reset_email(user.email, reset_link)
            print(f"[info] DB reset email sent successfully to {user.email}")
        except Exception as exc:
            print(f"[warn] send_reset_email failed: {exc}")

        return {"message": "If the account exists, a reset link has been sent"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Forgot password DB failed: {str(e)}")


@router.post("/reset-password/{token}")
def reset_password(token: str, payload: ResetModel, db: Session = Depends(get_db)):
    try:
        token_hash = _token_sha256(token)

        token_row = db.execute(
            text("""
                SELECT TOP 1 token_id, user_id, expires_at, used_at
                FROM dbo.password_reset_tokens
                WHERE token_hash = :token_hash
                ORDER BY created_at DESC
            """),
            {"token_hash": token_hash},
        ).fetchone()

        if not token_row:
            raise HTTPException(status_code=400, detail="Invalid token")

        if token_row.used_at is not None:
            raise HTTPException(status_code=400, detail="Token already used")

        if token_row.expires_at is None or token_row.expires_at < datetime.utcnow():
            raise HTTPException(status_code=400, detail="Token expired")

        new_password_hash = hash_password(payload.new_password)

        db.execute(
            text("""
                UPDATE dbo.users
                SET password_hash = :password_hash,
                    updated_at = GETUTCDATE()
                WHERE user_id = :user_id
            """),
            {
                "password_hash": new_password_hash,
                "user_id": str(token_row.user_id),
            },
        )

        db.execute(
            text("""
                UPDATE dbo.password_reset_tokens
                SET used_at = GETUTCDATE()
                WHERE token_id = :token_id
            """),
            {"token_id": str(token_row.token_id)},
        )

        db.commit()
        return {"message": "Password reset successful"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Reset password DB failed: {str(e)}")


# ── Debug: SMTP test ───────────────────────────────────────────────

@router.get("/test-smtp", tags=["Debug"])
def test_smtp():
    try:
        if not SMTP_EMAIL:
            return {"error": "SMTP_EMAIL not configured"}

        send_reset_email(SMTP_EMAIL, f"{FRONTEND_URL}/test-link-123")
        return {
            "success": True,
            "message": f"Test email sent successfully to {SMTP_EMAIL}",
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
