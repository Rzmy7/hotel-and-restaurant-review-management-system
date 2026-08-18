import pytest
from unittest.mock import MagicMock
from app.modules.dashboard.services.activity_service import (
    AlertCategory,
    AlertSeverity,
    AlertActionType,
    detect_reputation_alert,
    detect_operations_alert,
    detect_trend_alert,
    get_alerts
)

def test_detect_reputation_alert_no_reviews():
    db = MagicMock()
    mock_cursor = MagicMock()
    mock_cursor.fetchall.return_value = []
    db.execute.return_value = mock_cursor

    alert = detect_reputation_alert(db, "org-123")
    assert alert is None

def test_detect_reputation_alert_standard_low_rating():
    db = MagicMock()
    mock_cursor = MagicMock()
    # Mocking rows with .text or equivalent
    row1 = MagicMock()
    row1.text = "The room was tiny."
    row1.id = "r1"
    
    mock_cursor.fetchall.return_value = [row1]
    db.execute.return_value = mock_cursor

    alert = detect_reputation_alert(db, "org-123")
    assert alert is not None
    assert alert["category"] == AlertCategory.REPUTATION
    assert alert["severity"] == AlertSeverity.CRITICAL
    assert "Critical reviews detected" in alert["title"]
    assert alert["action"]["type"] == AlertActionType.VIEW_REVIEWS

def test_detect_reputation_alert_critical_keywords():
    db = MagicMock()
    mock_cursor = MagicMock()
    row1 = MagicMock()
    row1.text = "I suspect food poisoning at dinner."
    row1.id = "r1"
    
    mock_cursor.fetchall.return_value = [row1]
    db.execute.return_value = mock_cursor

    alert = detect_reputation_alert(db, "org-123")
    assert alert is not None
    assert alert["category"] == AlertCategory.REPUTATION
    assert alert["severity"] == AlertSeverity.CRITICAL
    assert "hygiene/safety" in alert["title"].lower()
    assert "food poisoning" in alert["metadata"]["keywords"]
    assert alert["action"]["type"] == AlertActionType.VIEW_REVIEWS

def test_detect_operations_alert_none():
    db = MagicMock()
    mock_cursor = MagicMock()
    mock_cursor.scalar.return_value = 0
    db.execute.return_value = mock_cursor

    alert = detect_operations_alert(db, "org-123")
    assert alert is None

def test_detect_operations_alert_with_overdue():
    db = MagicMock()
    mock_cursor = MagicMock()
    mock_cursor.scalar.return_value = 5
    db.execute.return_value = mock_cursor

    alert = detect_operations_alert(db, "org-123")
    assert alert is not None
    assert alert["category"] == AlertCategory.OPERATIONS
    assert alert["severity"] == AlertSeverity.WARNING
    assert "Overdue review responses" in alert["title"]
    assert alert["metadata"]["count"] == 5

def test_detect_trend_alert_no_volume():
    db = MagicMock()
    mock_cursor = MagicMock()
    row = MagicMock()
    row.this_week = 2
    row.last_week = 1
    mock_cursor.fetchone.return_value = row
    db.execute.return_value = mock_cursor

    # Under minimum volumes: trend_min_current=5, trend_min_previous=3
    alert = detect_trend_alert(db, "org-123")
    assert alert is None

def test_detect_trend_alert_no_surge():
    db = MagicMock()
    mock_cursor = MagicMock()
    row = MagicMock()
    row.this_week = 5
    row.last_week = 5
    mock_cursor.fetchone.return_value = row
    db.execute.return_value = mock_cursor

    # Volumes are enough, but ratio is 1.0 (threshold is 1.5)
    alert = detect_trend_alert(db, "org-123")
    assert alert is None

def test_detect_trend_alert_surge_triggered():
    db = MagicMock()
    mock_cursor = MagicMock()
    row = MagicMock()
    row.this_week = 10
    row.last_week = 4
    mock_cursor.fetchone.return_value = row
    db.execute.return_value = mock_cursor

    # Ratio is 2.5, which is above 1.5
    alert = detect_trend_alert(db, "org-123")
    assert alert is not None
    assert alert["category"] == AlertCategory.TREND
    assert alert["severity"] == AlertSeverity.INFO
    assert alert["metadata"]["ratio"] == 2.5

def test_get_alerts_orchestration():
    db = MagicMock()
    
    # Let's mock each execute call in order.
    # 1. detect_reputation_alert executes fetchall() -> 1 standard low rating review (priority 90)
    cursor_reputation = MagicMock()
    row_rep = MagicMock()
    row_rep.id = "r_rep"
    row_rep.text = "Bad room"
    cursor_reputation.fetchall.return_value = [row_rep]
    
    # 2. detect_operations_alert executes scalar() -> 4 overdue (priority 80)
    cursor_ops = MagicMock()
    cursor_ops.scalar.return_value = 4
    
    # 3. detect_trend_alert executes fetchone() -> 8 this week, 3 last week (priority 50)
    cursor_trend = MagicMock()
    row_trend = MagicMock()
    row_trend.this_week = 8
    row_trend.last_week = 3
    cursor_trend.fetchone.return_value = row_trend
    
    db.execute.side_effect = [cursor_reputation, cursor_ops, cursor_trend]
    
    result = get_alerts(db, "org-123")
    assert "alerts" in result
    alerts = result["alerts"]
    assert len(alerts) <= 3
    
    # Verify descending priority sorting order: Reputation (90) -> Operations (80) -> Trend (50)
    assert alerts[0]["category"] == AlertCategory.REPUTATION
    assert alerts[0]["priority"] == 90
    assert alerts[0]["metadata"]["rule"] == "critical_rating"
    
    assert alerts[1]["category"] == AlertCategory.OPERATIONS
    assert alerts[1]["priority"] == 80
    assert alerts[1]["metadata"]["rule"] == "unanswered_sla_breach"
    
    assert alerts[2]["category"] == AlertCategory.TREND
    assert alerts[2]["priority"] == 50
    assert alerts[2]["metadata"]["rule"] == "sentiment_surge"

def test_detect_reputation_alert_no_false_positive_substring():
    db = MagicMock()
    mock_cursor = MagicMock()
    row1 = MagicMock()
    row1.text = "I am debugging a buggy script on our website."
    row1.id = "r1"
    
    mock_cursor.fetchall.return_value = [row1]
    db.execute.return_value = mock_cursor

    alert = detect_reputation_alert(db, "org-123")
    assert alert is not None
    # Substring 'bug' should not match due to word boundaries, falling back to standard critical rating alert
    assert alert["metadata"]["rule"] == "critical_rating"
    assert "keywords" not in alert["metadata"]

