import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.permissions import require_admin, require_admin_or_tenant
from app.services.notifications_service import (
    NotificationCreate,
    NotificationResponse,
    NotificationListResponse,
    MarkAllReadResponse,
    create_user_notification,
    get_user_notifications,
    mark_user_notification_read,
    mark_user_notifications_read_all,
    get_unread_count,
)


router = APIRouter(prefix="/notifications", tags=["notifications"])


# ── Deterministic Alert UUIDs ─────────────────────────────────────────
ALERT_UUIDS = {
    "reputation": uuid.UUID("e0000000-0000-0000-0000-000000000001"),
    "operations": uuid.UUID("e0000000-0000-0000-0000-000000000002"),
    "trend": uuid.UUID("e0000000-0000-0000-0000-000000000003")
}


def _get_current_user_uuid(current_user: dict) -> uuid.UUID:
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing user id")

    try:
        return uuid.UUID(str(user_id))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user id format")


def ensure_alert_notif_exists(db: Session, notification_id: uuid.UUID, title: str, message: str, category: str):
    """Ensure parent notification record exists in the DB so that FK constraint isn't violated on UserNotification."""
    from app.modules.auth.models import Notification
    existing = db.query(Notification).filter(Notification.notification_id == notification_id).first()
    if not existing:
        notif_type = "error" if category == "reputation" else "warning"
        placeholder = Notification(
            notification_id=notification_id,
            title=title,
            message=message,
            notification_type=notif_type
        )
        db.add(placeholder)
        db.commit()


@router.post("", response_model=NotificationResponse)
def create_notification_endpoint(
    payload: NotificationCreate,
    db: Session = Depends(get_db),
    admin_user: dict = Depends(require_admin),
):
    return create_user_notification(db, payload)


@router.get("/me")
def get_my_notifications(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    unreadOnly: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_tenant),
):
    """Return notifications in the same shape the frontend expects:
    { userId, notifications: [{ notification_id, user_id, title, message, ... }] }
    """
    user_id = _get_current_user_uuid(current_user)
    
    # 1. Fetch active dashboard alerts dynamically and format them
    alert_notifications = []
    try:
        from app.core.tenant_context import resolve_tenant_scope
        org_id = resolve_tenant_scope(current_user, db)
    except Exception:
        org_id = None

    from app.modules.dashboard.services.activity_service import get_alerts
    alerts_res = get_alerts(db, org_id)
    active_alerts = alerts_res.get("alerts", [])
    
    from app.modules.auth.models import UserNotification
    
    for alert in active_alerts:
        cat = alert.get("category")
        if cat not in ALERT_UUIDS:
            continue
        notif_id = ALERT_UUIDS[cat]
        
        # Check if the user has marked it read/dismissed
        un = db.query(UserNotification).filter(
            UserNotification.user_id == user_id,
            UserNotification.notification_id == notif_id
        ).first()
        
        is_read = False
        read_at_val = None
        if un:
            if un.read_at and un.read_at.year == 1970 and un.read_at.month == 1 and un.read_at.day == 1:
                # Deleted / dismissed (soft-deleted)
                continue
            is_read = bool(un.is_read)
            read_at_val = un.read_at.isoformat() if un.read_at else None
            
        if unreadOnly and is_read:
            continue
            
        notif_type = "error" if cat == "reputation" else "warning"
        
        alert_notifications.append({
            "notification_id": str(notif_id),
            "user_id": str(user_id),
            "title": alert.get("title", ""),
            "message": alert.get("message", ""),
            "notification_type": notif_type,
            "is_read": is_read,
            "created_at": alert.get("occurred_at"),
            "read_at": read_at_val,
        })

    # 2. Fetch standard DB notifications
    from app.modules.auth.repositories.notifications_repo import list_notifications_for_user
    rows = list_notifications_for_user(
        db=db,
        user_id=user_id,
        limit=limit,
        offset=offset,
        unread_only=unreadOnly,
    )
    notifications = []
    for un in rows:
        # Ignore our ALERT_UUID placeholders stored in user_notification db table
        if un.notification_id in ALERT_UUIDS.values():
            continue
        n = un.notification
        notifications.append({
            "notification_id": str(un.notification_id),
            "user_id": str(un.user_id),
            "title": n.title if n else "",
            "message": n.message if n else "",
            "notification_type": n.notification_type if n else "info",
            "is_read": bool(un.is_read),
            "created_at": n.created_at.isoformat() if n and n.created_at else None,
            "read_at": un.read_at.isoformat() if un.read_at else None,
        })
        
    # Prepend alerts if offset == 0
    if offset == 0:
        notifications = alert_notifications + notifications
        
    return {
        "userId": str(user_id),
        "notifications": notifications[:limit],
    }


