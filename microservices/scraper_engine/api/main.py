"""
FastAPI Application Entry Point — Scraper Engine
=================================================
Mounts all routers with /api prefix. No /api/v1 versioning.
Initializes the database on startup.
"""
import sys
import os

# Ensure the project root is on sys.path so imports like core.* work
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from api.endpoints.agoda import router as agoda_router
from api.endpoints.booking import router as booking_router
from api.endpoints.google import router as google_router
from api.endpoints.tripadvisor import router as tripadvisor_router
from api.endpoints.sources import router as sources_router
from api.endpoints.reviews import router as reviews_router
from api.endpoints.system import router as system_router
from api.endpoints.audit import router as audit_router
from api.endpoints.db_admin import router as db_admin_router
from api.middleware.audit_middleware import AuditMiddleware
from core.config import setup_logger
from core.database import init_db

logger = setup_logger("api_main")

app = FastAPI(
    title="Universal Reviews Scraper Engine",
    description=(
        "A multi-platform review microservice — scrapes, stores, and serves "
        "reviews from Agoda, Booking, Google Maps, and TripAdvisor."
    ),
    version="4.0.0"
)

# ── Middleware ──
app.add_middleware(AuditMiddleware)


# ── Startup ──
@app.on_event("startup")
def startup_event():
    """Create all database tables on first run."""
    init_db()


# ── Platform Scrape Endpoints ──
# Each platform router handles POST /{platform}/scrape
app.include_router(agoda_router, prefix="/api")
app.include_router(booking_router, prefix="/api")
app.include_router(google_router, prefix="/api")
app.include_router(tripadvisor_router, prefix="/api")

# ── Data Retrieval & Management ──
app.include_router(sources_router, prefix="/api")
app.include_router(reviews_router, prefix="/api")

# ── System Monitoring & Audit ──
app.include_router(system_router, prefix="/api")
app.include_router(audit_router, prefix="/api")
app.include_router(db_admin_router, prefix="/api")


@app.get("/")
def read_root():
    """Root endpoint — confirms the engine is running."""
    return {"message": "Universal Review Scraper Engine v4.0 — /docs for Swagger UI"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="127.0.0.1", port=8001, reload=True)
