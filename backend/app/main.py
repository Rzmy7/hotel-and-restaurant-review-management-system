"""
Hotel & Restaurant Review Management System — API Entry Point.

This file is the application root. All route logic lives in
app/modules/ and core logic in app/core/.
"""

import os
import json
from pathlib import Path
from pydantic import BaseModel, AnyHttpUrl, EmailStr, Field
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, Request, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Canonical database imports — single source of truth
from app.database.session import Base, engine, get_db

try:
    from app.core.config import SECRET_KEY, CORS_ORIGINS
except ImportError:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
    CORS_ORIGINS = [
        "http://localhost:5173", "http://localhost:5174",
        "http://127.0.0.1:5173", "http://127.0.0.1:5174"
    ]

try:
    from app.modules.scheduler import setup_scheduler, start_scheduler, stop_scheduler
except ImportError:
    def setup_scheduler(): pass
    def start_scheduler(): pass
    def stop_scheduler(): pass

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create any missing tables from ORM models
    if engine:
        Base.metadata.create_all(bind=engine)
    # Startup actions
    from app.modules.admin.services.subscription_service import seed_subscription_data
    seed_subscription_data()
    setup_scheduler()
    start_scheduler()
    
    # Run initial reconciliation and review processing background tasks
    import asyncio
    try:
        from app.modules.scheduler.tasks.reconciliation_tasks import reconcile_scraper_jobs
        from app.modules.reviews.services.processor import run_analysis_pipeline
        
        # reconcile_scraper_jobs is sync, run it in a thread pool via to_thread
        asyncio.create_task(asyncio.to_thread(reconcile_scraper_jobs))
        # run_analysis_pipeline is async, run it directly via create_task
        asyncio.create_task(run_analysis_pipeline())
        
        logger.info("Lifespan: Initial background tasks launched.")
    except Exception as e:
        logger.error(f"Lifespan: Failed to start initial background tasks: {e}")

    yield
    # Shutdown actions
    stop_scheduler()

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
import app.modules.user.models.user_models          # noqa: F401  (User)
import app.modules.auth.models.auth_models          # noqa: F401  (Role, UserRole, Session, PasswordResetToken)
import app.modules.auth.models                      # noqa: F401  (Notification, UserNotification, BroadcastEvent)
import app.modules.groups.models                    # noqa: F401  (Group, GroupMember, GroupMemberRole)
import app.modules.source.models                    # noqa: F401  (Tenant, Organization, Platform, Source, SyncLog)
import app.modules.reviews.models                   # noqa: F401  (ProcessedReview, ReviewMedia)

# Hansi UserManagement routers
from app.modules.user.routes.profile_routes import router as profile_router
from app.modules.organization.routes.organization_routes import router as org_router
from app.modules.organization.routes.onboarding_routes import router as onboarding_router
from app.modules.user.routes.user_routes import router as user_router
from app.modules.organization.routes.user_organization_routes import router as user_org_router
from app.modules.organization.routes.source_routes import router as org_source_router
from app.modules.auth.routes.auth_routes import router as auth_router
from app.modules.auth.routes.oauth_routes import router as oauth_router

from app.middleware.permissions import require_admin

# to identify
print("RUNNING: backend/app/main.py")

# Optional scraping integration
try:
    from app.test.scraping.booking import scrape_booking
except Exception:
    def scrape_booking(url, headless=True):
        raise RuntimeError("scrape_booking not available in this environment")

app = FastAPI(
    title="Hotel & Restaurant Review Management API",
    description="Production-grade API for review aggregation, competitor analysis, and AI insights.",
    version="2.0.0",
    lifespan=lifespan,
)

# ── Middleware ──────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if isinstance(CORS_ORIGINS, list) else [
        "http://localhost:5173", "http://localhost:5174",
        "http://127.0.0.1:5173", "http://127.0.0.1:5174"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)

# Global Exception Handler to capture 500 errors and include CORS headers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    error_details = traceback.format_exc()
    print(f"CRITICAL ERROR: {error_details}")
    
    # Write error to a temporary log file for AI to read
    with open("backend_error.log", "a", encoding="utf-8") as f:
        f.write(f"\n--- {type(exc).__name__} at {status.HTTP_500_INTERNAL_SERVER_ERROR} ---\n")
        f.write(error_details)
        f.write("\n" + "="*50 + "\n")

    return Response(
        content=json.dumps({"detail": "Internal Server Error", "traceback": str(exc)}),
        status_code=500,
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true",
        }
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
# Hansi routers (now standardized under /api)
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(oauth_router, prefix="/api/auth", tags=["OAuth"])
app.include_router(profile_router, prefix="/api")
app.include_router(org_router)            # already declares prefix="/api" internally
app.include_router(onboarding_router, prefix="/api")
app.include_router(user_router)           # already declares prefix="/api" internally
app.include_router(user_org_router)       # already declares prefix="/api" internally
app.include_router(org_source_router)     # already declares prefix="/api" internally

# ----------------------
# Debug / Root Endpoints
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
