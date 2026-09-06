"""
Hotel & Restaurant Review Management System — API Entry Point.

This file is the application root. All route logic lives in
app/modules/ and core logic in app/core/.
"""

import os
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
import logging
from dotenv import load_dotenv

load_dotenv()

# Configure logging for production mode
if os.getenv("PROD_MODE", "false").lower() == "true":
    logging.basicConfig(level=logging.WARNING)
    # Suppress uvicorn access logs explicitly if uvicorn is used internally or via CLI
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.WARNING)
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.WARNING)
else:
    logger = logging.getLogger(__name__)

# Canonical database imports — single source of truth
from app.database.session import Base, engine, get_db
from app.modules.auth.utils.auth_utils import get_current_user as get_current_user_dep

try:
    from app.core.config import SECRET_KEY, CORS_ORIGINS
except ImportError:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
    _frontend = os.getenv("FRONTEND_URL", "http://localhost:5173")
    _admin = os.getenv("ADMIN_FRONTEND_URL", "http://localhost:5174")
    CORS_ORIGINS = [_frontend, _admin]

try:
    from app.modules.scheduler import setup_scheduler, start_scheduler, stop_scheduler
except ImportError:

    def setup_scheduler():
        pass

    def start_scheduler():
        pass

    def stop_scheduler():
        pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create any missing tables from ORM models
    if engine:
        Base.metadata.create_all(bind=engine)

    # Run group schema migrations (idempotent — safe every startup)
    try:
        from app.modules.groups.migrations import run_group_migrations
        run_group_migrations(engine)
    except Exception as _mig_err:
        logger.warning("Group migrations skipped: %s", _mig_err)

    # Startup actions
    from app.modules.admin.services.subscription_service import seed_subscription_data

    seed_subscription_data()
    setup_scheduler()
    start_scheduler()

    # Run initial reconciliation and review processing background tasks
    import asyncio

    try:
        from app.modules.scheduler.tasks.reconciliation_tasks import (
            reconcile_scraper_jobs,
        )
        from app.modules.reviews.services.processor import run_analysis_pipeline

        # ponytail: startup reconciliation deactivated to let RabbitMQ process pre-existing queued tasks normally on boot
        # asyncio.create_task(reconcile_scraper_jobs())
        # run_analysis_pipeline is async, run it directly via create_task
        asyncio.create_task(run_analysis_pipeline())

        logger.info("Lifespan: Initial background tasks launched.")
    except Exception as e:
        logger.error(f"Lifespan: Failed to start initial background tasks: {e}")

    yield
    # Shutdown actions
    stop_scheduler()
    try:
        from app.modules.source.services.embedding_client import wait_for_active_embeddings
        wait_for_active_embeddings()
    except Exception as shutdown_err:
        logger.warning(f"Error waiting for active embedding threads: {shutdown_err}")


# ── Router imports ──────────────────────────────────────────────────
# Temp branch routers
try:
    from app.core import health
except ImportError:
    health = None


try:
    from app.modules.competitors.routes import router as competitors_router
except ImportError:
    competitors_router = None

try:
    from app.modules.dashboard.routes import router as dashboard_router
except ImportError:
    dashboard_router = None

try:
    from app.modules.admin.routes import router as admin_router
except ImportError:
    admin_router = None

try:
    from app.modules.groups.router import router as groups_router
except ImportError:
    groups_router = None

try:
    from app.modules.source.routers import router as legacy_source_router
except ImportError:
    legacy_source_router = None

# admin_backend_router removed and consolidated into admin_router

# ── Pre-load ORM models so SQLAlchemy can resolve cross-module relationships ──
import app.modules.user.models.user_models  # noqa: F401  (User)
import app.modules.auth.models.auth_models  # noqa: F401  (Role, UserRole, Session, PasswordResetToken)
import app.modules.auth.models  # noqa: F401  (Notification, UserNotification, BroadcastEvent)
import app.modules.groups.models  # noqa: F401  (Group, GroupMember, GroupInvite)
import app.modules.source.models  # noqa: F401  (Tenant, Organization, Platform, Source, SyncLog)
import app.modules.reviews.models  # noqa: F401  (ProcessedReview, ReviewMedia, ReviewReply, AlertRule)
import app.modules.organization.models.rules_model  # noqa: F401  (OrganizationRule)


