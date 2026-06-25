"""
Email utilities — password-reset email.
Delegates to the canonical email_service.py so all emails share the same
anti-spam headers, brand, and SMTP connection logic.
"""

from app.modules.auth.services.email_service import send_reset_email  # re-export

__all__ = ["send_reset_email"]
