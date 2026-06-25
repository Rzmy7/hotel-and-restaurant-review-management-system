from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session
from sqlalchemy import text
import secrets
import os

from app.core.config import FRONTEND_URL
from app.modules.auth.constants.roles import TENANT as TENANT_ROLE

from app.database.session import get_db
from app.modules.user.repositories.users_repo import get_user_by_email, create_user
from app.modules.auth.repositories.roles_repo import assign_role_to_user, get_user_role_names
from app.modules.auth.services.auth_service import login_user, verify_login_2fa
from app.modules.auth.utils.auth_utils import hash_password, verify_password
from app.modules.auth.utils.email_utils import send_reset_email
from app.modules.auth.schemas.auth_schemas import SignupModel, LoginModel, LoginTwoFactorModel, EmailModel, ResetModel
from app.core.security import decode_access_token, create_access_token
from app.core.validations.signup_validator import validate_signup_payload
from app.core.validations.login_validator import validate_login_payload, validate_login_otp_code
from app.modules.source.models import Tenant
from app.modules.auth.dependencies.auth_permissions import require_admin
import hashlib

router = APIRouter(tags=["Authentication"])
security = HTTPBearer()

PASSWORD_RESET_EXPIRE_MINUTES = 60

def token_sha256(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def as_utc(dt: datetime | None) -> datetime | None:
    """Normalize naive/aware datetimes to UTC-aware for safe comparison."""
    if dt is None:
        return None
    if dt.tzinfo is None or dt.tzinfo.utcoffset(dt) is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

@router.post("/signup", status_code=201, summary="Register a new user account")
def signup(payload: SignupModel, db: Session = Depends(get_db)):
    """Create a new tenant user account. Returns a JWT access token on success."""
    validated = validate_signup_payload(payload.name, payload.email, payload.password)

    existing_user = get_user_by_email(db, validated["email"])
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already exists in database"
        )
    name_parts = validated["name"].split(" ", 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else None

    # Create the user with the default role (TENANT is assigned in create_user repo)
    user = create_user(
        db=db,
        email=validated["email"],
        password_hash=hash_password(validated["password"]),
        first_name=first_name,
        last_name=last_name,
        is_email_verified=False,
    )

    # Create the tenant workspace with the user's ID and default plan (Free=1)
    new_tenant = Tenant(
        tenant_id=user.user_id,
        plan="1"
    )
    db.add(new_tenant)

    # Initialize feature usage rows for the new user
    db.execute(
        text("""
            INSERT INTO dbo.user_feature_usage (user_id, feature_id, used_quantity, updated_at)
            SELECT :user_id, f.feature_id, 0, GETUTCDATE()
            FROM dbo.features f
            WHERE NOT EXISTS (
                SELECT 1 FROM dbo.user_feature_usage 
                WHERE user_id = :user_id AND feature_id = f.feature_id
            )
        """),
        {"user_id": str(user.user_id)}
    )

    db.commit()
    db.refresh(new_tenant)

    # ── Send welcome notification ──
    try:
        from app.services.notification_helpers import notify_welcome
        display_name = f"{first_name} {last_name}".strip() if last_name else first_name
        notify_welcome(str(user.user_id), display_name)
    except Exception:
        pass  # Best-effort

    roles = get_user_role_names(db, user.user_id)
    
    # Generate token for the new user (organization_id will be null)
    access_token = create_access_token(
        user_id=str(user.user_id),
        role=roles[0] if roles else TENANT_ROLE,
        organization_id=None
    )

    return {
        "message": "User registered successfully in database",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.user_id),
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "roles": roles,
            "tenant_id": str(new_tenant.tenant_id),
        },
    }

@router.post("/login", summary="Authenticate and obtain a JWT")
def login(payload: LoginModel, db: Session = Depends(get_db)):
    """Validate email/password credentials and return a JWT access token."""
    validated = validate_login_payload(payload.email, payload.password)
    result = login_user(
        db=db,
        email=validated["email"],
        password=validated["password"]
    )
    return {
        "message": "Login successful",
        **result
    }

@router.post("/login/2fa", summary="Complete two-factor authentication")
def verify_login_two_factor(payload: LoginTwoFactorModel, db: Session = Depends(get_db)):
    """Verify a TOTP/OTP code to complete the 2FA login flow and receive a JWT."""
    normalized_code = validate_login_otp_code(payload.code)
    result = verify_login_2fa(
        db=db,
        email=payload.email.lower(),
        code=normalized_code,
    )
    return {
        "message": "Login successful",
        **result,
    }

from pydantic import BaseModel
class SwitchOrganizationModel(BaseModel):
    organization_id: str

