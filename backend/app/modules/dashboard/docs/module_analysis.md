# Module Analysis: Dashboard Module

## 1. Module Overview

### What & Why
The `dashboard` module provides the analytics and visualization backend for the user-facing dashboard in the Hotel and Restaurant Review Management System. It aggregates review metrics, calculates trends, generates charts data, and provides unified dashboard responses combining multiple data sources.

It exists to:
- **Aggregate Metrics**: Calculate KPIs from review data (avg rating, sentiment, counts)
- **Generate Charts**: Provide data for sentiment distribution, review trends, category performance
- **Track Activity**: Feed alerts and activity timelines
- **Unify Data**: Combine multiple sources into single dashboard response

### When
The module's logic is triggered when:
1. Users access the dashboard page
2. Frontend requests specific chart data or metrics
3. Organization-specific analytics are requested
4. Sentiment analysis counts or negative reviews are queried

---

## 2. Architecture & Structure

### File Tree
```
dashboard/
├── __init__.py                         # Module initialization
├── routes/
│   ├── __init__.py                     # Routes package
│   ├── stats.py                        # Stats and distribution endpoints
│   ├── trends.py                       # Usage and recent reviews
│   ├── activity.py                     # Alerts and activity feed
│   └── unified_dashboard.py            # Unified dashboard aggregation
└── services/
    ├── __init__.py                     # Services package
    ├── stats_service.py                # Stats and sentiment distribution
    ├── trends_service.py               # Usage trends and recent reviews
    ├── activity_service.py             # Alerts and activity feed
    ├── metrics_service.py              # Dashboard KPI metrics
    ├── charts_service.py               # Chart data generation
    ├── categories_service.py           # Category performance analysis
    └── sources_service.py              # Source comparison data
```

---

## 3. API Endpoints

### 3.1 Stats Routes (`stats.py`)

**Base Path**: Root (registered in main.py)

| # | Method | Path | Purpose | Query Params | Response |
|---|--------|------|---------|-------------|----------|
| 1 | GET | `/dashboard/stats` | Dashboard KPIs | `org_id` (optional) | Dashboard stats object |
| 2 | GET | `/dashboard/distribution` | Sentiment distribution | `org_id` (optional) | Sentiment breakdown |

### 3.2 Trends Routes (`trends.py`)

| # | Method | Path | Purpose | Response |
|---|--------|------|---------|----------|
| 3 | GET | `/dashboard/usage` | Review volume trend | Usage chart data |
| 4 | GET | `/dashboard/reviews` | Recent reviews list | List of recent reviews |

### 3.3 Activity Routes (`activity.py`)

| # | Method | Path | Purpose | Query Params | Response |
|---|--------|------|---------|-------------|----------|
| 5 | GET | `/dashboard/alerts` | System alerts | `org_id` (optional) | Alert list |
| 6 | GET | `/dashboard/activities` | Activity feed | `org_id` (optional) | Activity list |
| 7 | GET | `/dashboard/sentiment-counts` | Sentiment breakdown | `org_id` (optional) | Positive/Neutral/Negative counts |
| 8 | GET | `/dashboard/negative-reviews` | Negative reviews list | `org_id` (optional) | Negative review list |

### 3.4 Unified Dashboard Route (`unified_dashboard.py`)

| # | Method | Path | Purpose | Path/Query Params | Response |
|---|--------|------|---------|-------------------|----------|
| 9 | GET | `/organizations/{org_id}/dashboard` | Complete dashboard data | `org_id` (path), `period` (query, default 30) | Full DashboardResponse object |

---

## 4. Services

### 4.1 Stats Service (`stats_service.py`)

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `get_stats(org_id)` | Get dashboard statistics for organization |
| `get_distribution(org_id)` | Get sentiment distribution |

### 4.2 Trends Service (`trends_service.py`)

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `get_usage()` | Get review volume over time (usage chart) |
| `get_recent_reviews()` | Get most recent reviews across system |

### 4.3 Activity Service (`activity_service.py`)

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `get_alerts(org_id)` | Get system alerts for organization |
| `get_activities(org_id)` | Get activity feed items |
| `get_sentiment_counts(org_id)` | Get Positive/Neutral/Negative breakdown |
| `get_negative_reviews_for_org(org_id)` | Get negative reviews requiring attention |

### 4.4 Metrics Service (`metrics_service.py`)

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `get_dashboard_metrics(org_id, period, cursor)` | Calculate KPIs: avgRating, totalReviews, sentiment %, etc. |

