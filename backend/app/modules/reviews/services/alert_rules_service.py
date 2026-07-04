"""
Alert Rules Service — rule CRUD, evaluation engine, and notification dispatch.

Evaluates configurable alert rules against review data and creates
system alerts when thresholds are exceeded.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

import pyodbc
from app.core.pyodbc_connection import get_connection_string

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────
# 1. Rule Evaluation Engine
# ──────────────────────────────────────────────────────────────────────


def evaluate_rule(org_id: str, rule: dict) -> Optional[dict]:
    """
    Evaluate a single alert rule against live review data.

    Returns a dict with alert details if triggered, or None if not.
    """
    condition = rule.get("condition_type", "")
    threshold = float(rule.get("threshold", 0))
    lookback = int(rule.get("lookback_hours", 24))

    if condition == "low_rating":
        return _eval_low_rating(org_id, threshold, lookback, rule)
    elif condition == "negative_sentiment_spike":
        return _eval_negative_spike(org_id, int(threshold), lookback, rule)
    elif condition == "response_overdue":
        return _eval_response_overdue(org_id, threshold, lookback, rule)

    return None


def _eval_low_rating(
    org_id: str, max_rating: float, lookback_hours: int, rule: dict
) -> Optional[dict]:
    """Check for reviews with rating <= max_rating in the lookback window."""
    since = datetime.utcnow() - timedelta(hours=lookback_hours)

    conn = pyodbc.connect(get_connection_string())
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT COUNT(*) AS cnt, AVG(CAST(rating AS FLOAT)) AS avg_rating
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = ?
              AND r.rating <= ?
              AND r.reviewDate >= ?
            """,
            org_id, max_rating, since,
        )
        row = cursor.fetchone()
        count = row.cnt if row else 0
        avg = round(float(row.avg_rating or 0), 1) if row and row.avg_rating else 0.0
    finally:
        conn.close()

    if count == 0:
        return None

    return {
        "severity": "error" if count >= 5 else "warning",
        "title": f"Low Rating Alert: {count} reviews rated ≤ {max_rating}★",
        "message": (
            f"In the last {lookback_hours}h, {count} review(s) scored "
            f"{max_rating} stars or below (avg {avg}). "
            f"Review and address guest concerns promptly."
        ),
        "rule_name": rule.get("name", "Low Rating Rule"),
        "rule_id": str(rule.get("id", "")),
        "trigger_data": {"count": count, "avg_rating": avg, "threshold": max_rating},
    }


def _eval_negative_spike(
    org_id: str, min_neg_count: int, lookback_hours: int, rule: dict
) -> Optional[dict]:
    """Check for negative sentiment spike in the lookback window."""
    since = datetime.utcnow() - timedelta(hours=lookback_hours)

    conn = pyodbc.connect(get_connection_string())
    try:
        cursor = conn.cursor()

        # Total reviews in window
        cursor.execute(
            """
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN sentiment = 'Negative' THEN 1 ELSE 0 END) AS neg_cnt
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = ?
              AND r.reviewDate >= ?
            """,
            org_id, since,
        )
        row = cursor.fetchone()
        total = row.total if row else 0
        neg = row.neg_cnt if row else 0

        # Also check the previous window for comparison
        prev_since = since - timedelta(hours=lookback_hours)
        cursor.execute(
            """
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN sentiment = 'Negative' THEN 1 ELSE 0 END) AS neg_cnt
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = ?
              AND r.reviewDate >= ? AND r.reviewDate < ?
            """,
            org_id, prev_since, since,
        )
        prev_row = cursor.fetchone()
        prev_neg = prev_row.neg_cnt if prev_row else 0
    finally:
        conn.close()

    if neg < min_neg_count:
        return None

    pct = round((neg / total) * 100, 1) if total > 0 else 0
    prev_pct = round((prev_neg / prev_row.total) * 100, 1) if prev_row and prev_row.total else 0
    spike = pct - prev_pct

    return {
        "severity": "critical" if spike > 20 else "warning",
        "title": f"Negative Sentiment Spike: {neg} negative reviews",
        "message": (
            f"{neg} negative review(s) in the last {lookback_hours}h "
            f"({pct}% of {total} total). "
            f"{'This is a significant increase from the previous period (' + str(prev_pct) + '%).' if spike > 5 else ''}"
        ),
        "rule_name": rule.get("name", "Negative Sentiment Rule"),
        "rule_id": str(rule.get("id", "")),
        "trigger_data": {
            "negative_count": neg, "total": total, "pct": pct,
            "prev_pct": prev_pct, "spike": spike,
        },
    }


