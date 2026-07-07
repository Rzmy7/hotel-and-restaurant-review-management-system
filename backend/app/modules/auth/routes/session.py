"""
Session and debug routes — GET /check-session, GET /test-smtp
"""

from fastapi import APIRouter, Request

from app.core.config import SMTP_EMAIL, FRONTEND_URL
from app.modules.auth.services.email_service import send_reset_email

router = APIRouter()


@router.get("/check-session")
def check_session(request: Request):
    user = request.session.get("user")
    if user:
        return {"user": user}
    return {"user": None}


@router.get("/test-smtp", tags=["Debug"])
def test_smtp():
    try:
        if not SMTP_EMAIL:
            return {"error": "SMTP_EMAIL not configured"}

        send_reset_email(SMTP_EMAIL, f"{FRONTEND_URL}/test-link-123")
        return {
            "success": True,
            "message": f"Test email sent successfully to {SMTP_EMAIL}",
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
