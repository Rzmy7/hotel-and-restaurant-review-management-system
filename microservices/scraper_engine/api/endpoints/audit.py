"""
Audit Endpoints — Retrieve and search system activity.
=====================================================
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from core.database import get_session
from core.models import AuditLog
from sqlalchemy import desc

router = APIRouter(prefix="/audit", tags=["Audit Logs"])


@router.get("")
def list_audit_logs(
    level: Optional[str] = None,
    category: Optional[str] = None,
    action: Optional[str] = None,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    limit: int = Query(50, le=500),
    offset: int = 0,
):
    """
    Retrieve audit logs with optional filtering.
    """
    session = get_session()
    try:
        query = session.query(AuditLog)

        if level:
            query = query.filter(AuditLog.level == level)
        if category:
            query = query.filter(AuditLog.category == category)
        if action:
            query = query.filter(AuditLog.action.ilike(f"%{action}%"))
        if target_type:
            query = query.filter(AuditLog.target_type == target_type)
        if target_id:
            query = query.filter(AuditLog.target_id == str(target_id))

        total = query.count()
        logs = (
            query.order_by(desc(AuditLog.timestamp)).offset(offset).limit(limit).all()
        )

        result = []
        for log in logs:
            result.append(
                {
                    "id": log.id,
                    "timestamp": str(log.timestamp),
                    "level": log.level,
                    "category": log.category,
                    "action": log.action,
                    "target": f"{log.target_type or ''}:{log.target_id or ''}",
                    "details": log.details,
                    "performed_by": log.performed_by,
                    "ip": log.ip_address,
                    "has_error": log.error_trace is not None,
                }
            )

        return {"total": total, "returned": len(result), "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


@router.get("/{log_id}")
def get_audit_detail(log_id: int):
    """
    Get full details of a specific audit log entry including error trace.
    """
    session = get_session()
    try:
        log = session.query(AuditLog).filter(AuditLog.id == log_id).first()
        if not log:
            raise HTTPException(status_code=404, detail="Log entry not found")

        return {
            "id": log.id,
            "timestamp": str(log.timestamp),
            "level": log.level,
            "category": log.category,
            "action": log.action,
            "target_type": log.target_type,
            "target_id": log.target_id,
            "details": log.details,
            "error_trace": log.error_trace,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "performed_by": log.performed_by,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()