from app.modules.auth.utils.auth_utils import get_current_user as get_jwt_user

@router.post("/switch-organization", summary="Switch active organization context")
def switch_organization(
    payload: SwitchOrganizationModel,
    db: Session = Depends(get_db),
    current_user = Depends(get_jwt_user)
):
    # Verify the user has access to that organization
    org_query = db.execute(
        text("SELECT TOP 1 organization_id FROM dbo.organization WHERE tenant_id = :tenant_id AND organization_id = :org_id"),
        {"tenant_id": str(current_user.user_id), "org_id": payload.organization_id}
    ).fetchone()
    
    if not org_query:
        raise HTTPException(status_code=403, detail="Organization not found or access denied")
        
    roles = get_user_role_names(db, current_user.user_id)
    
    access_token = create_access_token(
        user_id=str(current_user.user_id),
        role=roles[0] if roles else TENANT_ROLE,
        organization_id=payload.organization_id
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "organization_id": payload.organization_id
    }

@router.post("/forgot-password", summary="Request a password reset email")
def forgot_password(payload: EmailModel, db: Session = Depends(get_db)):
    """Send a one-time password-reset link to the provided email address if it exists."""
    try:
        user = get_user_by_email(db, payload.email.lower())
        if not user:
            return {"message": "If the account exists, a reset link has been sent"}

        raw_token = secrets.token_urlsafe(32)
        token_hash = token_sha256(raw_token)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=PASSWORD_RESET_EXPIRE_MINUTES)


        db.execute(
            text("""
                UPDATE dbo.password_reset_token
                SET used_at = GETUTCDATE()
                WHERE user_id = :user_id AND used_at IS NULL
            """),
            {"user_id": str(user.user_id)}
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
            }
        )
        db.commit()

        reset_link = f"{FRONTEND_URL}/reset-password/{raw_token}"
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

@router.post("/reset-password/{token}", summary="Set a new password using a reset token")
def reset_password(token: str, payload: ResetModel, db: Session = Depends(get_db)):
    """Consume a password-reset token and update the user's password."""
    try:
        token_hash = token_sha256(token)
        token_row = db.execute(
            text("""
                SELECT TOP 1 token_id, user_id, expires_at, used_at
                FROM dbo.password_reset_token
                WHERE token_hash = :token_hash
                ORDER BY created_at DESC
            """),
            {"token_hash": token_hash}
        ).fetchone()

        if not token_row:
            raise HTTPException(status_code=400, detail="Invalid token")
        if token_row.used_at is not None:
            raise HTTPException(status_code=400, detail="Token already used")
        expires_at = as_utc(token_row.expires_at)
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
            }
        )

        db.execute(
            text("""
                UPDATE dbo.password_reset_token
                SET used_at = GETUTCDATE()
                WHERE token_id = :token_id
            """),
            {"token_id": str(token_row.token_id)}
        )
        db.commit()
        # ── Send password changed notification ──
        try:
            from app.services.notification_helpers import notify_password_changed
            notify_password_changed(str(token_row.user_id))
        except Exception:
            pass  # Best-effort
        return {"message": "Password reset successful"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Reset password DB failed: {str(e)}")

@router.get("/test-smtp", tags=["System"], summary="Test SMTP email delivery")
def test_smtp():
    try:
        test_email = os.getenv("SMTP_EMAIL")
        if not test_email:
            return {"error": "SMTP_EMAIL not configured"}
        send_reset_email(test_email, f"{FRONTEND_URL}/test-link-123")
        return {"success": True, "message": f"Test email sent successfully to {test_email}"}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.get("/check-session", summary="Check current session state")
def check_session(request: Request):
    """Return the authenticated user object stored in the current session, if any."""
    user = request.session.get("user")
    if user:
        return {"user": user}
    return {"user": None}


@router.get("/token-check")
def token_check(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Validate a JWT and return decoded claims for debugging/testing."""
    token = credentials.credentials.strip()

    if token.lower().startswith("bearer "):
        token = token[7:].strip()

    if token.count(".") != 2:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format. Paste access_token JWT from /api/auth/login.",
        )

    try:
        claims = decode_access_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or expired.",
        )

    exp = claims.get("exp")
    expires_at_utc = None
    if isinstance(exp, (int, float)):
        expires_at_utc = datetime.utcfromtimestamp(exp).isoformat() + "Z"

    return {
        "valid": True,
        "claims": claims,
        "expires_at_utc": expires_at_utc,
    }

def get_current_user(request: Request):
    user = request.session.get("user")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

@router.get("/admin/dashboard", summary="Admin dashboard access check")
def admin_dashboard(user=Depends(require_admin)):
    return {"message": "Welcome Admin"}
