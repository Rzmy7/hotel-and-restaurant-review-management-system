from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta
import secrets
import os

from app.database.session import get_db
from app.modules.user.repositories.users_repo import get_user_by_email, create_user
from app.modules.auth.repositories.roles_repo import assign_role_to_user, get_user_role_names
from app.modules.auth.services.auth_service import login_user
from app.modules.auth.utils.auth_utils import hash_password, verify_password
from app.modules.auth.utils.email_utils import send_reset_email
from app.modules.auth.schemas.auth_schemas import SignupModel, LoginModel, EmailModel, ResetModel
from app.modules.source.models import Tenant
from app.modules.auth.dependencies.auth_permissions import require_admin
import hashlib

router = APIRouter()

PASSWORD_RESET_EXPIRE_MINUTES = 60

def token_sha256(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

@router.post("/signup")
def signup(payload: SignupModel, db: Session = Depends(get_db)):
    existing_user = get_user_by_email(db, payload.email.lower())
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already exists in database"
        )
    name_parts = payload.name.strip().split(" ", 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else None

    user = create_user(
        db=db,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        first_name=first_name,
        last_name=last_name,
        is_email_verified=False,
    )

        
    # Create the top-level tenant workspace for this user
    new_tenant = Tenant(
        tenant_name=f"{first_name}'s Tenant",
        tenant_owner_id=user.user_id
    )
    db.add(new_tenant)
    db.commit()
    db.refresh(new_tenant)

    roles = get_user_role_names(db, user.user_id)
    return {
        "message": "User registered successfully in database",
        "user": {
            "id": str(user.user_id),
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "roles": roles,
            "tenant_id": str(new_tenant.tenant_id),
        },
    }

@router.post("/login")
def login(payload: LoginModel, db: Session = Depends(get_db)):
    result = login_user(
        db=db,
        email=payload.email.lower(),
        password=payload.password
    )
    return {
        "message": "Login successful",
        **result
    }

@router.post("/forgot-password")
def forgot_password(payload: EmailModel, db: Session = Depends(get_db)):
    try:
        user = get_user_by_email(db, payload.email.lower())
        if not user:
            return {"message": "If the account exists, a reset link has been sent"}

        raw_token = secrets.token_urlsafe(32)
        token_hash = token_sha256(raw_token)
        expires_at = datetime.utcnow() + timedelta(minutes=PASSWORD_RESET_EXPIRE_MINUTES)

        db.execute(
            text("""
                UPDATE dbo.password_reset_tokens
                SET used_at = GETUTCDATE()
                WHERE user_id = :user_id AND used_at IS NULL
            """),
            {"user_id": str(user.user_id)}
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
            }
        )
        db.commit()

        reset_link = f"http://localhost:5173/reset-password/{raw_token}"
        try:
            send_reset_email(user.email, reset_link)
        except Exception as exc:
            print(f"[warn] send_reset_email failed: {exc}")

        return {
            "message": "If the account exists, a reset link has been sent",
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Forgot password DB failed: {str(e)}")

@router.post("/reset-password/{token}")
def reset_password(token: str, payload: ResetModel, db: Session = Depends(get_db)):
    try:
        token_hash = token_sha256(token)
        token_row = db.execute(
            text("""
                SELECT TOP 1 token_id, user_id, expires_at, used_at
                FROM dbo.password_reset_tokens
                WHERE token_hash = :token_hash
                ORDER BY created_at DESC
            """),
            {"token_hash": token_hash}
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
                UPDATE dbo.[user]
                SET password_hash = :password_hash,
                    updated_at = GETUTCDATE()
                WHERE user_id = :user_id
            """),
            {
                "password_hash": new_password_hash,
                "user_id": str(token_row.user_id),
            }
        )

        db.execute(
            text("""
                UPDATE dbo.password_reset_tokens
                SET used_at = GETUTCDATE()
                WHERE token_id = :token_id
            """),
            {"token_id": str(token_row.token_id)}
        )
        db.commit()
        return {"message": "Password reset successful"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Reset password DB failed: {str(e)}")

@router.get("/test-smtp", tags=["Debug"])
def test_smtp():
    try:
        test_email = os.getenv("SMTP_EMAIL")
        if not test_email:
            return {"error": "SMTP_EMAIL not configured"}
        send_reset_email(test_email, "http://localhost:5173/test-link-123")
        return {"success": True, "message": f"Test email sent successfully to {test_email}"}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.get("/check-session")
def check_session(request: Request):
    user = request.session.get("user")
    if user:
        return {"user": user}
    return {"user": None}

def get_current_user(request: Request):
    user = request.session.get("user")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

@router.get("/admin/dashboard")
def admin_dashboard(user=Depends(require_admin)):
    return {"message": "Welcome Admin"}
