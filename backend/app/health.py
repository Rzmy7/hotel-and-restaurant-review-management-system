"""
Health Check Endpoint Implementation for Backend Services
This module provides a ready-to-use health check endpoint for FastAPI applications.
"""

from fastapi import APIRouter
import psutil
from datetime import datetime
from typing import Literal

router = APIRouter()

# Store the service start time
SERVICE_START_TIME = datetime.now()


def get_uptime() -> str:
    """Calculate service uptime in human-readable format."""
    uptime = datetime.now() - SERVICE_START_TIME
    days = uptime.days
    hours, remainder = divmod(uptime.seconds, 3600)
    minutes, _ = divmod(remainder, 60)
    return f"{days}d {hours}h {minutes}m"


def get_cpu_usage() -> float:
    """Get current CPU usage percentage."""
    try:
        # Get CPU usage over 1 second interval
        cpu_percent = psutil.cpu_percent(interval=1)
        return round(cpu_percent, 1)
    except Exception as e:
        print(f"Error getting CPU usage: {e}")
        return 0.0


def get_ram_usage() -> float:
    """Get current RAM usage percentage."""
    try:
        memory = psutil.virtual_memory()
        return round(memory.percent, 1)
    except Exception as e:
        print(f"Error getting RAM usage: {e}")
        return 0.0


def determine_status(cpu: float, ram: float) -> Literal["Online", "Warning", "Offline"]:
    """
    Determine server status based on resource usage.
    
    - Online: Normal operation (CPU < 90% and RAM < 90%)
    - Warning: High resource usage (CPU >= 90% or RAM >= 90%)
    - Offline: Should only be set manually when service is shutting down
    """
    if cpu >= 90 or ram >= 90:
        return "Warning"
    return "Online"


@router.get("/health")
async def health_check():
    """
    Health check endpoint for system monitoring.
    
    Returns:
        dict: Server health status including CPU, RAM usage, and uptime
        
    Example Response:
        {
            "status": "Online",
            "cpu_usage": 45.2,
            "ram_usage": 62.5,
            "uptime": "45d 12h 23m"
        }
    """
    cpu_usage = get_cpu_usage()
    ram_usage = get_ram_usage()
    status = determine_status(cpu_usage, ram_usage)
    uptime = get_uptime()
    
    return {
        "status": status,
        "cpu_usage": cpu_usage,
        "ram_usage": ram_usage,
        "uptime": uptime
    }


# To use this in your FastAPI app:
# 
# from health import router as health_router
# 
# app = FastAPI()
# app.include_router(health_router)
#
# Or for a specific prefix:
# app.include_router(health_router, prefix="/api/v1")