**Metrics Calculated:**
- Average rating
- Total review count
- Positive/negative percentages
- Response rate
- Recent review velocity

### 4.5 Charts Service (`charts_service.py`)

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `get_sentiment_distribution(cursor, org_id)` | Pie chart data for sentiment breakdown |
| `get_daily_review_trends(cursor, org_id, days)` | Daily review count over period |
| `get_weekly_review_trends(cursor, org_id, period_days)` | Weekly aggregated trends |

### 4.6 Categories Service (`categories_service.py`)

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `get_category_performance(cursor, org_id, period_days)` | Average rating per category (Cleanliness, Staff, etc.) |

**Category Scores Calculated:**
- Cleanliness
- Staff
- Location
- Facilities
- Comfort
- Value
- Noise
- Food
- Privacy
- WiFi
- Room Size

### 4.7 Sources Service (`sources_service.py`)

**Key Functions:**

| Function | Purpose |
|----------|---------|
| Source comparison data | Compare performance across review sources |

---

## 5. Unified Dashboard Response

The `/organizations/{org_id}/dashboard` endpoint returns a comprehensive response:

```python
{
    "hotel": {"id": org_id, "name": "...", "status": "Active"},
    "organizations": [...],
    "currentOrganizationId": org_id,
    "metrics": {...},  # KPIs
    "charts": {
        "sentiment": [...],  # Pie chart data
        "reviewsOverTime": [...],  # Line chart data
        "sentimentTrends": [...]  # Trend data
    },
    "latestReviews": [...],  # Top 5 recent reviews
    "aiInsights": {
        "strengths": [...],
        "issues": [],
        "highlight": {"text": "...", "correlation": "Strong"}
    },
    "alerts": [...],  # Top 4 alerts
    "sourceComparison": [],
    "categoryPerformance": [...]  # Category scores
}
```

**Data Aggregation:**
- All database queries use single cursor for performance
- Closes connection in finally block
- Validates org_id is valid UUID before querying

---

## 6. Integrations

### Reviews Module
- **Data Source**: Reads from `processed_review` table
- **Metrics**: Aggregates review data for dashboard display

### Organization Module
- **Context**: Uses organization_id for scoped data
- **Validation**: Validates UUID format before querying

### Core Utilities
- **Database**: Uses pyodbc connections via `get_connection_string()`
- **UUID Validation**: `uuid.UUID(org_id)` to prevent SQL errors

---

## 7. Code Review: Flaws & Technical Debt

### Inconsistent Org ID Handling
> [!WARNING]
> Some endpoints accept `org_id` as optional, others require it in path.
- **Risk**: Different behavior across endpoints
- **Recommendation**: Standardize on required org_id in all dashboard endpoints

### Mixed Connection Management
Some services open their own connections, unified dashboard shares cursor:
- **Risk**: Inefficient, potential connection leaks
- **Recommendation**: Use dependency injection for database connections

### Hardcoded AI Insights
```python
"aiInsights": {
    "strengths": [{"label": "Review Quality", "impact": "High", "freq": "100%"}],
    "issues": [],
    ...
}
```
- **Risk**: Static data doesn't reflect actual performance
- **Recommendation**: Generate insights dynamically using AI

### No Caching
Dashboard queries database on every request:
- **Risk**: Poor performance with large datasets
- **Recommendation**: Add Redis caching with TTL

### UUID Validation Error
```python
uuid.UUID(org_id)
```
Raises ValueError for non-UUID strings but returns 404 instead of 400:
- **Recommendation**: Return 400 Bad Request for invalid UUID format

---

## 8. Strategic Enhancements

### High Priority
1. **Add Caching**: Implement Redis for dashboard data with 5-15min TTL
2. **Generate Dynamic AI Insights**: Use Gemini for actual insights
3. **Fix Error Codes**: Return 400 for invalid UUID, not 404

### Medium Priority
4. **Standardize Org ID**: Make org_id required across all dashboard endpoints
5. **Add Pagination**: For recent reviews and alerts lists
6. **Connection Pooling**: Reuse connections across service calls

### Low Priority
7. **Export Dashboard**: PDF/CSV export functionality
8. **Custom Date Ranges**: Allow user-specified date ranges
9. **Real-Time Updates**: WebSocket for live dashboard updates
10. **Personalized Alerts**: User-configurable alert thresholds

---

*Last Updated: 2026-04-12*  
*Module Version: Dashboard Module v1.0*
