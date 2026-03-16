import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.admin_router import router as admin_router
from app.dashboard_router import router as dashboard_router

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

app.include_router(dashboard_router)
app.include_router(admin_router)


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
