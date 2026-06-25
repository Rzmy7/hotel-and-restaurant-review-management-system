"""
Password reset routes — POST /forgot-password, POST /reset-password/{token}
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import PASSWORD_RESET_EXPIRE_MINUTES, FRONTEND_URL
from app.database import get_db
from app.core.security import hash_password
from app.modules.auth.schemas import EmailModel, ResetModel
from app.modules.auth.repository import get_user_by_email
from app.modules.auth.services.email_service import send_reset_email

router = APIRouter()

# Creates SHA256 hash of random password reset tokens
def _token_sha256(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _as_utc(dt: datetime | None) -> datetime | None:
    """Normalize naive/aware datetimes to UTC-aware for safe comparison."""
    if dt is None:
        return None
    if dt.tzinfo is None or dt.tzinfo.utcoffset(dt) is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


@router.post("/forgot-password")
def forgot_password(payload: EmailModel, db: Session = Depends(get_db)):
    try:
        user = get_user_by_email(db, payload.email.lower())

        if not user:
            raise HTTPException(status_code=404, detail="No account found with this email address.")

        raw_token = secrets.token_urlsafe(32)
        token_hash = _token_sha256(raw_token)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=PASSWORD_RESET_EXPIRE_MINUTES)

        db.execute(
            text("""
                UPDATE dbo.password_reset_token
                SET used_at = GETUTCDATE()
                WHERE user_id = :user_id AND used_at IS NULL
            """),
            {"user_id": str(user.user_id)},
        )

        db.execute(
            text("""
                INSERT INTO dbo.password_reset_token
                    (token_id, user_id, token_hash, expires_at, created_at)
                VALUES
                    (NEWID(), :user_id, :token_hash, :expires_at, GETUTCDATE())
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
                FROM dbo.password_reset_token
                WHERE token_hash = :token_hash
                ORDER BY created_at DESC
            """),
            {"token_hash": token_hash},
        ).fetchone()

        if not token_row:
            raise HTTPException(status_code=400, detail="Invalid token")

        if token_row.used_at is not None:
            raise HTTPException(status_code=400, detail="Token already used")

        expires_at = _as_utc(token_row.expires_at)
        now_utc = datetime.now(timezone.utc)

        if expires_at is None or expires_at < now_utc:
            raise HTTPException(status_code=400, detail="Token expired")

        new_password_hash = hash_password(payload.new_password)

        db.execute(
            text("""
                UPDATE dbo.[user]
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
                UPDATE dbo.password_reset_token
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