@router.get("/me/unread-count")
def get_my_unread_count(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_tenant),
):
    user_id = _get_current_user_uuid(current_user)
    
    from app.modules.auth.repositories.notifications_repo import count_unread_notifications
    count = count_unread_notifications(db, user_id)
    
    # Calculate unread count for active dashboard alerts
    try:
        from app.core.tenant_context import resolve_tenant_scope
        org_id = resolve_tenant_scope(current_user, db)
    except Exception:
        org_id = None

    from app.modules.dashboard.services.activity_service import get_alerts
    alerts_res = get_alerts(db, org_id)
    active_alerts = alerts_res.get("alerts", [])
    
    from app.modules.auth.models import UserNotification
    unread_alerts_count = 0
    for alert in active_alerts:
        cat = alert.get("category")
        if cat not in ALERT_UUIDS:
            continue
        notif_id = ALERT_UUIDS[cat]
        
        un = db.query(UserNotification).filter(
            UserNotification.user_id == user_id,
            UserNotification.notification_id == notif_id
        ).first()
        
        is_read = False
        if un:
            if un.read_at and un.read_at.year == 1970 and un.read_at.month == 1 and un.read_at.day == 1:
                # Deleted / dismissed (soft-deleted)
                continue
            is_read = bool(un.is_read)
            
        if not is_read:
            unread_alerts_count += 1
            
    return {
        "userId": str(user_id),
        "count": count + unread_alerts_count,
    }


@router.post("/{notification_id}/read", response_model=NotificationResponse)
def mark_my_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_tenant),
):
    user_id = _get_current_user_uuid(current_user)

    try:
        parsed_id = uuid.UUID(notification_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid notification id")

    # Check if this ID is a deterministic alert UUID
    category = None
    for cat, uid in ALERT_UUIDS.items():
        if uid == parsed_id:
            category = cat
            break
            
    if category:
        try:
            from app.core.tenant_context import resolve_tenant_scope
            org_id = resolve_tenant_scope(current_user, db)
        except Exception:
            org_id = None
            
        from app.modules.dashboard.services.activity_service import get_alerts
        alerts_res = get_alerts(db, org_id)
        active_alerts = alerts_res.get("alerts", [])
        
        title = "Dashboard Alert"
        message = "Active operations alert needing attention."
        for alert in active_alerts:
            if alert.get("category") == category:
                title = alert.get("title", title)
                message = alert.get("message", message)
                break
                
        ensure_alert_notif_exists(db, parsed_id, title, message, category)
        
        from app.modules.auth.models import UserNotification
        un = db.query(UserNotification).filter(
            UserNotification.user_id == user_id,
            UserNotification.notification_id == parsed_id
        ).first()
        
        now = datetime.utcnow()
        if not un:
            un = UserNotification(
                user_id=user_id,
                notification_id=parsed_id,
                is_read=True,
                read_at=now
            )
            db.add(un)
        else:
            un.is_read = True
            un.read_at = now
            
        db.commit()
        
        return NotificationResponse(
            id=str(parsed_id),
            userId=str(user_id),
            title=title,
            message=message,
            type="error" if category == "reputation" else "warning",
            isRead=True,
            createdAt=now.isoformat() + "Z",
            readAt=un.read_at.isoformat() + "Z" if un.read_at else None,
        )

    # Standard DB notification flow
    updated = mark_user_notification_read(db, parsed_id, user_id)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    # Adapt standard result to NotificationResponse schema
    from app.services.notifications_service import _to_response
    return _to_response(updated)


@router.post("/read-all", response_model=MarkAllReadResponse)
def mark_my_notifications_read_all(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_tenant),
):
    user_id = _get_current_user_uuid(current_user)
    
    # First, mark standard notifications as read
    res = mark_user_notifications_read_all(db, user_id)
    
    # Now mark all active dashboard alerts as read as well
    try:
        from app.core.tenant_context import resolve_tenant_scope
        org_id = resolve_tenant_scope(current_user, db)
    except Exception:
        org_id = None
        
    from app.modules.dashboard.services.activity_service import get_alerts
    alerts_res = get_alerts(db, org_id)
    active_alerts = alerts_res.get("alerts", [])
    
    updated_alerts_count = 0
    from app.modules.auth.models import UserNotification
    now = datetime.utcnow()
    
    for alert in active_alerts:
        cat = alert.get("category")
        if cat not in ALERT_UUIDS:
            continue
        notif_id = ALERT_UUIDS[cat]
        
        un = db.query(UserNotification).filter(
            UserNotification.user_id == user_id,
            UserNotification.notification_id == notif_id
        ).first()
        
        if not un:
            ensure_alert_notif_exists(db, notif_id, alert.get("title", ""), alert.get("message", ""), cat)
            un = UserNotification(
                user_id=user_id,
                notification_id=notif_id,
                is_read=True,
                read_at=now
            )
            db.add(un)
            updated_alerts_count += 1
        elif not un.is_read:
            un.is_read = True
            un.read_at = now
            updated_alerts_count += 1
            
    db.commit()
    
    return MarkAllReadResponse(updated=res.updated + updated_alerts_count)


