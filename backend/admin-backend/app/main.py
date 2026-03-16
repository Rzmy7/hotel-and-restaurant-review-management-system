import os
from typing import List

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.data import DASHBOARD_STATS, RECENT_ACTIVITY, REVIEW_DATA, SYSTEM_ALERTS, USAGE_DATA
from app.models import ChartDataPoint, DashboardStats, RecentActivity, SystemAlert

load_dotenv()

app = FastAPI(
    title="Admin Dashboard Backend",
    description="Backend service for admin frontend dashboard page",
    version="1.0.0",
)

frontend_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in frontend_origins if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "service": "admin-backend",
        "status": "ok",
        "message": "Admin dashboard backend is running",
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "healthy"}


@app.get("/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats() -> DashboardStats:
    return DASHBOARD_STATS


@app.get("/dashboard/usage", response_model=List[ChartDataPoint])
def get_dashboard_usage() -> List[ChartDataPoint]:
    return USAGE_DATA


@app.get("/dashboard/reviews", response_model=List[ChartDataPoint])
def get_dashboard_reviews() -> List[ChartDataPoint]:
    return REVIEW_DATA


@app.get("/dashboard/alerts", response_model=List[SystemAlert])
def get_dashboard_alerts() -> List[SystemAlert]:
    return SYSTEM_ALERTS


@app.get("/dashboard/activities", response_model=List[RecentActivity])
def get_dashboard_activities() -> List[RecentActivity]:
    return RECENT_ACTIVITY
