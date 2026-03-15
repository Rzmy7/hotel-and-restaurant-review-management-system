"""
Hotel & Restaurant Review Management System — API Entry Point.

This file is the thin application root. All route logic lives in
app/routers/ and business logic in app/services/.
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import SECRET_KEY, CORS_ORIGINS

# ── Router imports ──────────────────────────────────────────────────
from app.routers import (
    health,
    auth,
    reviews,
    scraping,
    competitors,
    dashboard,
    admin,
    groups,
)

# ── App factory ─────────────────────────────────────────────────────

app = FastAPI(
    title="Hotel & Restaurant Review Management API",
    description="Production-grade API for review aggregation, competitor analysis, and AI insights.",
    version="2.0.0",
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

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(reviews.router)
app.include_router(scraping.router)
app.include_router(competitors.router)
app.include_router(dashboard.router)
app.include_router(admin.router)
app.include_router(groups.router)

# ── Dev server ──────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)