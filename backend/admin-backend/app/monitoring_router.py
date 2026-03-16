from fastapi import APIRouter
import psutil

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])


def _server_usage() -> tuple[float, float]:
    cpu_percent = psutil.cpu_percent(interval=0.2)
    ram_percent = psutil.virtual_memory().percent
    return cpu_percent, ram_percent


@router.get("/admin-backend-status")
@router.get("/main-backend-status")
def admin_backend_status() -> dict[str, float | str]:
    """
    Returns status and resource usage for the admin backend server.
    """
    cpu_percent, ram_percent = _server_usage()
    return {
        "service": "admin-backend",
        "status": "healthy",
        "cpu": cpu_percent,
        "ram": ram_percent,
    }


@router.get("/admin-backend-usage")
@router.get("/main-backend-usage")
def admin_backend_usage() -> dict[str, float]:
    """
    Returns CPU and RAM usage for the admin backend server.
    """
    cpu_percent, ram_percent = _server_usage()
    return {"cpu": cpu_percent, "ram": ram_percent}
