"""
Broadcasting routes for admin panel API.
Endpoints for sending system-wide broadcasts and retrieving broadcast history.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.broadcasting_service import (
    BroadcastCreate,
    StatisticsResponse,
    EstimatedRecipientsResponse,
    send_broadcast,
    get_broadcast_history,
    get_broadcast_by_id,
    resend_broadcast as resend_broadcast_service,
    cancel_broadcast as cancel_broadcast_service,
    get_broadcast_statistics,
    get_estimated_recipients,
)

router = APIRouter(prefix="/api/broadcasting", tags=["broadcasting"])


@router.post("/send")
async def send_broadcast_endpoint(
    broadcast_data: BroadcastCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Send a system-wide broadcast message.

    - **subject**: Message subject (max 120 chars)
    - **body**: Message body (max 5000 chars)
    - **channel**: Delivery method (email, notification, or both)
    - **audienceType**: Target audience (all, role, or plan)
    - **audienceValue**: Specific audience value (e.g., 'admin' for role)
    - **messageType**: Message type (info, warning, maintenance, announcement)
    - **scheduleType**: Send now or scheduled
    - **scheduledAt**: ISO datetime if scheduled
    """
    admin_identifier = request.headers.get("x-admin-user", "Admin User")
    result = await send_broadcast(broadcast_data, admin_identifier, db)

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message"))

    return result


@router.get("/estimate-recipients")
async def estimate_recipients(
    audienceType: str = Query(...),
    audienceValue: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """
    Get estimated recipient count for a given audience.

    **Query Parameters:**
    - **audienceType**: all, role, or plan
    - **audienceValue**: Specific value (optional, e.g., 'admin', 'enterprise')
    """
    count = get_estimated_recipients(audienceType, audienceValue, db)
    return EstimatedRecipientsResponse(count=count)


@router.get("/statistics")
async def get_statistics(
    db: Session = Depends(get_db),
):
    """
    Get broadcast statistics.

    **Returns:**
    - **total**: Total broadcasts sent
    - **sent**: Successfully sent broadcasts
    - **scheduled**: Scheduled broadcasts pending
    - **failed**: Failed broadcasts
    """
    stats = await get_broadcast_statistics(db)
    return StatisticsResponse(**stats)


@router.get("/history")
async def get_history(
    db: Session = Depends(get_db),
):
    """
    Get broadcast history.

    """
    history = await get_broadcast_history(db)
    return history


@router.get("/{broadcast_id}")
async def get_broadcast_detail(
    broadcast_id: str,
    db: Session = Depends(get_db),
):
    """
    Get details of a specific broadcast.

    Returns 404 when not found.
    """
    detail = await get_broadcast_by_id(broadcast_id, db)
    if detail:
        return detail
    raise HTTPException(status_code=404, detail="Broadcast not found")


@router.post("/{broadcast_id}/resend")
async def resend_broadcast(
    broadcast_id: str,
    db: Session = Depends(get_db),
):
    """
    Resend a previously sent broadcast.

    Returns 404 when the broadcast does not exist.
    """
    result = await resend_broadcast_service(broadcast_id, db)
    if not result.get("success"):
        if result.get("message") == "Broadcast not found":
            raise HTTPException(status_code=404, detail=result.get("message"))
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result


@router.post("/{broadcast_id}/cancel")
async def cancel_broadcast_endpoint(
    broadcast_id: str,
    db: Session = Depends(get_db),
):
    """
    Cancel a scheduled broadcast.

    Cancels only pending broadcasts.
    """
    result = await cancel_broadcast_service(broadcast_id, db)
    if not result.get("success"):
        if result.get("message") == "Broadcast not found":
            raise HTTPException(status_code=404, detail=result.get("message"))
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result
