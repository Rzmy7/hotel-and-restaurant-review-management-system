"""Dashboard activity service — alerts and activity feed."""

import re
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

from sqlalchemy.orm import Session
from sqlalchemy import text


# ── Alert Namespaces & Configurations ───────────────────────────────

class AlertCategory:
    REPUTATION = "reputation"
    OPERATIONS = "operations"
    TREND = "trend"


class AlertSeverity:
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"


class AlertActionType:
    VIEW_REVIEWS = "view_reviews"
    OPEN_INSIGHTS = "open_insights"


CRITICAL_REVIEW_KEYWORDS = [
    "food poisoning", "bed bug", "poison", "bug", "dirty", "hygiene", "pest", "theft", "scam", "cockroach"
]


ALERT_CONFIG = {
    "critical_window_hours": 24,
    "sla_hours": 48,
    "trend_days_period": 7,
    "trend_ratio_threshold": 1.5,
    "trend_min_previous": 3,
    "trend_min_current": 5,
}


# ── Payload Builder ──────────────────────────────────────────────────

def build_alert_payload(
    category: str,
    severity: str,
    title: str,
    message: str,
    action_type: str,
    priority: int = 50,
    filters: Optional[dict] = None,
    metadata: Optional[dict] = None
) -> dict:
    """Build a presentation-agnostic Alert payload conforming to frontend contract."""
    return {
        "id": f"alert-{category}-{str(uuid.uuid4())[:8]}",
        "category": category,
        "severity": severity,
        "title": title,
        "message": message,
        "occurred_at": datetime.utcnow().isoformat() + "Z",
        "priority": priority,
        "action": {
            "type": action_type,
            "filters": filters or {}
        },
        "metadata": metadata or {}
    }


# ── Read-Only Detectors ──────────────────────────────────────────────

def detect_reputation_alert(db: Session, org_id: Optional[str]) -> Optional[dict]:
    """Check for critical low-rating reviews and hygiene complaints in the last 24h."""
    one_day_ago = datetime.utcnow() - timedelta(hours=ALERT_CONFIG["critical_window_hours"])
    
    if org_id:
        sql = """
            SELECT r.id, r.[text]
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = :org_id 
              AND r.reviewDate >= :one_day_ago
              AND r.rating <= 2
        """
        params = {"org_id": org_id, "one_day_ago": one_day_ago}
    else:
        sql = """
            SELECT r.id, r.[text]
            FROM dbo.processed_review r
            WHERE r.reviewDate >= :one_day_ago
              AND r.rating <= 2
        """
        params = {"one_day_ago": one_day_ago}

    crit_rows = db.execute(text(sql), params).fetchall()
    crit_count = len(crit_rows)

    if crit_count > 0:
        matched_keywords = []
        for row in crit_rows:
            review_text = (row.text or "").lower()
            cleaned_text = re.sub(r'[^a-z0-9\s]', ' ', review_text)
            for k in CRITICAL_REVIEW_KEYWORDS:
                pattern = r'\b' + re.escape(k) + r'\b'
                if re.search(pattern, cleaned_text) and k not in matched_keywords:
                    matched_keywords.append(k)

        if matched_keywords:
            return build_alert_payload(
                category=AlertCategory.REPUTATION,
                severity=AlertSeverity.CRITICAL,
                title="Critical hygiene/safety complaints",
                message=f"{crit_count} recent review(s) flagged with hygiene or safety issues (e.g., {', '.join(matched_keywords[:2])}).",
                action_type=AlertActionType.VIEW_REVIEWS,
                priority=100,
                filters={"ratingMax": 2, "keywords": matched_keywords, "dateRange": "24h"},
                metadata={
                    "count": crit_count,
                    "keywords": matched_keywords,
                    "detector": "reputation",
                    "rule": "critical_keyword_match"
                }
            )
        else:
            return build_alert_payload(
                category=AlertCategory.REPUTATION,
                severity=AlertSeverity.CRITICAL,
                title="Critical reviews detected",
                message=f"⚠️ {crit_count} new critical reviews detected in the last 24 hours.",
                action_type=AlertActionType.VIEW_REVIEWS,
                priority=90,
                filters={"ratingMax": 2, "dateRange": "24h"},
                metadata={
                    "count": crit_count,
                    "detector": "reputation",
                    "rule": "critical_rating"
                }
            )
    return None


