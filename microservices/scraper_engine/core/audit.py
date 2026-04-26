"""
Audit System — Global event logging for the microservice.
=========================================================
Handles recording of all system activities, errors, and changes
to the database audit_log table.
"""

import json
import traceback
from datetime import datetime
from typing import Optional, Any
from core.database import get_session
from core.models import AuditLog
from core.config import setup_logger

logger = setup_logger("audit_system")


class AuditLogger:
    @staticmethod
    def log(
        category: str,
        action: str,
        level: str = "INFO",
        target_type: Optional[str] = None,
        target_id: Optional[str] = None,
        details: Any = None,
        error: Optional[Exception] = None,
        performed_by: str = "system",
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ):
        """
        Record a system event to the audit_log table.
        """
        session = get_session()
        try:
            # Prepare details as JSON string
            details_str = None
            if details:
                if isinstance(details, (dict, list)):
                    details_str = json.dumps(details, ensure_ascii=False)
                else:
                    details_str = str(details)

            # Capture traceback if error provided
            error_trace = None
            if error:
                error_trace = traceback.format_exc()
                if level == "INFO":
                    level = "ERROR"

            log_entry = AuditLog(
                level=level,
                category=category,
                action=action,
                target_type=target_type,
                target_id=str(target_id) if target_id else None,
                details=details_str,
                error_trace=error_trace,
                ip_address=ip_address,
                user_agent=user_agent,
                performed_by=performed_by,
            )

            session.add(log_entry)
            session.commit()

            # Also log to file for redundancy
            msg = (
                f"[{level}] {category}:{action} - {target_type or ''} {target_id or ''}"
            )
            if level in ["ERROR", "CRITICAL"]:
                logger.error(msg)
            else:
                logger.info(msg)

        except Exception as e:
            # Fallback if DB logging fails
            logger.error(f"FAILED TO WRITE AUDIT LOG: {e}\n{traceback.format_exc()}")
        finally:
            session.close()

    @staticmethod
    def info(category: str, action: str, **kwargs):
        AuditLogger.log(category, action, level="INFO", **kwargs)

    @staticmethod
    def warning(category: str, action: str, **kwargs):
        AuditLogger.log(category, action, level="WARNING", **kwargs)

    @staticmethod
    def error(category: str, action: str, **kwargs):
        AuditLogger.log(category, action, level="ERROR", **kwargs)


audit_logger = AuditLogger()