# Hansi UserManagement routers

from app.modules.user.routes.profile_routes import router as profile_router
from app.modules.organization.routes.organization_routes import router as org_router
from app.modules.organization.routes.onboarding_routes import (
    router as onboarding_router,
)
from app.modules.user.routes.user_routes import router as user_router
from app.modules.organization.routes.user_organization_routes import (
    router as user_org_router,
)
from app.modules.auth.routes.auth_routes import router as auth_router
from app.modules.auth.routes.oauth_routes import router as oauth_router


# to identify
print("RUNNING: backend/app/main.py")


app = FastAPI(
    title="Hotel & Restaurant Review Management API",
    description="Production-grade API for review aggregation, competitor analysis, and AI insights.",
    version="2.0.0",
    lifespan=lifespan,
)

# ── Middleware ──────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)

# ── Sliding Sessions (Approach 1) ───────────────────────────────────
@app.middleware("http")
async def sliding_sessions_middleware(request: Request, call_next):
    import time
    from jose import jwt, JWTError
    from app.core.config import JWT_SECRET_KEY, JWT_ALGORITHM
    from app.core.security import create_access_token, set_auth_cookie

    token = request.cookies.get("access_token")
    new_token = None

    if token:
        try:
            # Decode and verify the token. Raises JWTError if expired/invalid.
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            exp = payload.get("exp")
            if exp:
                time_remaining = exp - time.time()
                # ponytail: if valid but <= 5 minutes left, rotate it automatically
                if 0 < time_remaining <= 300:
                    user_id = payload.get("user_id")
                    role = payload.get("role")
                    organization_id = payload.get("organization_id")
                    if user_id and role:
                        new_token = create_access_token(
                            user_id=user_id,
                            role=role,
                            organization_id=organization_id,
                        )
        except JWTError:
            pass

    response = await call_next(request)

    if new_token:
        set_auth_cookie(response, new_token)

    return response


# ── Proxy Headers (Production HTTPS support) ──────────────────────
# When running behind a reverse proxy (Nginx, Cloudflare), this allows
# FastAPI to recognize HTTPS and use correct protocol in url_for().
try:
    from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
    app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")
except ImportError:
    pass


# Global Exception Handler to capture 500 errors and include CORS headers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback

    error_details = traceback.format_exc()
    print(f"CRITICAL ERROR: {error_details}")

    # Write error to a temporary log file for AI to read
    try:
        with open("backend_error.log", "a", encoding="utf-8") as f:
            f.write(
                f"\n--- {type(exc).__name__} at {status.HTTP_500_INTERNAL_SERVER_ERROR} ---\n"
            )
            f.write(error_details)
            f.write("\n" + "=" * 50 + "\n")
    except Exception as log_err:
        print(f"FAILED TO WRITE TO backend_error.log: {log_err}")

    return Response(
        content=json.dumps({"detail": "Internal Server Error", "traceback": str(exc)}),
        status_code=500,
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true",
        },
    )


# ── Register routers ───────────────────────────────────────────────

if health:
    app.include_router(health.router, prefix="/api")

# Domain Module Registration
if competitors_router:
    app.include_router(competitors_router, prefix="/api")
if dashboard_router:
    app.include_router(dashboard_router, prefix="/api")
if admin_router:
    app.include_router(admin_router, prefix="/api")
if groups_router:
    app.include_router(groups_router, prefix="/api")
if legacy_source_router:
    app.include_router(legacy_source_router, prefix="/api")

# Reviews module moved here to avoid circular imports during early initialization
try:
    from app.modules.reviews.routes import router as reviews_router
except ImportError:
    reviews_router = None

if reviews_router:
    app.include_router(reviews_router)

# Review Replies module — dedicated reply history & management
try:
    from app.modules.reviews.routes.review_replies import router as review_replies_router
except ImportError:
    review_replies_router = None

if review_replies_router:
    app.include_router(review_replies_router)

# Sentiment analysis module — standalone sentiment endpoints
try:
    from app.modules.reviews.routes.sentiment import router as sentiment_router
except ImportError:
    sentiment_router = None

if sentiment_router:
    app.include_router(sentiment_router)

# Alert Rules module — configurable review monitoring triggers
try:
    from app.modules.reviews.routes.alert_rules import router as alert_rules_router