def detect_operations_alert(db: Session, org_id: Optional[str]) -> Optional[dict]:
    """Check for negative reviews waiting for response beyond SLA threshold."""
    two_days_ago = datetime.utcnow() - timedelta(hours=ALERT_CONFIG["sla_hours"])
    
    if org_id:
        sql = """
            SELECT COUNT(*) 
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = :org_id
              AND r.rating <= 2
              AND r.[status] = 'Pending'
              AND r.reviewDate <= :two_days_ago
        """
        params = {"org_id": org_id, "two_days_ago": two_days_ago}
    else:
        sql = """
            SELECT COUNT(*) 
            FROM dbo.processed_review r
            WHERE r.rating <= 2
              AND r.[status] = 'Pending'
              AND r.reviewDate <= :two_days_ago
        """
        params = {"two_days_ago": two_days_ago}

    sla_count = db.execute(text(sql), params).scalar() or 0
    if sla_count > 0:
        return build_alert_payload(
            category=AlertCategory.OPERATIONS,
            severity=AlertSeverity.WARNING,
            title="Overdue review responses",
            message=f"⏳ {sla_count} negative reviews unanswered for over 48 hours.",
            action_type=AlertActionType.VIEW_REVIEWS,
            priority=80,
            filters={"ratingMax": 2, "status": "Pending", "slaOverdue": True},
            metadata={
                "count": sla_count,
                "detector": "operations",
                "rule": "unanswered_sla_breach"
            }
        )
    return None


def detect_trend_alert(db: Session, org_id: Optional[str]) -> Optional[dict]:
    """Check for surges in low ratings compared to the previous week."""
    seven_days_ago = (datetime.utcnow() - timedelta(days=ALERT_CONFIG["trend_days_period"])).date()
    fourteen_days_ago = (datetime.utcnow() - timedelta(days=2 * ALERT_CONFIG["trend_days_period"])).date()
    
    if org_id:
        sql = """
            SELECT 
                SUM(CASE WHEN r.reviewDate >= :seven_days_ago THEN 1 ELSE 0 END) as this_week,
                SUM(CASE WHEN r.reviewDate >= :fourteen_days_ago AND r.reviewDate < :seven_days_ago THEN 1 ELSE 0 END) as last_week
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE r.rating <= 2 AND s.organization_id = :org_id
        """
        params = {"seven_days_ago": seven_days_ago, "fourteen_days_ago": fourteen_days_ago, "org_id": org_id}
    else:
        sql = """
            SELECT 
                SUM(CASE WHEN r.reviewDate >= :seven_days_ago THEN 1 ELSE 0 END) as this_week,
                SUM(CASE WHEN r.reviewDate >= :fourteen_days_ago AND r.reviewDate < :seven_days_ago THEN 1 ELSE 0 END) as last_week
            FROM dbo.processed_review r
            WHERE r.rating <= 2
        """
        params = {"seven_days_ago": seven_days_ago, "fourteen_days_ago": fourteen_days_ago}

    result = db.execute(text(sql), params).fetchone()
    this_week_neg = (result.this_week if result else 0) or 0
    last_week_neg = (result.last_week if result else 0) or 0

    # Ensure minimum sample sizes to prevent false alarms
    min_prev = ALERT_CONFIG["trend_min_previous"]
    min_curr = ALERT_CONFIG["trend_min_current"]
    
    if this_week_neg >= min_curr or last_week_neg >= min_prev:
        ratio = round(this_week_neg / max(last_week_neg, 1), 1)
        if ratio >= ALERT_CONFIG["trend_ratio_threshold"]:
            return build_alert_payload(
                category=AlertCategory.TREND,
                severity=AlertSeverity.INFO,
                title="Spike in negative reviews",
                message=f"📉 Negative reviews increased {ratio}x this week vs last week.",
                action_type=AlertActionType.OPEN_INSIGHTS,
                priority=50,
                filters={"metric": "sentiment", "period": ALERT_CONFIG["trend_days_period"]},
                metadata={
                    "count": this_week_neg,
                    "ratio": ratio,
                    "detector": "trend",
                    "rule": "sentiment_surge"
                }
            )
    return None


# ── Orchestrator ─────────────────────────────────────────────────────

