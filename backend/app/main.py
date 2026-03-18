from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from starlette.middleware.sessions import SessionMiddleware
from pydantic import BaseModel, AnyHttpUrl, EmailStr, Field
from sqlalchemy import text
from sqlalchemy.orm import Session
import json
import os
import hashlib
from pathlib import Path
from dotenv import load_dotenv
import secrets
from datetime import datetime, timedelta

from app import db
from app.repositories.users_repo import get_user_by_email, create_user
from app.repositories.roles_repo import assign_role_to_user, get_user_role_names
from app.auth.auth_service import login_user

from app.auth_utils import hash_password, verify_password
from app.email_utils import send_reset_email
from app.oauth import oauth
from app.db import get_db

from app.repositories.groups_repo import add_member_to_group, create_group, get_user_group_role
from app.auth_permissions import require_group_manager, require_group_member

from app.auth.auth_permissions import require_admin

from app.api.profile_routes import router as profile_router


# to identify
print("RUNNING: backend/app/main.py")

# ----------------------
# Optional scraping integration
# ----------------------
try:
    # If your folder is backend/app/test/scraping/booking.py
    from app.test.scraping.booking import scrape_booking
except Exception:
    def scrape_booking(url, headless=True):
        raise RuntimeError("scrape_booking not available in this environment")

# ----------------------
# Local modules
# ----------------------

app = FastAPI(
    title="My Project API",
    description="A comprehensive API built with FastAPI",
    version="1.0.0",
)

# ----------------------
# 1. Middleware Configuration
# ----------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



app.include_router(profile_router)

# ----------------------
# Load environment + session
# ----------------------
load_dotenv()
app.add_middleware(SessionMiddleware, secret_key=os.getenv("SECRET_KEY", "dev-secret"))

# ----------------------
# Password reset config
# ----------------------
PASSWORD_RESET_EXPIRE_MINUTES = 60


