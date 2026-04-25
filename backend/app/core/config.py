"""
Centralised application configuration.

Every environment variable, connection string, and app-wide constant
lives here — one single source of truth for the entire backend.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ── General ─────────────────────────────────────────────────────────
SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret")
FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

# ── SQLAlchemy (used by auth / users / groups / roles) ──────────────
DATABASE_URL: str | None = os.getenv("DATABASE_URL")

# ── PYODBC (used by reviews / dashboard / admin / competitors) ──────
DB_DRIVER: str = os.getenv("DB_DRIVER", "ODBC Driver 17 for SQL Server")
DB_SERVER: str = os.getenv("DB_SERVER", "")
DB_NAME: str = os.getenv("DB_NAME", "")
DB_UID: str = os.getenv("DB_UID", "")
DB_PWD: str = os.getenv("DB_PWD", "")
DB_ENCRYPT: str = os.getenv("DB_ENCRYPT", "yes")

# ── SMTP ────────────────────────────────────────────────────────────
SMTP_EMAIL: str | None = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD: str | None = os.getenv("SMTP_PASSWORD")
SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))

# ── Google OAuth ────────────────────────────────────────────────────
GOOGLE_CLIENT_ID: str | None = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET: str | None = os.getenv("GOOGLE_CLIENT_SECRET")

# ── JWT ─────────────────────────────────────────────────────────────
JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "CHANGE_THIS_SECRET_KEY")
JWT_ALGORITHM: str = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

# ── Google Generative AI ────────────────────────────────────────────
GENAI_KEY: str | None = os.getenv("GENAI_KEY")

# ── Password reset ──────────────────────────────────────────────────
PASSWORD_RESET_EXPIRE_MINUTES: int = 60

# ── Microservices ───────────────────────────────────────────────────
_IN_DOCKER = os.path.exists("/.dockerenv")
_IS_PROD = "reviewmate.live" in FRONTEND_URL or _IN_DOCKER
_DEFAULT_SCRAPER = "https://scrape.reviewmate.live" if _IS_PROD else "http://127.0.0.1:8001"
_DEFAULT_EMBED = "https://embed.reviewmate.live" if _IS_PROD else "http://127.0.0.1:8002"

SCRAPER_ENGINE_URL: str = os.getenv("SCRAPER_ENGINE_URL", _DEFAULT_SCRAPER).rstrip("/")
EMBEDDING_SERVICE_URL: str = os.getenv("EMBEDDING_SERVICE_URL", _DEFAULT_EMBED).rstrip("/")
# ── CORS allowed origins ────────────────────────────────────────────
DEFAULT_CORS_ORIGINS: list[str] = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:4000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:4000",
    # Production origins
    "http://reviewmate.live",
    "http://admin.reviewmate.live",
    "https://reviewmate.live",
    "https://admin.reviewmate.live",
]

_cors_from_env = os.getenv("CORS_ORIGINS", "")
if _cors_from_env.strip():
    parsed = [origin.strip() for origin in _cors_from_env.split(",") if origin.strip()]
    CORS_ORIGINS: list[str] = list(dict.fromkeys(DEFAULT_CORS_ORIGINS + parsed))
else:
    CORS_ORIGINS = DEFAULT_CORS_ORIGINS
