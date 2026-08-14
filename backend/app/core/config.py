"""
Centralised application configuration.

Every environment variable, connection string, and app-wide constant
lives here — one single source of truth for the entire backend.

All service URLs are read from the .env file.
  - Local dev: point to localhost addresses
  - Production: point to production URLs
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ── General ─────────────────────────────────────────────────────────
SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret")
FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
ADMIN_FRONTEND_URL: str = os.getenv("ADMIN_FRONTEND_URL", "http://localhost:5174")
ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
SECURE_COOKIES: bool = ENVIRONMENT.lower() == "production"

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
SMTP_TIMEOUT: int = int(os.getenv("SMTP_TIMEOUT", "10"))
SMTP_FROM_EMAIL: str | None = os.getenv("SMTP_FROM_EMAIL") or SMTP_EMAIL

# ── Google OAuth ────────────────────────────────────────────────────
GOOGLE_CLIENT_ID: str | None = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET: str | None = os.getenv("GOOGLE_CLIENT_SECRET")

# ── JWT ─────────────────────────────────────────────────────────────
JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "CHANGE_THIS_SECRET_KEY")
JWT_ALGORITHM: str = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

# ── LLM Gateway ─────────────────────────────────────────────────────
# 32-byte AES-256 key, base64-encoded.
# Generate: python -c "import os,base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"
LLM_ENCRYPTION_KEY: str = os.getenv("LLM_ENCRYPTION_KEY", "")

# ── Password reset ──────────────────────────────────────────────────
PASSWORD_RESET_EXPIRE_MINUTES: int = 60

# ── Microservices ───────────────────────────────────────────────────
# All URLs come from the .env file. No auto-detection magic.
SCRAPER_ENGINE_URL: str = os.getenv("SCRAPER_ENGINE_URL", "http://127.0.0.1:8001").rstrip("/")
EMBEDDING_SERVICE_URL: str = os.getenv("EMBEDDING_SERVICE_URL", "http://127.0.0.1:8002").rstrip("/")

# Service-to-Service API Keys (Phase 1: Backward Compatible)
INTERNAL_API_KEY: str = os.getenv("INTERNAL_API_KEY", "dev-internal-secret")
BACKEND_API_KEYS: list[str] = [k.strip() for k in os.getenv("BACKEND_API_KEYS", INTERNAL_API_KEY).split(",") if k.strip()]
SCRAPER_API_KEY: str = os.getenv("SCRAPER_API_KEY", INTERNAL_API_KEY)
EMBEDDING_API_KEY: str = os.getenv("EMBEDDING_API_KEY", INTERNAL_API_KEY)

# ── Message Broker ──────────────────────────────────────────────────
RABBITMQ_URL: str = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")


# ── CORS allowed origins ────────────────────────────────────────────
# Base origins always allowed (constructed from FRONTEND_URL and ADMIN_FRONTEND_URL)
_base_origins: list[str] = [
    FRONTEND_URL,
    ADMIN_FRONTEND_URL,
]

# Add 127.0.0.1/localhost variants to avoid browser blocks if IP vs hostname is used
_expanded_base = []
for origin in _base_origins:
    _expanded_base.append(origin)
    if "localhost" in origin:
        _expanded_base.append(origin.replace("localhost", "127.0.0.1"))
    elif "127.0.0.1" in origin:
        _expanded_base.append(origin.replace("127.0.0.1", "localhost"))

_cors_from_env = os.getenv("CORS_ORIGINS", "")
if _cors_from_env.strip():
    _extra = [origin.strip() for origin in _cors_from_env.split(",") if origin.strip()]
    CORS_ORIGINS: list[str] = list(dict.fromkeys(_expanded_base + _extra))
else:
    CORS_ORIGINS = list(dict.fromkeys(_expanded_base))
