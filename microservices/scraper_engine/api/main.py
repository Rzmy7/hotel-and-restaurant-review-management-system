from fastapi import FastAPI
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.endpoints.agoda import router as agoda_router
from api.endpoints.booking import router as booking_router
from api.endpoints.google import router as google_router
from api.endpoints.tripadvisor import router as tripadvisor_router
from api.endpoints.organizations import router as organizations_router
from api.endpoints.sources import router as sources_router
from api.endpoints.reviews import router as reviews_router
from api.endpoints.audit import router as audit_router
from api.endpoints.system import router as system_router
from api.endpoints.db_admin import router as db_admin_router
from api.websockets.events import router as ws_router
from api.middleware.audit_middleware import AuditMiddleware
from core.config import setup_logger
from core.database import init_db

logger = setup_logger("api_main")

app = FastAPI(
    title="Universal Reviews Scraper Engine",
    description="A multi-platform review microservice — scrapes, stores, and serves reviews from Agoda, Booking, Google Maps, and TripAdvisor.",
    version="3.3.0"
)

# Register Middleware
app.add_middleware(AuditMiddleware)

@app.on_event("startup")
def startup_event():
    init_db()

# Platform-specific scrape & review endpoints (backward compatible)
app.include_router(agoda_router)
app.include_router(booking_router)
app.include_router(google_router)
app.include_router(tripadvisor_router)

# Unified management endpoints
app.include_router(organizations_router, prefix="/api/v1")
app.include_router(sources_router, prefix="/api/v1")
app.include_router(reviews_router, prefix="/api/v1")
app.include_router(audit_router, prefix="/api/v1")

# System monitoring & DB admin
app.include_router(system_router, prefix="/api/v1")
app.include_router(db_admin_router, prefix="/api/v1")
app.include_router(ws_router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"message": "Universal Review Scraper Engine v3.3 — /docs for Swagger UI"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="127.0.0.1", port=8001, reload=True)
