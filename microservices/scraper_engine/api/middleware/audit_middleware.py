"""
Audit Middleware — Intercepts and logs API requests.
===================================================
Automatically records all destructive actions (POST, PUT, DELETE, PATCH)
and captures any unhandled server errors (500).
"""

import time
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from core.audit import audit_logger
import json


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # We only log "destructive" or "state-changing" requests by default
        # to avoid bloating the logs with simple GETs, unless they fail.
        is_write_request = request.method in ["POST", "PUT", "DELETE", "PATCH"]

        # Snapshot request info
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        path = request.url.path

        # Start timer
        start_time = time.time()

        try:
            response: Response = await call_next(request)
            duration = round(time.time() - start_time, 4)

            # Log successful write requests or any failed requests (4xx/5xx)
            if is_write_request or response.status_code >= 400:
                details = {
                    "method": request.method,
                    "path": path,
                    "status_code": response.status_code,
                    "duration": duration,
                    "query_params": str(request.query_params),
                }

                level = "INFO"
                if response.status_code >= 500:
                    level = "ERROR"
                elif response.status_code >= 400:
                    level = "WARNING"

                action = f"API_{request.method}_{path}"

                audit_logger.log(
                    category="API",
                    action=action,
                    level=level,
                    details=details,
                    ip_address=client_ip,
                    user_agent=user_agent,
                )

            return response

        except Exception as e:
            # Capture unhandled exceptions that crashed the request
            duration = round(time.time() - start_time, 4)
            details = {
                "method": request.method,
                "path": path,
                "error": str(e),
                "duration": duration,
            }

            audit_logger.log(
                category="API",
                action=f"API_CRASH_{request.method}_{path}",
                level="CRITICAL",
                details=details,
                error=e,
                ip_address=client_ip,
                user_agent=user_agent,
            )
            raise e