except ImportError:
    alert_rules_router = None

if alert_rules_router:
    app.include_router(alert_rules_router)

# ML Service module — standalone /ml/analyze and /ml/reply endpoints
try:
    from app.modules.ml.routes import router as ml_router
except ImportError:
    ml_router = None

if ml_router:
    app.include_router(ml_router)
# Hansi routers (now standardized under /api)
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(oauth_router, prefix="/api/auth")
app.include_router(profile_router, prefix="/api")
app.include_router(org_router)  # already declares prefix="/api" internally
app.include_router(onboarding_router, prefix="/api")
app.include_router(user_router)  # already declares prefix="/api" internally
app.include_router(user_org_router)  # already declares prefix="/api" internally

# User Notifications
from app.modules.auth.routes.notifications_routes import router as user_notifications_router
app.include_router(user_notifications_router, prefix="/api")

# ── User-accessible subscription endpoints (not admin-only) ────────
# These are read-only subscription endpoints needed by the user frontend
# (settings → Subscription tab). The admin versions still exist behind
# /api/admin/ for admin CRUD operations.


@app.get("/api/subscription-plans", tags=["Subscription"])
def user_subscription_plans():
    """List active subscription plans (publicly accessible for landing/pricing pages and authenticated users)."""
    import pyodbc
    from app.core.db_utils import get_connection_string
    from app.modules.admin.services.subscription_service import get_subscription_plans

    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            plans = get_subscription_plans(cursor)
            return [p for p in plans if getattr(p, "isActive", True)]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to load subscription plans: {exc}")


@app.get("/api/faqs", tags=["FAQs"])
def public_faqs():
    """List active FAQs for the public landing page."""
    import pyodbc
    from app.core.db_utils import get_connection_string
    from app.modules.admin.services.faq_service import get_public_faqs

    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            return get_public_faqs(cursor)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to load FAQs: {exc}")


@app.get("/api/subscription-usage/{user_id}", tags=["Subscription"])
def user_subscription_usage(
    user_id: str,
    current_user=Depends(get_current_user_dep),
):
    """Get subscription usage for the authenticated user."""
    import pyodbc
    from app.core.db_utils import get_connection_string
    from app.modules.admin.services.subscription_service import get_user_subscription_usage

    try:
        normalized_user_id = user_id.strip()
        if not normalized_user_id:
            raise HTTPException(status_code=400, detail="user_id is required")

        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            return get_user_subscription_usage(cursor, normalized_user_id)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to load subscription usage: {exc}")


# ----------------------
# Debug / Root Endpoints
# ----------------------


@app.get("/", tags=["System"], summary="API health check")
async def root():
    return {"message": "API is online", "status": "healthy"}


@app.get("/api/maintenance/status", tags=["System"], summary="Public maintenance mode status")
def public_maintenance_status():
    """Public endpoint to check if maintenance mode is active (no auth required)."""
    import pyodbc
    from app.core.db_utils import get_connection_string
    from app.modules.admin.services.system_settings_service import (
        get_setting,
        ensure_system_settings_table,
    )

    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            ensure_system_settings_table(cursor)
            value = get_setting(cursor, "maintenance_mode")
            maintenance = bool(
                value and value.strip().lower() in {"1", "true", "yes", "on"}
            )
            return {"maintenanceMode": maintenance}
    except Exception:
        return {"maintenanceMode": False}


@app.get("/api/settings/feature-flags", tags=["System"], summary="Public feature flags list")
def public_feature_flags():
    """Public endpoint to get active feature flags (no auth required)."""
    import pyodbc
    from app.core.db_utils import get_connection_string
    from app.modules.admin.routes.settings_routes import _load_feature_flags
    from app.modules.admin.services.system_settings_service import ensure_system_settings_table
    
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            ensure_system_settings_table(cursor)
            return _load_feature_flags(cursor)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to load feature flags: {exc}")


@app.get("/which-main", tags=["System"], summary="Identify the running main module")
def which_main():
    return {"message": "backend/app/main.py is running"}


@app.get("/db-test", tags=["System"], summary="Verify database connectivity")
def db_test(db: Session = Depends(get_db)):
    try:
        result = db.execute(text("SELECT 1 AS ok"))
        row = result.fetchone()
        return {"message": "Database connection successful", "result": row[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB connection failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
