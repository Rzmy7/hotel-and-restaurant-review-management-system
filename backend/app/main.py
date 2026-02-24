from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from starlette.middleware.sessions import SessionMiddleware
from pydantic import BaseModel, AnyHttpUrl, EmailStr, Field
import json
import os
from pathlib import Path
from dotenv import load_dotenv
import secrets
from datetime import datetime, timedelta

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
# Local modules (FIXED IMPORTS)
# These files exist inside backend/app/
# ----------------------
from app.auth_utils import hash_password, verify_password
from app.email_utils import send_reset_email
from app.oauth import oauth

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

# ----------------------
# Load environment + session
# ----------------------
load_dotenv()
app.add_middleware(SessionMiddleware, secret_key=os.getenv("SECRET_KEY", "dev-secret"))

# ----------------------
# 3. Health Check / Root Endpoint
# ----------------------
@app.get("/", tags=["Health"])
async def root():
    return {"message": "API is online", "status": "healthy"}


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
def signup(payload: SignupModel):
    users = load_users()
    for u in users:
        if u["email"].lower() == payload.email.lower():
            raise HTTPException(status_code=400, detail="Email already exists")

    new_user = {
        "id": (users[-1]["id"] + 1) if users else 1,
        "name": payload.name,
        "email": payload.email,
        "password": hash_password(payload.password),
        "google_id": None,
        "reset_token": None,
        "reset_token_expiry": None,
        "role": "staff",
    }

    users.append(new_user)
    save_users(users)

    return {
        "message": "User registered successfully",
        "user": {
            "id": new_user["id"],
            "name": new_user["name"],
            "email": new_user["email"],
            "role": new_user["role"],
        },
    }


@app.post("/login")
def login(payload: LoginModel):
    users = load_users()
    for u in users:
        if u["email"].lower() == payload.email.lower():
            if u.get("password") and verify_password(payload.password, u.get("password")):
                return {
                    "message": "Login successful",
                    "user": {
                        "id": u["id"],
                        "name": u["name"],
                        "email": u["email"],
                        "role": u.get("role", "staff"),
                    },
                }
            break
    raise HTTPException(status_code=401, detail="Invalid credentials")


# ----------------------
# Google OAuth routes
# ----------------------
@app.get("/login/google")
async def login_google(request: Request):
    redirect_uri = request.url_for("auth_google")
    return await oauth.google.authorize_redirect(request, redirect_uri)


@app.get("/auth/google")
async def auth_google(request: Request):
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


@app.get("/check-session")
def check_session(request: Request):
    user = request.session.get("user")
    if user:
        return {"user": user}
    return {"user": None}


# ----------------------
# Forgot / Reset password
# ----------------------
@app.post("/forgot-password")
def forgot_password(payload: EmailModel):
    users = load_users()
    for u in users:
        if u["email"].lower() == payload.email.lower():
            token = secrets.token_hex(16)
            expiry = (datetime.utcnow() + timedelta(hours=1)).isoformat()
            u["reset_token"] = token
            u["reset_token_expiry"] = expiry
            save_users(users)

            reset_link = f"http://localhost:5173/reset-password/{token}"

            print(f"\n{'='*60}")
            print(f"PASSWORD RESET LINK for {u['email']}:")
            print(f"{reset_link}")
            print(f"{'='*60}\n")

            try:
                send_reset_email(u["email"], reset_link)
                print(f"[info] Reset email sent successfully to {u['email']}")
            except Exception as exc:
                print(f"[warn] send_reset_email failed: {exc}")

            return {"message": "Reset link sent"}

    raise HTTPException(status_code=404, detail="User not found")


@app.post("/reset-password/{token}")
def reset_password(token: str, payload: ResetModel):
    users = load_users()
    for u in users:
        if u.get("reset_token") == token:
            if not u.get("reset_token_expiry"):
                raise HTTPException(status_code=400, detail="Invalid token")

            expiry = datetime.fromisoformat(u["reset_token_expiry"])
            if expiry < datetime.utcnow():
                raise HTTPException(status_code=400, detail="Token expired")

            u["password"] = hash_password(payload.new_password)
            u["reset_token"] = None
            u["reset_token_expiry"] = None
            save_users(users)
            return {"message": "Password reset successful"}

    raise HTTPException(status_code=400, detail="Invalid token")


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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