def _eval_response_overdue(
    org_id: str, max_hours: float, lookback_hours: int, rule: dict
) -> Optional[dict]:
    """Check for reviews without replies that are overdue."""
    since = datetime.utcnow() - timedelta(hours=lookback_hours)
    overdue_cutoff = datetime.utcnow() - timedelta(hours=max_hours)

    conn = pyodbc.connect(get_connection_string())
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT COUNT(*) AS cnt
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = ?
              AND (r.ai_reply IS NULL OR LEN(r.ai_reply) = 0)
              AND r.reviewDate >= ?
              AND r.reviewDate < ?
            """,
            org_id, since, overdue_cutoff,
        )
        row = cursor.fetchone()
        count = row.cnt if row else 0
    finally:
        conn.close()

    if count == 0:
        return None

    return {
        "severity": "warning",
        "title": f"Response Overdue: {count} reviews awaiting reply",
        "message": (
            f"{count} review(s) received more than {int(max_hours)}h ago "
            f"have no AI reply. Generate responses to maintain engagement."
        ),
        "rule_name": rule.get("name", "Response Overdue Rule"),
        "rule_id": str(rule.get("id", "")),
        "trigger_data": {"overdue_count": count, "max_hours": max_hours},
    }


# ──────────────────────────────────────────────────────────────────────
# 2. Rule Evaluation Orchestrator
# ──────────────────────────────────────────────────────────────────────


def evaluate_all_rules_for_org(org_id: str) -> list[dict]:
    """
    Evaluate all enabled rules for an organization.
    Returns a list of triggered alert dicts.
    """
    rules = get_rules_for_org(org_id, enabled_only=True)
    if not rules:
        return []

    triggered = []
    for rule in rules:
        try:
            result = evaluate_rule(org_id, rule)
            if result:
                triggered.append(result)
                _update_rule_trigger(rule["id"])
        except Exception as e:
            logger.error(f"Rule evaluation failed for rule {rule.get('id')}: {e}")

    return triggered


def evaluate_and_notify(org_id: str):
    """
    Evaluate all rules for an org and dispatch alerts.
    Should be called after new reviews are ingested.
    """
    from app.modules.admin.services.system_alert_logger import log_system_alert

    triggered = evaluate_all_rules_for_org(org_id)
    for alert in triggered:
        try:
            log_system_alert(
                severity=alert["severity"],
                title=alert["title"],
                message=alert["message"],
                category="alert_rule",
                metadata=alert.get("trigger_data"),
            )
            logger.info(
                f"Alert rule triggered: {alert['rule_name']} for org {org_id}"
            )
        except Exception as e:
            logger.error(f"Failed to dispatch alert: {e}")

    return triggered


# ──────────────────────────────────────────────────────────────────────
# 3. Rule CRUD
# ──────────────────────────────────────────────────────────────────────


def get_rules_for_org(org_id: str, enabled_only: bool = False) -> list[dict]:
    """Fetch all alert rules for an organization."""
    conn = pyodbc.connect(get_connection_string())
    try:
        cursor = conn.cursor()
        sql = """
            SELECT
                CAST(id AS VARCHAR(36)) AS id,
                CAST(organization_id AS VARCHAR(36)) AS organization_id,
                name, description,
                condition_type, threshold, lookback_hours,
                action_type, is_enabled,
                last_triggered_at, trigger_count,
                created_at, updated_at
            FROM dbo.alert_rule
            WHERE organization_id = CAST(? AS UNIQUEIDENTIFIER)
        """
        if enabled_only:
            sql += " AND is_enabled = 1"
        sql += " ORDER BY created_at DESC"

        cursor.execute(sql, org_id)
        columns = [col[0] for col in cursor.description]
        return [_row_to_dict(row, columns) for row in cursor.fetchall()]
    finally:
        conn.close()


def get_rule_by_id(rule_id: str) -> Optional[dict]:
    """Fetch a single rule by ID."""
    conn = pyodbc.connect(get_connection_string())
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                CAST(id AS VARCHAR(36)) AS id,
                CAST(organization_id AS VARCHAR(36)) AS organization_id,
                name, description,
                condition_type, threshold, lookback_hours,
                action_type, is_enabled,
                last_triggered_at, trigger_count,
                created_at, updated_at
            FROM dbo.alert_rule
            WHERE id = CAST(? AS UNIQUEIDENTIFIER)
            """,
            rule_id,
        )
        row = cursor.fetchone()
        if not row:
            return None
        columns = [col[0] for col in cursor.description]
        return _row_to_dict(row, columns)
    finally:
        conn.close()


