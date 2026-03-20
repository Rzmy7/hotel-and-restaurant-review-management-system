"""
Broadcasting routes for admin panel API.
Endpoints for sending system-wide broadcasts and retrieving broadcast history.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from app.db import get_db
from app.auth.auth_permissions import require_admin
from app.services.broadcasting_service import (
    BroadcastCreate,
    BroadcastResponse,
    StatisticsResponse,
    EstimatedRecipientsResponse,
    send_broadcast,
    get_broadcast_history,
    get_broadcast_statistics,
    get_estimated_recipients,
    get_audience_label,
)

router = APIRouter(prefix="/api/broadcasting", tags=["broadcasting"])

@router.post("/send")
async def send_broadcast_endpoint(
    broadcast_data: BroadcastCreate,
    request: Request,
    db: Session = Depends(get_db),
    admin_user: dict = Depends(require_admin)
):
    """
    Send a system-wide broadcast message.
    
    **Requires admin permissions**
    
    - **subject**: Message subject (max 120 chars)
    - **body**: Message body (max 5000 chars)
    - **channel**: Delivery method (email, notification, or both)
    - **audienceType**: Target audience (all, role, or plan)
    - **audienceValue**: Specific audience value (e.g., 'admin' for role)
    - **messageType**: Message type (info, warning, maintenance, announcement)
    - **scheduleType**: Send now or scheduled
    - **scheduledAt**: ISO datetime if scheduled
    """
    result = await send_broadcast(broadcast_data, admin_user.get('email', 'Unknown'), db)
    
    if not result.get('success'):
        raise HTTPException(status_code=400, detail=result.get('message'))
    
    return result

@router.get("/history")
async def get_history(
    db: Session = Depends(get_db),
    admin_user: dict = Depends(require_admin)
):
    """
    Get broadcast history.
    
    **Requires admin permissions**
    """
    history = await get_broadcast_history(db)
    return history

@router.get("/{broadcast_id}")
async def get_broadcast_detail(
    broadcast_id: str,
    db: Session = Depends(get_db),
    admin_user: dict = Depends(require_admin)
):
    """
    Get details of a specific broadcast.
    
    **Requires admin permissions**
    """
    # Mock implementation - fetch from database in real scenario
    history = await get_broadcast_history(db)
    for broadcast in history:
        if broadcast.get('id') == broadcast_id:
            return broadcast
    
    raise HTTPException(status_code=404, detail="Broadcast not found")

@router.get("/estimate-recipients")
async def estimate_recipients(
    audienceType: str = Query(...),
    audienceValue: str = Query(None),
    db: Session = Depends(get_db),
    admin_user: dict = Depends(require_admin)
):
    """
    Get estimated recipient count for a given audience.
    
    **Query Parameters:**
    - **audienceType**: all, role, or plan
    - **audienceValue**: Specific value (optional, e.g., 'admin', 'enterprise')
    
    **Requires admin permissions**
    """
    count = get_estimated_recipients(audienceType, audienceValue, db)
    return EstimatedRecipientsResponse(count=count)

@router.get("/statistics")
async def get_statistics(
    db: Session = Depends(get_db),
    admin_user: dict = Depends(require_admin)
):
    """
    Get broadcast statistics.
    
    **Returns:**
    - **total**: Total broadcasts sent
    - **sent**: Successfully sent broadcasts
    - **scheduled**: Scheduled broadcasts pending
    - **failed**: Failed broadcasts
    
    **Requires admin permissions**
    """
    stats = await get_broadcast_statistics(db)
    return StatisticsResponse(**stats)

@router.post("/{broadcast_id}/resend")
async def resend_broadcast(
    broadcast_id: str,
    db: Session = Depends(get_db),
    admin_user: dict = Depends(require_admin)
):
    """
    Resend a previously sent broadcast.
    
    **Requires admin permissions**
    """
    # Mock implementation
    return {
        'success': True,
        'message': f'Broadcast {broadcast_id} resent successfully'
    }

@router.post("/{broadcast_id}/cancel")
async def cancel_broadcast(
    broadcast_id: str,
    db: Session = Depends(get_db),
    admin_user: dict = Depends(require_admin)
):
    """
    Cancel a scheduled broadcast.
    
    **Requires admin permissions**
    """
    # Mock implementation
    return {
        'success': True,
        'message': f'Broadcast {broadcast_id} cancelled'
    }
