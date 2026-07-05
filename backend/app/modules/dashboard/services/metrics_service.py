"""Dashboard metrics service — production-grade KPI calculations with trend analysis."""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

# ------------------------------------------------------------------
# 1. Atomic Metric Functions (Reusable & Scalable)
# ------------------------------------------------------------------


def get_avg_rating(
    db: Session,
    org_id: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> float:
    """Calculates the average rating for an organization within an optional date range."""
    sql = """
        SELECT AVG(CAST(r.rating AS FLOAT))
        FROM dbo.processed_review r
        JOIN dbo.source s ON r.source_id = s.source_id
        WHERE s.organization_id = :org_id
    """
    params = {"org_id": org_id}

    if start_date:
        sql += " AND reviewDate >= :start_date"
        params["start_date"] = start_date
    if end_date:
        sql += " AND reviewDate <= :end_date"
        params["end_date"] = end_date

    res = db.execute(text(sql), params).scalar()
    return round(float(res), 2) if res is not None else 0.0


def get_review_count(
    db: Session,
    org_id: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> int:
    """Calculates the total review count for an organization within an optional date range."""
    sql = """
        SELECT COUNT(*)
        FROM dbo.processed_review r
        JOIN dbo.source s ON r.source_id = s.source_id
        WHERE s.organization_id = :org_id
    """
    params = {"org_id": org_id}

    if start_date:
        sql += " AND reviewDate >= :start_date"
        params["start_date"] = start_date
    if end_date:
        sql += " AND reviewDate <= :end_date"
        params["end_date"] = end_date

    return db.execute(text(sql), params).scalar() or 0


def get_negative_count(
    db: Session,
    org_id: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> int:
    """Calculates the negative review count for an organization within an optional date range."""
    sql = """
        SELECT COUNT(*)
        FROM dbo.processed_review r
        JOIN dbo.source s ON r.source_id = s.source_id
        WHERE s.organization_id = :org_id AND r.sentiment = 'Negative'
    """
    params = {"org_id": org_id}

    if start_date:
        sql += " AND reviewDate >= :start_date"
        params["start_date"] = start_date
    if end_date:
        sql += " AND reviewDate <= :end_date"
        params["end_date"] = end_date

    return db.execute(text(sql), params).scalar() or 0


def get_all_sources_count(
    db: Session, org_id: str, as_of_date: Optional[datetime] = None
) -> int:
    sql = "SELECT COUNT(*) FROM dbo.source WHERE organization_id = :org_id"
    params = {"org_id": org_id}

    if as_of_date:
        sql += " AND created_at <= :as_of_date"
        params["as_of_date"] = as_of_date

    return db.execute(text(sql), params).scalar() or 0


def get_response_rate(
    db: Session, org_id: str, start_date: Optional[datetime] = None
) -> str:
    """Calculates the percentage of reviews that have an AI reply, and period-over-period change."""
    sql_base = """
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN r.ai_reply IS NOT NULL AND LEN(r.ai_reply) > 0 THEN 1 ELSE 0 END) AS replied
        FROM dbo.processed_review r
        JOIN dbo.source s ON r.source_id = s.source_id
        WHERE s.organization_id = :org_id
    """
    params = {"org_id": org_id}
    if start_date:
        sql_base += " AND r.reviewDate >= :start_date"
        params["start_date"] = start_date
    row = db.execute(text(sql_base), params).fetchone()
    total = row[0] or 0
    replied = row[1] or 0
    rate = round((replied / total) * 100) if total > 0 else 0
    return f"{rate}%"



def get_rating_distribution(
    db: Session, org_id: str, period_days: int = 0
) -> List[Dict[str, Any]]:
    """Calculates rating distribution (1-5 stars) with counts and percentages.

    period_days=0 means all-time. period_days>0 filters to the last N days.
    Ratings are rounded to the nearest integer before grouping, since
    platforms like Booking.com / Agoda store decimal ratings (e.g. 3.75).
    """
    if period_days > 0:
        start_date = (datetime.utcnow() - timedelta(days=period_days)).date()
        rows = db.execute(
            text("""
            SELECT ROUND(r.rating, 0) AS rounded_rating, COUNT(*) as cnt
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = :org_id AND r.rating IS NOT NULL AND r.reviewDate >= CAST(:start_date AS DATE)
            GROUP BY ROUND(r.rating, 0) ORDER BY ROUND(r.rating, 0) DESC
        """),
            {"org_id": org_id, "start_date": start_date},
        ).fetchall()
    else:
        rows = db.execute(
            text("""
            SELECT ROUND(r.rating, 0) AS rounded_rating, COUNT(*) as cnt
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = :org_id AND r.rating IS NOT NULL
            GROUP BY ROUND(r.rating, 0) ORDER BY ROUND(r.rating, 0) DESC
        """),
            {"org_id": org_id},
        ).fetchall()

    total = sum(row.cnt for row in rows)

    # Initialize full distribution to ensure all stars (1-5) are present
    dist_map = {i: {"count": 0, "percentage": 0} for i in range(1, 6)}

    for row in rows:
        bucket = int(row.rounded_rating)
        # Clamp to 1-5 range
        bucket = max(1, min(5, bucket))
        if bucket in dist_map:
            dist_map[bucket]["count"] += row.cnt

    # Calculate percentages after all rows have been accumulated
    for bucket in dist_map:
        dist_map[bucket]["percentage"] = (
            round((dist_map[bucket]["count"] / total) * 100) if total > 0 else 0
        )

    return [
        {"rating": r, "count": data["count"], "percentage": data["percentage"]}
        for r, data in sorted(dist_map.items(), reverse=True)
    ]


# ------------------------------------------------------------------
# 2. Trend Calculation Utility
# ------------------------------------------------------------------


def _calculate_trend(
    current: float,
    previous: float,
    is_percentage: bool = False,
    higher_is_better: bool = True,
) -> Dict[str, str]:
    """
    Generates the trend dictionary (value, changeType).
    - is_percentage: If True, calculates the % change relative to previous.
    - higher_is_better: Determines if 'up' is positive or negative (e.g., for negative reviews, 'up' is bad).
    """
    if is_percentage:
        if previous == 0:
            change_val = 0 if current == 0 else 100
        else:
            change_val = round(((current - previous) / previous) * 100)

        display_val = f"{'+' if change_val >= 0 else ''}{change_val}%"
    else:
        change_val = round(current - previous, 1)
        display_val = f"{'+' if change_val >= 0 else ''}{change_val}"

    # Determine changeType
    # Standard: up/down
    if change_val > 0:
        change_type = "up"
    elif change_val < 0:
        change_type = "down"
    else:
        change_type = "neutral"

    return {"value": display_val, "type": change_type}


# ------------------------------------------------------------------
# 3. Main Dashboard Orchestrator
# ------------------------------------------------------------------


def get_dashboard_metrics(db: Session, org_id: str, period: int = 0) -> Dict[str, Any]:
    """
    Orchestrates the retrieval of all dashboard metrics for an organization.
    period=0 means "all time" (no date filtering).
    period>0 means filter to the last N days with trend comparison.
    """
    is_all_time = period <= 0
    now = datetime.utcnow()

    if is_all_time:
        # All-time: no date filtering, no trend comparison
        avg_val = get_avg_rating(db, org_id)
        reviews_val = get_review_count(db, org_id)
        sources_val = get_all_sources_count(db, org_id)
        neg_val = get_negative_count(db, org_id)
        avg_trend = {"value": "—", "type": "neutral"}
        review_trend = {"value": "—", "type": "neutral"}
        source_trend = {"value": "—", "type": "neutral"}
        neg_trend = {"value": "—", "type": "neutral"}
    else:
        # Define dynamic date windows based on the requested period
        curr_start = now - timedelta(days=period)
        prev_start = now - timedelta(days=period * 2)
        prev_end = now - timedelta(days=period + 1)

        # 1. Average Rating
        avg_val = get_avg_rating(db, org_id, start_date=curr_start)
        prev_avg = get_avg_rating(db, org_id, start_date=prev_start, end_date=prev_end)
        avg_trend = _calculate_trend(avg_val, prev_avg)

        # 2. totalReviews
        reviews_val = get_review_count(db, org_id, start_date=curr_start)
        prev_reviews = get_review_count(
            db, org_id, start_date=prev_start, end_date=prev_end
        )
        review_trend = _calculate_trend(reviews_val, prev_reviews, is_percentage=True)

        # 3. activeSources (now representing All Sources but keeping key for compatibility)
        sources_val = get_all_sources_count(db, org_id)
        prev_sources = get_all_sources_count(db, org_id, as_of_date=prev_end)
        source_trend = _calculate_trend(sources_val, prev_sources)

        # 4. negativeReviews
        neg_val = get_negative_count(db, org_id, start_date=curr_start)
        prev_neg = get_negative_count(
            db, org_id, start_date=prev_start, end_date=prev_end
        )
        neg_trend = _calculate_trend(neg_val, prev_neg, is_percentage=True)

    # 5. ratingDistribution
    distribution = get_rating_distribution(db, org_id, period_days=period)

    return {
        "avgRating": {
            "value": str(avg_val),
            "change": avg_trend["value"],
            "changeType": avg_trend["type"],
            "colorScheme": "amber",
        },
        "activeSources": {
            "value": str(sources_val),
            "change": source_trend["value"],
            "changeType": source_trend["type"],
            "colorScheme": "blue",
        },
        "totalReviews": {
            "value": f"{reviews_val:,}",
            "change": review_trend["value"],
            "changeType": review_trend["type"],
            "colorScheme": "indigo",
        },
        "negativeReviews": {
            "value": str(neg_val),
            "change": neg_trend["value"],
            "changeType": neg_trend["type"],
            "colorScheme": "rose",
        },
        "ratingDistribution": distribution,
    }
