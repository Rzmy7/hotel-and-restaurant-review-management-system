from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from pydantic import BaseModel, AnyHttpUrl
from sqlalchemy import text
from sqlalchemy.orm import Session
import json
import os
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

from app.core.database import get_db

# Routers
from app.modules.user.routes.profile_routes import router as profile_router
from app.modules.organization.routes.organization_routes import router as org_router
from app.modules.organization.routes.onboarding_routes import router as onboarding_router
from app.modules.user.routes.user_routes import router as user_router
from app.modules.organization.routes.user_organization_routes import router as user_org_router
from app.modules.organization.routes.source_routes import router as source_router
from app.modules.auth.routes.auth_routes import router as auth_router
from app.modules.auth.routes.oauth_routes import router as oauth_router

print("RUNNING: backend/app/main.py")

# Optional scraping integration
try:
    from app.test.scraping.booking import scrape_booking
except Exception:
    def scrape_booking(url, headless=True):
        raise RuntimeError("scrape_booking not available in this environment")

app = FastAPI(
    title="My Project API",
    description="A comprehensive API built with FastAPI",
    version="1.0.0",
)

# Middleware Configuration
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

app.add_middleware(SessionMiddleware, secret_key=os.getenv("SECRET_KEY", "dev-secret"))

# Include Routers
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(oauth_router, tags=["OAuth"])
app.include_router(profile_router)
app.include_router(org_router)
app.include_router(onboarding_router, prefix="/api")
app.include_router(user_router)
app.include_router(user_org_router)
app.include_router(source_router)

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

# Scraping endpoints remaining in main.py for now
class BookingScrapeRequest(BaseModel):
    url: AnyHttpUrl
    headless: bool = True

@app.post("/scrape/booking", tags=["Scraping"])
async def start_booking_scrape(payload: BookingScrapeRequest, background_tasks: BackgroundTasks):
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
    try:
        data_file = Path(__file__).parent / "analyzed_data_frontend.json"
        if not data_file.exists():
            return {"reviews": [], "message": "No reviews found yet. Run a scrape first."}
        with open(data_file, "r", encoding="utf-8") as f:
            reviews = json.load(f)
        return {"reviews": reviews, "total": len(reviews)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading reviews: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)