def get_alerts(db: Session, org_id: str = None) -> dict:
    """Orchestrate, priority-stack, and cap the active alerts at 3."""
    raw_alerts = [
        detect_reputation_alert(db, org_id),
        detect_operations_alert(db, org_id),
        detect_trend_alert(db, org_id)
    ]
    # Filter out None values and sort by descending priority before slicing to max 3
    alerts = [a for a in raw_alerts if a]
    alerts.sort(key=lambda x: x.get("priority", 0), reverse=True)
    return {"alerts": alerts[:3]}


def get_activities(db: Session, org_id: str = None) -> dict:
    if org_id:
        sql = """
            SELECT TOP 15 
                r.id, r.reviewerName as userName, r.sentiment, r.rating, 
                r.reviewDate, r.[status], p.platform_name as platform_id
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            JOIN dbo.platform p ON s.platform_id = p.platform_id
            WHERE s.organization_id = :org_id
            ORDER BY r.reviewDate DESC
        """
        params = {"org_id": org_id}
    else:
        sql = """
            SELECT TOP 15 
                r.id, r.reviewerName as userName, r.sentiment, r.rating, 
                r.reviewDate, r.[status], p.platform_name as platform_id
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            JOIN dbo.platform p ON s.platform_id = p.platform_id
            ORDER BY r.reviewDate DESC
        """
        params = {}
        
    rows = db.execute(text(sql), params).fetchall()

    activities = []
    for row in rows:
        activities.append(
            {
                "id": str(row.id),
                "type": "scrape_completed" if row.status == "Replied" else "user_joined",
                "title": "Reply sent" if row.status == "Replied" else "New Review",
                "description": f"By {row.userName} on {row.platform_id}",
                "timestamp": row.reviewDate.isoformat() if row.reviewDate else datetime.utcnow().isoformat(),
                "user": row.userName,
            }
        )
    return {"activities": activities}


def get_negative_reviews_for_org(db: Session, org_id: str) -> dict:
    # Get count
    sql_count = """
        SELECT COUNT(*) 
        FROM dbo.processed_review r
        JOIN dbo.source s ON r.source_id = s.source_id
        WHERE s.organization_id = :org_id AND r.sentiment = 'Negative'
    """
    count = db.execute(text(sql_count), {"org_id": org_id}).scalar() or 0

    # Get detailed reviews
    sql_reviews = """
        SELECT 
            r.id, r.reviewerName, r.rating, r.text as reviewText, 
            r.reviewDate, p.platform_name as platform_id, r.sentiment
        FROM dbo.processed_review r
        JOIN dbo.source s ON r.source_id = s.source_id
        JOIN dbo.platform p ON s.platform_id = p.platform_id
        WHERE s.organization_id = :org_id AND r.sentiment = 'Negative'
        ORDER BY r.reviewDate DESC
    """
    rows = db.execute(text(sql_reviews), {"org_id": org_id}).fetchall()

    reviews = []
    for row in rows:
        reviews.append(
            {
                "id": row.id,
                "reviewerName": row.reviewerName,
                "rating": row.rating,
                "reviewText": row.reviewText,
                "date": row.reviewDate.isoformat() if row.reviewDate else None,
                "source": row.platform_id,
                "sentiment": row.sentiment,
            }
        )

    return {"count": count, "reviews": reviews}


def get_sentiment_counts(db: Session, org_id: str) -> dict:
    sql = """
        SELECT r.sentiment, COUNT(*) as cnt 
        FROM dbo.processed_review r
        JOIN dbo.source s ON r.source_id = s.source_id
        WHERE s.organization_id = :org_id
        GROUP BY r.sentiment
    """
    rows = db.execute(text(sql), {"org_id": org_id}).fetchall()

    counts = {"Positive": 0, "Negative": 0, "Neutral": 0}
    for row in rows:
        if row.sentiment in counts:
            counts[row.sentiment] = row.cnt

    total_cnt = sum(counts.values())
    pos_percentage = (
        round((counts["Positive"] / total_cnt) * 100, 1) if total_cnt > 0 else 0
    )

    return {
        "positive": counts["Positive"],
        "negative": counts["Negative"],
        "neutral": counts["Neutral"],
        "total": total_cnt,
        "positivePercentage": pos_percentage,
    }
