"""
FastAPI Application Entry Point — Scraper Engine
=================================================
Mounts all routers with /api prefix. No /api/v1 versioning.
Initializes the database on startup.
"""
import sys
import os
import time
import threading
import httpx

# Ensure the project root is on sys.path so imports like core.* work
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.endpoints.agoda import router as agoda_router
from api.endpoints.booking import router as booking_router
from api.endpoints.google import router as google_router
from api.endpoints.tripadvisor import router as tripadvisor_router
from api.endpoints.sources import router as sources_router
from api.endpoints.reviews import router as reviews_router
from api.endpoints.system import router as system_router
from api.endpoints.audit import router as audit_router
from api.endpoints.db_admin import router as db_admin_router
from api.endpoints.tables import router as tables_router
from api.websockets.events import router as ws_router
from api.middleware.audit_middleware import AuditMiddleware
from core.config import setup_logger, config
from core.database import init_db
from core.limiter import limiter
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

logger = setup_logger("api_main")

app = FastAPI(
    title="Universal Reviews Scraper Engine",
    description=(
        "A multi-platform review microservice — scrapes, stores, and serves "
        "reviews from Agoda, Booking, Google Maps, and TripAdvisor."
    ),
    version="4.0.0"
)

# ── Rate Limiting ──
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Middleware ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(AuditMiddleware)


def reconcile_stuck_tasks():
    """Background task to fail any sources that were stuck pointing to this instance.
    Includes a retry mechanism because the main backend might be booting up concurrently.
    """
    url = f"{config.backend_url}/api/source/stuck-tasks"
    logger.info("Initializing background reconciliation...")
    
    max_retries = 12
    retry_delay = 5.0
    
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"Reconciling stuck tasks from {url} (Attempt {attempt}/{max_retries})...")
            headers = {"X-Internal-API-Key": config.internal_api_key}
            with httpx.Client(timeout=10.0, headers=headers) as client:
                resp = client.get(url)
                if resp.status_code == 200:
                    tasks = resp.json()
                    if not tasks:
                        logger.info("No stuck tasks found.")
                        return
                    
                    logger.info(f"Found {len(tasks)} stuck tasks. Emitting FAILED callbacks...")
                    for t in tasks:
                        source_id = t.get("source_id")
                        if not source_id: continue
                        
                        status_url = f"{config.backend_url}/api/source/tasks/{source_id}/sync-status"
                        payload = {
                            "status": "FAILED",
                            "error_message": "Scraper Engine restarted unexpectedly during execution. Job aborted."
                        }
                        client.post(status_url, json=payload)
                    logger.info("Successfully reconciled all stuck tasks.")
                    return  # Success, exit the thread
                else:
                    logger.warning(f"Backend returned {resp.status_code}. Retrying in {retry_delay}s...")
        
        except httpx.ConnectError as e:
            logger.warning(f"Backend not reachable (ConnectError). Retrying in {retry_delay}s...")
        except Exception as e:
            logger.error(f"Error during trapped task reconciliation: {e}")
            
        time.sleep(retry_delay)
        
    logger.error("Reconciliation failed: Exceeded maximum retries contacting backend.")

# ── Startup ──
@app.on_event("startup")
def startup_event():
    """Create all database tables on first run."""
    init_db()
    
    # Spawn background reconciliation thread
    threading.Thread(target=reconcile_stuck_tasks, daemon=True).start()



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
app.include_router(tables_router, prefix="/api")

# -- WebSocket Endpoints --
app.include_router(ws_router)


@app.get("/")
def read_root():
    """Root endpoint — confirms the engine is running."""
    return {"message": "Universal Review Scraper Engine v4.0 — /docs for Swagger UI"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api.main:app",
        host="127.0.0.1",
        port=8001,
        reload=True,
        reload_dirs=["api", "core"],
        reload_excludes=["output/*", "platforms/*", "*.json"],
    )