def token_sha256(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


# ----------------------
# 3. Health Check / Root Endpoint
# ----------------------
@app.get("/", tags=["Health"])
async def root():
    return {"message": "API is online", "status": "healthy"}


@app.get("/which-main", tags=["Debug"])
def which_main():
    return {"message": "backend/app/main.py is running"}


@app.get("/db-test", tags=["Debug"])
def db_test(db: Session = Depends(get_db)):
    try:
        result = db.execute(text("SELECT 1 AS ok"))
        row = result.fetchone()
        return {
            "message": "Database connection successful",
            "result": row[0]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB connection failed: {str(e)}")


# ----------------------
# Scraping endpoint models + routes
# ----------------------
class BookingScrapeRequest(BaseModel):
    url: AnyHttpUrl
    headless: bool = True


@app.post("/scrape/booking", tags=["Scraping"])
async def start_booking_scrape(payload: BookingScrapeRequest, background_tasks: BackgroundTasks):
    """Kick off a Booking.com scrape from the front end.

    Runs in a background task so the HTTP request returns immediately.
    """
    try:
        background_tasks.add_task(scrape_booking, str(payload.url), payload.headless)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to start scrape: {exc}")

    return {
        "message": "Booking.com scrape started",
        "url": str(payload.url),
        "headless": payload.headless,
    }


@app.get("/reviews", tags=["Reviews"])
async def get_reviews():
    """Get all scraped reviews from the analyzed data file."""
    try:
        data_file = Path(__file__).parent / "analyzed_data_frontend.json"

        if not data_file.exists():
            return {"reviews": [], "message": "No reviews found yet. Run a scrape first."}

        with open(data_file, "r", encoding="utf-8") as f:
            reviews = json.load(f)

        return {"reviews": reviews, "total": len(reviews)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading reviews: {str(e)}")


# ----------------------
# File to store users (development-only)
# ----------------------
USER_FILE = Path(__file__).parent / "users.json"


def load_users():
    if not USER_FILE.exists():
        return []
    with open(USER_FILE, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except Exception:
            return []


def save_users(users):
    with open(USER_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=4)


# ----------------------
# Pydantic models
# ----------------------
class SignupModel(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=72)


class LoginModel(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=72)


class EmailModel(BaseModel):
    email: EmailStr


class ResetModel(BaseModel):
    new_password: str = Field(..., min_length=1, max_length=72)


# ----------------------
# Auth endpoints (file-backed)
# ----------------------
@app.post("/signup")
def signup(payload: SignupModel, db: Session = Depends(get_db)):

    existing_user = get_user_by_email(db, payload.email.lower())
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already exists in database"
        )

    # -----------------------------
    # Split Full Name
    # -----------------------------
    name_parts = payload.name.strip().split(" ", 1)

    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else None

    # -----------------------------
    # Create User
    # -----------------------------
    user = create_user(
        db=db,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        first_name=first_name,
        last_name=last_name,
        is_email_verified=False,
    )

    # -----------------------------
    # Assign Default Role
    # -----------------------------
    assigned = assign_role_to_user(db, user.user_id, "TENANT")

    if not assigned:
        raise HTTPException(
            status_code=500,
            detail="User created, but TENANT role not found in roles table"
        )

    roles = get_user_role_names(db, user.user_id)

    return {
        "message": "User registered successfully in database",
        "user": {
            "id": str(user.user_id),
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "roles": roles,
        },
    }



# temporary DB login route
'''
@app.post("/login")
def login(payload: LoginModel, db: Session = Depends(get_db)):
    user = get_user_by_email(db, payload.email.lower())

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    roles = get_user_role_names(db, user.user_id)
    
    
    return {
        "message": "Database login successful",
        "user": {
            "id": str(user.user_id),
            "name": user.full_name,
            "email": user.email,
            "roles": roles,
        },
    }
'''

@app.post("/login")
def login(payload: LoginModel, db: Session = Depends(get_db)):

    result = login_user(
        db=db,
        email=payload.email.lower(),  #generate JWT token
        password=payload.password
    )

    return {
        "message": "Login successful",
        **result
    }


# ----------------------
# Google OAuth routes
# ----------------------
@app.get("/login/google")
async def login_google(request: Request):
    if not getattr(oauth, "google", None):
        raise HTTPException(status_code=503, detail="Google OAuth is not configured")
    redirect_uri = request.url_for("auth_google")
    return await oauth.google.authorize_redirect(request, redirect_uri)


"""
@app.get("/auth/google")
async def auth_google(request: Request):
    if not getattr(oauth, "google", None):
        raise HTTPException(status_code=503, detail="Google OAuth is not configured")
    token = await oauth.google.authorize_access_token(request)
    user_info = token.get("userinfo") or token

    email = user_info.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Google did not return an email")

    users = load_users()
    existing = None
    for u in users:
        if u["email"].lower() == email.lower():
            existing = u
            break

    if not existing:
        new_user = {
            "id": (users[-1]["id"] + 1) if users else 1,
            "name": user_info.get("name") or user_info.get("email"),
            "email": email,
            "password": None,
            "google_id": user_info.get("sub"),
            "reset_token": None,
            "reset_token_expiry": None,
            "role": "staff",
        }
        users.append(new_user)
        save_users(users)
        existing = new_user

    request.session["user"] = {
        "id": existing["id"],
        "name": existing["name"],
        "email": existing["email"],
        "role": existing.get("role", "staff"),
    }

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return RedirectResponse(url=f"{frontend_url}/dashboard", status_code=302)
    """

@app.get("/auth/google")
async def auth_google(request: Request, db: Session = Depends(get_db)):

    token = await oauth.google.authorize_access_token(request)
    user_info = token.get("userinfo") or token

    email = user_info.get("email")
    google_id = user_info.get("sub")

    if not email:
        raise HTTPException(status_code=400, detail="Google did not return an email")

    # ---------------------------
    # Check existing user
    # ---------------------------
    user = get_user_by_email(db, email.lower())

    if not user:

        # Create new Google user
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
        # If user exists but google_id is missing → update it
        if not user.google_id:
            user.google_id = google_id
            db.commit()

    # ---------------------------
    # Get roles
    # ---------------------------
    roles = get_user_role_names(db, user.user_id)

    # ---------------------------
    # Create JWT token
    # ---------------------------
    from app.auth.jwt_service import create_access_token

    access_token = create_access_token(
        {
            "user_id": str(user.user_id),
            "email": user.email
        },
        role=roles[0] if roles else "TENANT"
    )

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

    return RedirectResponse(
        url=f"{frontend_url}/oauth-success?token={access_token}",
        status_code=302
    )


@app.get("/check-session")
def check_session(request: Request):
    user = request.session.get("user")
    if user:
        return {"user": user}
    return {"user": None}


# ----------------------
# Forgot / Reset password (database-based)
# ----------------------
@app.post("/forgot-password")
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

        print(f"\n{'='*60}")
        print(f"DB PASSWORD RESET LINK for {user.email}:")
        print(reset_link)
        print(f"{'='*60}\n")

        try:
            send_reset_email(user.email, reset_link)
            print(f"[info] DB reset email sent successfully to {user.email}")
        except Exception as exc:
            print(f"[warn] send_reset_email failed: {exc}")

        return {
            "message": "If the account exists, a reset link has been sent",
            
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Forgot password DB failed: {str(e)}")



@app.post("/reset-password/{token}")
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
                UPDATE dbo.users
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




@app.get("/test-smtp", tags=["Debug"])
def test_smtp():
    try:
        test_email = os.getenv("SMTP_EMAIL")
        if not test_email:
            return {"error": "SMTP_EMAIL not configured"}

        send_reset_email(test_email, "http://localhost:5173/test-link-123")
        return {
            "success": True,
            "message": f"Test email sent successfully to {test_email}",
            "smtp_host": os.getenv("SMTP_HOST"),
            "smtp_port": os.getenv("SMTP_PORT"),
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "smtp_email": os.getenv("SMTP_EMAIL"),
            "smtp_host": os.getenv("SMTP_HOST"),
            "smtp_port": os.getenv("SMTP_PORT"),
        }


def get_current_user(request: Request):
    user = request.session.get("user")

    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return user


@app.post("/groups")
def create_group_api(
    group_name: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):

    group = create_group(db, group_name, current_user["id"])

    add_member_to_group(
        db,
        group.group_id,
        current_user["id"],
        "GROUP_MANAGER"
    )

    return {
        "message": "Group created successfully",
        "group_id": str(group.group_id),
        "group_name": group.group_name
    }


@app.post("/groups/{group_id}/members")
def add_member_api(
    group_id: str,
    user_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):

    require_group_manager(group_id, current_user, db)

    member = add_member_to_group(
        db,
        group_id,
        user_id,
        "GROUP_MEMBER"
    )

    return {
        "message": "User added to group",
        "group_id": group_id,
        "user_id": user_id,
        "role": member.role
    }


@app.get("/groups/{group_id}/my-role")
def get_my_group_role(
    group_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):

    role = get_user_group_role(db, group_id, current_user["id"])

    return {
        "group_id": group_id,
        "role": role
    }


@app.get("/groups/{group_id}/reviews")
def get_group_reviews(
    group_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):

    require_group_member(group_id, current_user, db)

    return {
        "message": "You can access group reviews"
    }


@app.get("/admin/dashboard")
def admin_dashboard(user=Depends(require_admin)):
    return {"message": "Welcome Admin"}



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)