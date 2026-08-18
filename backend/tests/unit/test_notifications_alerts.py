import pytest
import uuid
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone
from fastapi import HTTPException

from app.modules.auth.routes.notifications_routes import (
    get_my_notifications,
    get_my_unread_count,
    mark_my_notification_read,
    delete_my_notification,
    ALERT_UUIDS,
    ensure_alert_notif_exists
)

@pytest.fixture
def mock_db():
    return MagicMock()


@pytest.fixture
def mock_current_user():
    return {"user_id": str(uuid.uuid4()), "role": "TENANT", "organization_id": "org-123"}


def test_ensure_alert_notif_exists_creates_when_missing(mock_db):
    # Mock Notification query returning None
    mock_db.query().filter().first.return_value = None
    
    notif_id = uuid.uuid4()
    ensure_alert_notif_exists(mock_db, notif_id, "Test Title", "Test Message", "reputation")
    
    # Verify add and commit were called
    assert mock_db.add.called
    assert mock_db.commit.called


def test_get_my_notifications_prepends_active_alerts(mock_db, mock_current_user):
    # Mock tenant scope resolution
    with patch("app.core.tenant_context.resolve_tenant_scope", return_value="org-123"), \
         patch("app.modules.dashboard.services.activity_service.get_alerts", return_value={
             "alerts": [{
                 "category": "reputation",
                 "severity": "critical",
                 "title": "Critical reviews detected",
                 "message": "⚠️ 3 new critical reviews detected",
                 "occurred_at": "2026-07-05T12:00:00Z",
                 "priority": 90,
                 "action": {"type": "view_reviews", "filters": {}},
                 "metadata": {}
             }]
         }), \
         patch("app.modules.auth.repositories.notifications_repo.list_notifications_for_user", return_value=[]):
         
         # Mock UserNotification query returning None (not read/dismissed yet)
         mock_db.query().filter().first.return_value = None
         
         res = get_my_notifications(limit=10, offset=0, unreadOnly=False, db=mock_db, current_user=mock_current_user)
         
         assert "notifications" in res
         notifications = res["notifications"]
         assert len(notifications) == 1
         assert notifications[0]["notification_id"] == str(ALERT_UUIDS["reputation"])
         assert notifications[0]["title"] == "Critical reviews detected"
         assert notifications[0]["notification_type"] == "error"  # Reputation maps to error
         assert not notifications[0]["is_read"]


def test_get_my_unread_count_includes_active_alerts(mock_db, mock_current_user):
    with patch("app.core.tenant_context.resolve_tenant_scope", return_value="org-123"), \
         patch("app.modules.dashboard.services.activity_service.get_alerts", return_value={
             "alerts": [{
                 "category": "operations",
                 "severity": "warning",
                 "title": "Overdue responses",
                 "message": "⏳ 4 negative reviews unanswered",
                 "occurred_at": "2026-07-05T12:00:00Z",
                 "priority": 80,
                 "action": {"type": "view_reviews", "filters": {}},
                 "metadata": {}
             }]
         }), \
         patch("app.modules.auth.repositories.notifications_repo.count_unread_notifications", return_value=5):
         
         # Mock UserNotification query returning None (unread alert)
         mock_db.query().filter().first.return_value = None
         
         res = get_my_unread_count(db=mock_db, current_user=mock_current_user)
         
         # Total unread count should be 5 (from db) + 1 (active alert) = 6
         assert res["count"] == 6


def test_mark_my_notification_read_alert(mock_db, mock_current_user):
    reputation_uuid_str = str(ALERT_UUIDS["reputation"])
    
    with patch("app.core.tenant_context.resolve_tenant_scope", return_value="org-123"), \
         patch("app.modules.dashboard.services.activity_service.get_alerts", return_value={
             "alerts": [{
                 "category": "reputation",
                 "title": "Critical reviews",
                 "message": "⚠️ 3 reviews"
             }]
         }), \
         patch("app.modules.auth.routes.notifications_routes.ensure_alert_notif_exists") as mock_ensure:
         
         # Mock query to check/insert UserNotification
         mock_un = MagicMock()
         mock_un.is_read = True
         mock_un.read_at = datetime.utcnow()
         mock_db.query().filter().first.return_value = None  # None initially, will be inserted
         
         res = mark_my_notification_read(notification_id=reputation_uuid_str, db=mock_db, current_user=mock_current_user)
         
         assert res.isRead is True
         assert res.id == reputation_uuid_str
         assert mock_ensure.called


def test_delete_my_notification_alert_soft_deletes_with_sentinel(mock_db, mock_current_user):
    reputation_uuid_str = str(ALERT_UUIDS["reputation"])
    
    with patch("app.core.tenant_context.resolve_tenant_scope", return_value="org-123"), \
         patch("app.modules.dashboard.services.activity_service.get_alerts", return_value={"alerts": []}), \
         patch("app.modules.auth.routes.notifications_routes.ensure_alert_notif_exists"):
         
         # Mock existing UserNotification
         mock_un = MagicMock()
         mock_db.query().filter().first.return_value = mock_un
         
         res = delete_my_notification(notification_id=reputation_uuid_str, db=mock_db, current_user=mock_current_user)
         
         assert res == {"success": True, "message": "Notification deleted"}
         # Verify we set read_at to the 1970 sentinel date
         assert mock_un.is_read is True
         assert mock_un.read_at == datetime(1970, 1, 1)
         assert mock_db.commit.called


def test_mark_my_notification_read_standard(mock_db, mock_current_user):
    notif_id = uuid.uuid4()
    notif_id_str = str(notif_id)
    
    mock_response = MagicMock()
    with patch("app.modules.auth.routes.notifications_routes.mark_user_notification_read", return_value=mock_response) as mock_read:
        res = mark_my_notification_read(notification_id=notif_id_str, db=mock_db, current_user=mock_current_user)
        assert res == mock_response
        mock_read.assert_called_once_with(mock_db, notif_id, uuid.UUID(mock_current_user["user_id"]))
