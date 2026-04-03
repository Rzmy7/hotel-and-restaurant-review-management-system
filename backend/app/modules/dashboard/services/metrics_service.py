"""Dashboard metrics service — production-grade KPI calculations with trend analysis."""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

import pyodbc
from app.core.pyodbc_connection import get_connection_string

# ------------------------------------------------------------------
# 1. Atomic Metric Functions (Reusable & Scalable)
# ------------------------------------------------------------------

def get_avg_rating(cursor: pyodbc.Cursor, org_id: str, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> float:
    """Calculates the average rating for an organization within an optional date range."""
    sql = "SELECT AVG(CAST(rating AS FLOAT)) FROM dbo.processed_review WHERE organization_id = ?"
    params = [org_id]
    
    if start_date:
        sql += " AND reviewDate >= ?"
        params.append(start_date)
    if end_date:
        sql += " AND reviewDate <= ?"
        params.append(end_date)
        
    cursor.execute(sql, params)
    res = cursor.fetchone()[0]
    return round(float(res), 2) if res is not None else 0.0

def get_review_count(cursor: pyodbc.Cursor, org_id: str, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> int:
    """Calculates the total review count for an organization within an optional date range."""
    sql = "SELECT COUNT(*) FROM dbo.processed_review WHERE organization_id = ?"
    params = [org_id]
    
    if start_date:
        sql += " AND reviewDate >= ?"
        params.append(start_date)
    if end_date:
        sql += " AND reviewDate <= ?"
        params.append(end_date)
        
    cursor.execute(sql, params)
    return cursor.fetchone()[0] or 0

def get_negative_count(cursor: pyodbc.Cursor, org_id: str, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> int:
    """Calculates the negative review count for an organization within an optional date range."""
    sql = "SELECT COUNT(*) FROM dbo.processed_review WHERE organization_id = ? AND sentiment = 'Negative'"
    params = [org_id]
    
    if start_date:
        sql += " AND reviewDate >= ?"
        params.append(start_date)
    if end_date:
        sql += " AND reviewDate <= ?"
        params.append(end_date)
        
    cursor.execute(sql, params)
    return cursor.fetchone()[0] or 0

def get_active_sources_count(cursor: pyodbc.Cursor, org_id: str, as_of_date: Optional[datetime] = None) -> int:
    """Calculates the count of active sources for an organization as of a specific date."""
    sql = "SELECT COUNT(*) FROM dbo.source WHERE organization_id = ? AND source_status = 'active'"
    params = [org_id]
    
    if as_of_date:
        sql += " AND created_at <= ?"
        params.append(as_of_date)
        
    cursor.execute(sql, params)
    return cursor.fetchone()[0] or 0

def get_rating_distribution(cursor: pyodbc.Cursor, org_id: str) -> List[Dict[str, Any]]:
    """Calculates the all-time rating distribution (1-5 stars) with counts and percentages."""
    cursor.execute("""
        SELECT rating, COUNT(*) as cnt 
        FROM dbo.processed_review 
        WHERE organization_id = ? 
        GROUP BY rating ORDER BY rating DESC
    """, org_id)
    
    rows = cursor.fetchall()
    total = sum(row.cnt for row in rows)
    
    # Initialize full distribution to ensure all stars (1-5) are present
    dist_map = {i: {"count": 0, "percentage": 0} for i in range(1, 6)}
    
    for row in rows:
        if row.rating in dist_map:
            dist_map[row.rating]["count"] = row.cnt
            dist_map[row.rating]["percentage"] = round((row.cnt / total) * 100) if total > 0 else 0
            
    return [{"rating": r, "count": data["count"], "percentage": data["percentage"]} 
            for r, data in sorted(dist_map.items(), reverse=True)]

# ------------------------------------------------------------------
# 2. Trend Calculation Utility
# ------------------------------------------------------------------

def _calculate_trend(current: float, previous: float, is_percentage: bool = False, higher_is_better: bool = True) -> Dict[str, str]:
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

def get_dashboard_metrics(org_id: str, period: int = 30, cursor: Optional[pyodbc.Cursor] = None) -> Dict[str, Any]:
    """
    Orchestrates the retrieval of all dashboard metrics for an organization.
    Ensures production-grade handling of periods and data aggregation.
    """
    if period < 1:
        period = 30 # Default to 30 if invalid period
        
    local_conn = None
    if cursor is None:
        local_conn = pyodbc.connect(get_connection_string())
        cursor = local_conn.cursor()
    
    try:
        # Define dynamic date windows based on the requested period
        now = datetime.utcnow()
        curr_start = now - timedelta(days=period)
        prev_start = now - timedelta(days=period * 2)
        prev_end = now - timedelta(days=period + 1)

        # 1. Average Rating
        all_time_avg = get_avg_rating(cursor, org_id)
        curr_avg = get_avg_rating(cursor, org_id, start_date=curr_start)
        prev_avg = get_avg_rating(cursor, org_id, start_date=prev_start, end_date=prev_end)
        avg_trend = _calculate_trend(curr_avg, prev_avg)

        # 2. totalReviews
        all_time_reviews = get_review_count(cursor, org_id)
        curr_reviews = get_review_count(cursor, org_id, start_date=curr_start)
        prev_reviews = get_review_count(cursor, org_id, start_date=prev_start, end_date=prev_end)
        review_trend = _calculate_trend(curr_reviews, prev_reviews, is_percentage=True)

        # 3. activeSources
        all_time_sources = get_active_sources_count(cursor, org_id)
        prev_sources = get_active_sources_count(cursor, org_id, as_of_date=prev_end)
        source_trend = _calculate_trend(all_time_sources, prev_sources)

        # 4. negativeReviews
        all_time_neg = get_negative_count(cursor, org_id)
        curr_neg = get_negative_count(cursor, org_id, start_date=curr_start)
        prev_neg = get_negative_count(cursor, org_id, start_date=prev_start, end_date=prev_end)
        neg_trend = _calculate_trend(curr_neg, prev_neg, is_percentage=True)

        # 5. ratingDistribution
        distribution = get_rating_distribution(cursor, org_id)

        return {
            "avgRating": {
                "value": str(all_time_avg),
                "change": avg_trend["value"],
                "changeType": avg_trend["type"],
                "colorScheme": "amber",
            },
            "activeSources": {
                "value": str(all_time_sources),
                "change": source_trend["value"],
                "changeType": source_trend["type"],
                "colorScheme": "blue",
            },
            "totalReviews": {
                "value": f"{all_time_reviews:,}", # Formatted with commas
                "change": review_trend["value"],
                "changeType": review_trend["type"],
                "colorScheme": "indigo",
            },
            "negativeReviews": {
                "value": str(all_time_neg),
                "change": neg_trend["value"],
                "changeType": neg_trend["type"],
                "colorScheme": "rose",
            },
            "ratingDistribution": distribution
        }

    finally:
        if local_conn:
            local_conn.close()