@router.delete("/read-all")
def delete_my_read_notifications(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_tenant),
):
    """Delete all read notifications for the current user."""
    user_id = _get_current_user_uuid(current_user)
    from app.modules.auth.models import UserNotification
    
    # Delete standard read notifications
    deleted = (
        db.query(UserNotification)
        .filter(
            UserNotification.user_id == user_id,
            UserNotification.is_read == True,
        )
        .delete(synchronize_session="fetch")
    )
    
    # Dismiss (soft-delete) any read dashboard alerts
    try:
        from app.core.tenant_context import resolve_tenant_scope
        org_id = resolve_tenant_scope(current_user, db)
    except Exception:
        org_id = None
        
    from app.modules.dashboard.services.activity_service import get_alerts
    alerts_res = get_alerts(db, org_id)
    active_alerts = alerts_res.get("alerts", [])
    
    sentinel = datetime(1970, 1, 1)
    for alert in active_alerts:
        cat = alert.get("category")
        if cat not in ALERT_UUIDS:
            continue
        notif_id = ALERT_UUIDS[cat]
        
        un = db.query(UserNotification).filter(
            UserNotification.user_id == user_id,
            UserNotification.notification_id == notif_id
        ).first()
        
        if un and un.is_read:
            un.read_at = sentinel
            
    db.commit()
    return {"success": True, "deleted": deleted, "message": "Read notifications cleared"}


@router.delete("/{notification_id}")
def delete_my_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_tenant),
):
    """Delete a specific notification for the current user."""
    user_id = _get_current_user_uuid(current_user)
    try:
        parsed_id = uuid.UUID(notification_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid notification id")

    # Check if this ID is a deterministic alert UUID
    category = None
    for cat, uid in ALERT_UUIDS.items():
        if uid == parsed_id:
            category = cat
            break

    if category:
        try:
            from app.core.tenant_context import resolve_tenant_scope
            org_id = resolve_tenant_scope(current_user, db)
        except Exception:
            org_id = None
            
        from app.modules.dashboard.services.activity_service import get_alerts
        alerts_res = get_alerts(db, org_id)
        active_alerts = alerts_res.get("alerts", [])
        
        title = "Dashboard Alert"
        message = "Active operations alert needing attention."
        for alert in active_alerts:
            if alert.get("category") == category:
                title = alert.get("title", title)
                message = alert.get("message", message)
                break
                
        ensure_alert_notif_exists(db, parsed_id, title, message, category)
        
        from app.modules.auth.models import UserNotification
        un = db.query(UserNotification).filter(
            UserNotification.user_id == user_id,
            UserNotification.notification_id == parsed_id
        ).first()
        
        sentinel = datetime(1970, 1, 1)
        if not un:
            un = UserNotification(
                user_id=user_id,
                notification_id=parsed_id,
                is_read=True,
                read_at=sentinel
            )
            db.add(un)
        else:
            un.is_read = True
            un.read_at = sentinel
            
        db.commit()
        return {"success": True, "message": "Notification deleted"}

    # Standard DB notification flow
    from app.modules.auth.models import UserNotification
    deleted = (
        db.query(UserNotification)
        .filter(
            UserNotification.notification_id == parsed_id,
            UserNotification.user_id == user_id,
        )
        .delete(synchronize_session="fetch")
    )
    db.commit()
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return {"success": True, "message": "Notification deleted"}