def create_rule(org_id: str, data: dict) -> dict:
    """Create a new alert rule."""
    import uuid

    rule_id = str(uuid.uuid4())
    now = datetime.utcnow()

    conn = pyodbc.connect(get_connection_string())
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO dbo.alert_rule
                (id, organization_id, name, description,
                 condition_type, threshold, lookback_hours,
                 action_type, is_enabled, created_at, updated_at)
            VALUES
                (CAST(? AS UNIQUEIDENTIFIER), CAST(? AS UNIQUEIDENTIFIER),
                 ?, ?, ?, ?, ?, ?, 1, ?, ?)
            """,
            rule_id, org_id,
            data.get("name", "Untitled Rule"),
            data.get("description", ""),
            data.get("condition_type", "low_rating"),
            float(data.get("threshold", 2)),
            int(data.get("lookback_hours", 24)),
            data.get("action_type", "notification"),
            now, now,
        )
        conn.commit()
    finally:
        conn.close()

    return get_rule_by_id(rule_id)


def update_rule(rule_id: str, data: dict) -> Optional[dict]:
    """Update an existing alert rule."""
    existing = get_rule_by_id(rule_id)
    if not existing:
        return None

    now = datetime.utcnow()
    conn = pyodbc.connect(get_connection_string())
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE dbo.alert_rule
            SET name = ?,
                description = ?,
                condition_type = ?,
                threshold = ?,
                lookback_hours = ?,
                action_type = ?,
                is_enabled = ?,
                updated_at = ?
            WHERE id = CAST(? AS UNIQUEIDENTIFIER)
            """,
            data.get("name", existing.get("name")),
            data.get("description", existing.get("description")),
            data.get("condition_type", existing.get("condition_type")),
            float(data.get("threshold", existing.get("threshold"))),
            int(data.get("lookback_hours", existing.get("lookback_hours"))),
            data.get("action_type", existing.get("action_type")),
            1 if data.get("is_enabled", existing.get("is_enabled")) else 0,
            now,
            rule_id,
        )
        conn.commit()
    finally:
        conn.close()

    return get_rule_by_id(rule_id)


def delete_rule(rule_id: str) -> bool:
    """Delete an alert rule by ID."""
    conn = pyodbc.connect(get_connection_string())
    try:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM dbo.alert_rule WHERE id = CAST(? AS UNIQUEIDENTIFIER)",
            rule_id,
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def _update_rule_trigger(rule_id: str):
    """Update last_triggered_at and increment trigger_count after a rule fires."""
    try:
        conn = pyodbc.connect(get_connection_string())
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE dbo.alert_rule
            SET last_triggered_at = ?, trigger_count = trigger_count + 1
            WHERE id = CAST(? AS UNIQUEIDENTIFIER)
            """,
            datetime.utcnow(), rule_id,
        )
        conn.commit()
        conn.close()
    except Exception as e:
        logger.warning(f"Failed to update trigger stats for rule {rule_id}: {e}")


def _row_to_dict(row, columns: list[str]) -> dict:
    """Convert a pyodbc row to a plain dict."""
    result = {}
    for i, col in enumerate(columns):
        val = row[i]
        if isinstance(val, datetime):
            val = val.isoformat()
        elif isinstance(val, bytes):
            val = bool(val[0]) if val else False
        result[col] = val
    return result
