"""
Hotel & Restaurant Review Management System — API Entry Point.

This file is the thin application root. All route logic lives in
app/routers/ and business logic in app/services/.
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import SECRET_KEY, CORS_ORIGINS
from app.modules.scheduler import setup_scheduler, start_scheduler, stop_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    setup_scheduler()
    start_scheduler()
    yield
    # Shutdown actions
    stop_scheduler()

# ── Router imports ──────────────────────────────────────────────────
from app.core import health
from app.modules.auth.routes import router as auth_router
from app.modules.reviews.routes import router as reviews_router
from app.modules.competitors.routes import router as competitors_router
from app.modules.dashboard.routes import router as dashboard_router
from app.modules.admin.routes import router as admin_router
from app.modules.groups.router import router as groups_router
from app.modules.source.routers import router as source_router

# ── App factory ─────────────────────────────────────────────────────

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

# ── Register routers ───────────────────────────────────────────────

app.include_router(health.router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(reviews_router, prefix="/api")
app.include_router(competitors_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(groups_router, prefix="/api")
app.include_router(source_router)

# ── Dev server ──────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)