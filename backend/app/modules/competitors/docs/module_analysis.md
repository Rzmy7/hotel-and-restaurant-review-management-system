# Module Analysis: Competitors Module

## 1. Module Overview

### What & Why
The `competitors` module enables competitive intelligence and benchmarking within the Hotel and Restaurant Review Management System. It allows users to track competitor properties, scrape their reviews, perform side-by-side comparisons, and generate AI-powered competitive insights.

It exists to:
- **Track Competitors**: Maintain a list of competing properties for benchmarking
- **Scrape Reviews**: Extract and process competitor reviews from Booking.com
- **Compare Performance**: Side-by-side KPI, category, and trend analysis
- **Generate Insights**: AI-powered competitive strengths/weaknesses analysis
- **Rank Properties**: Leaderboard showing relative performance

### When
The module's logic is triggered when:
1. Users add or track new competitors
2. Competitor scraping is manually triggered
3. Users request comparison data or rankings
4. AI insights are requested for competitive analysis

---

## 2. Architecture & Structure

### File Tree
```
competitors/
├── __init__.py                         # Module initialization
├── schemas.py                          # Pydantic request/response schemas
├── ai/
│   ├── __init__.py                     # AI package
│   └── prompts.py                      # AI prompt templates
├── routes/
│   ├── __init__.py                     # Routes package
│   ├── crud.py                         # Competitor CRUD + track/untrack
│   ├── analytics.py                    # Comparison and insights endpoints
│   └── scraping.py                     # Scraping trigger endpoint
└── services/
    ├── __init__.py                     # Services package
    ├── competitor_service.py           # CRUD business logic
    ├── analytics_service.py            # Comparison stats and AI insights
    └── scraping_pipeline.py            # Scrape → AI → DB pipeline
```

---

## 3. API Endpoints

### 3.1 CRUD Routes (`crud.py`)

**Base Path**: `/api/competitors` (prefix defined in main.py registration)

| # | Method | Path | Auth | Purpose | Request Body | Response |
|---|--------|------|------|---------|-------------|----------|
| 1 | GET | `/competitors/` | None | List tracked + available competitors | None | `{"tracked": [], "available": []}` |
| 2 | POST | `/competitors/` | None | Add new competitor | `AddCompetitorRequest` | `{"message", "competitor"}` |
| 3 | POST | `/competitors/track` | JWT | Start tracking competitor | `TrackCompetitorRequest` (competitorId) | `{"message", "competitor"}` |
| 4 | POST | `/competitors/untrack` | None | Stop tracking competitor | `TrackCompetitorRequest` (competitorId) | `{"message"}` |
| 5 | DELETE | `/competitors/{competitor_id}` | None | Delete competitor | None | `{"message"}` |
| 6 | GET | `/competitors/{competitor_id}/reviews` | None | Get competitor's reviews | None | `{"reviews": [], "total": int}` |

### 3.2 Analytics Routes (`analytics.py`)

| # | Method | Path | Purpose | Response |
|---|--------|------|---------|----------|
| 7 | GET | `/competitors/rankings` | Property leaderboard | `{"rankings": [], "yourRank": int, "totalCompetitors": int, "topPerformer": dict}` |
| 8 | GET | `/competitors/{competitor_id}/compare` | Side-by-side comparison | `{"competitor", "kpis", "aspectData", "trendData", "sentimentData"}` |
| 9 | GET | `/competitors/{competitor_id}/insights` | AI competitive insights | `{"strengths": [], "weaknesses": [], "recommendations": [], "tags": []}` |

### 3.3 Scraping Routes (`scraping.py`)

| # | Method | Path | Purpose | Request Body | Response |
|---|--------|------|---------|-------------|----------|
| 10 | POST | `/competitors/{competitor_id}/scrape` | Trigger competitor scrape | `ScrapeCompetitorRequest` (headless) | `{"message", "competitorId"}` |

---

## 4. Database Schema

### Table: `Competitors`
Competitor property tracking.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | INT | PK, autoincrement | -- | Unique competitor ID |
| `name` | NVARCHAR | NOT NULL | -- | Property name |
| `location` | NVARCHAR | Nullable | -- | Geographic location |
| `bookingUrl` | NVARCHAR | Nullable | -- | Booking.com URL for scraping |
| `avgRating` | FLOAT | Nullable | 0 | Average review rating |
| `sentimentScore` | FLOAT | Nullable | 0 | Positive sentiment percentage |
| `reviewCount` | INT | Nullable | 0 | Total review count |
| `isTracked` | BIT | NOT NULL | 0 | Currently tracked flag |
| `status` | NVARCHAR | NOT NULL | 'Pending' | Status: Pending, Active, Scraping, Error |
| `createdAt` | DATETIME | NOT NULL | SYSUTCDATETIME() | Creation timestamp |

### Table: `CompetitorReviews`
Processed reviews for competitor properties.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UNIQUEIDENTIFIER | PK | Review ID |
| `competitorId` | INT | FK → Competitors.id | Owner competitor |
| `platformReviewId` | NVARCHAR | | Platform review ID |
| `rating` | INT | | Normalized 1-5 rating |
| `userName` | NVARCHAR | | Reviewer name |
| `reviewText` | NVARCHAR(MAX) | | Full review text |
| `summary` | NVARCHAR(MAX) | | AI-generated summary |
| `sentiment` | NVARCHAR(20) | | Positive/Neutral/Negative |
| `categories` | NVARCHAR(MAX) | | JSON array of categories |
| `keyPhrases` | NVARCHAR(MAX) | | JSON array of key phrases |
| `language` | NVARCHAR(50) | | Detected language |
| `reviewDate` | DATE | | Review date |
| `source` | NVARCHAR | | Source platform (always "Booking.com") |

---

## 5. Pydantic Schemas

### `AddCompetitorRequest`
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | str | Required | Competitor property name |
| `location` | str | "" | Geographic location |
| `bookingUrl` | str | "" | Booking.com URL |

### `TrackCompetitorRequest`
| Field | Type | Description |
|-------|------|-------------|
| `competitorId` | int | Competitor ID to track/untrack |

### `ScrapeCompetitorRequest`
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `headless` | bool | True | Run browser in headless mode |

---

## 6. Services

### 6.1 Competitor Service (`competitor_service.py`)

**CRUD Operations:**

| Function | Signature | Purpose |
|----------|-----------|---------|
| `get_all_competitors()` | `() -> List[Dict]` | Fetch all competitors ordered by tracked status |
| `get_tracked_competitors()` | `() -> List[Dict]` | Filter where isTracked=1 |
| `get_available_competitors()` | `() -> List[Dict]` | Filter where isTracked=0 |
| `get_competitor_by_id(id)` | `(int) -> Optional[Dict]` | Single competitor lookup |
| `add_competitor()` | `(name, location, url) -> Dict` | INSERT with status='Pending' |
| `track_competitor()` | `(id, user_id=None) -> Optional[Dict]` | SET isTracked=1, increment usage |
| `untrack_competitor()` | `(id) -> bool` | SET isTracked=0 |
| `delete_competitor()` | `(id) -> bool` | DELETE from Competitors |
| `get_competitor_reviews()` | `(id) -> List[Dict]` | Fetch from CompetitorReviews |

**Feature Usage Tracking:**
```python
increment_feature_usage(cursor, user_id, "competitors")
```
Called when user tracks a competitor, increments plan-based limit.

### 6.2 Analytics Service (`analytics_service.py`)

**Statistics Functions:**

| Function | Purpose |
|----------|---------|
| `get_my_hotel_stats()` | Aggregate stats from processed_review (count, avgRating, sentiment breakdown) |
| `get_competitor_stats(id)` | Aggregate stats from CompetitorReviews |
| `get_category_scores(table, where, params)` | Average rating per category from JSON categories field |
| `get_monthly_ratings(table, date_col, where, params)` | Monthly trend data |

**Comparison and Insights:**

| Function | Purpose |
|----------|---------|
| `get_comparison_data(id)` | Full comparison: KPIs, aspects, trends, sentiment |
| `get_rankings_data()` | Leaderboard with ranks for my hotel + tracked competitors |
| `get_ai_comparison_insights(id)` | Gemini-powered strengths/weaknesses/recommendations |

**AI Integration:**
- **Model**: `gemini-2.5-flash-lite`
- **Client**: Singleton via `_get_genai_client()`
- **Prompt**: `COMPARISON_INSIGHT_PROMPT` with structured JSON output
- **Parsing**: Strips markdown fences, parses JSON

### 6.3 Scraping Pipeline (`scraping_pipeline.py`)

**Full Pipeline Flow:**
```
1. SET status = 'Scraping'
2. scrape_booking_for_competitor(url, headless)  # From reviews.scraper
3. AI process via Gemini with COMPETITOR_PROMPT
4. DELETE existing CompetitorReviews for competitor
5. INSERT new reviews
6. UPDATE Competitors stats (avgRating, sentimentScore, reviewCount, status='Active')
7. On error: SET status = 'Error'
```

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `process_competitor_scrape(id, url, headless)` | Main pipeline entry (background task) |
| `_insert_competitor_reviews(conn, id, rows)` | Batch INSERT into CompetitorReviews |
| `_update_competitor_stats(id)` | Recalculate avgRating, sentimentScore, reviewCount |

**AI Processing:**
- **Prompt**: `COMPETITOR_PROMPT` - transforms raw Booking.com data to structured format
- **Rating Conversion**: Booking.com 1-10 scale → 1-5 scale (divide by 2, round)
- **Date Parsing**: "MMM DD, YYYY" format (e.g., "Nov 15, 2025")
- **Sentiment**: Derived from rating (4-5=Positive, 3=Neutral, 1-2=Negative)

---

## 7. AI Integration

### Prompt Templates

#### `COMPETITOR_PROMPT`
**Purpose**: Transform raw Booking.com reviews to structured format

**Input**: Raw review JSON from scraper
**Output**: JSON array with platformReviewId, rating (1-5), userName, text, sentiment, categories, keyPhrases, summary, date, language, source

**Key Transformations**:
- Rating: score/2, rounded to integer
- Name: Extract first 1-2 words from raw_review before room type
- Text: Combine title + positive_txt + negative_txt
- ID: "BK-" + review_id
- Source: Always "Booking.com"

#### `COMPARISON_INSIGHT_PROMPT`
**Purpose**: Generate competitive analysis insights

**Input**: Stats for both hotels (ratings, reviews, sentiment %, categories)
**Output**: JSON with strengths, Weaknesses, Recommendations, Tags

---

## 8. Integrations

### Reviews Module
- **Scraper**: Imports `scrape_booking_for_competitor` from `app.modules.reviews.scraper`
- **Shared Models**: Both use processed_review pattern

### Admin Module
- **Subscription**: Calls `increment_feature_usage` for tracking

### Google Gemini
- **Analysis**: Uses Gemini for review processing and comparison insights
- **Model**: `gemini-2.5-flash-lite`

---

## 9. Code Review: Flaws & Technical Debt

### No Authentication on Most Endpoints
> [!CAUTION]
> Only `/track` endpoint requires authentication. CRUD, analytics, and scraping endpoints are unprotected.
- **Risk**: Anyone can add/delete competitors or trigger scrapes
- **Recommendation**: Add JWT auth to all endpoints

### Mixed Response Formats
Some endpoints return raw dicts, others use Pydantic models
- **Recommendation**: Standardize on Pydantic schemas

### Print Statements Instead of Logging
```python
print(f"[Competitor {competitor_id}] Starting scrape...")
```
- **Recommendation**: Use proper logging framework

### Global AI Client Singleton
```python
_genai_client = None
def _get_genai_client():
    global _genai_client
```
- **Risk**: Not thread-safe, hard to test
- **Recommendation**: Use dependency injection

### Deletes All Reviews on Rescrape
```python
cursor.execute("DELETE FROM dbo.CompetitorReviews WHERE competitorId = ?", competitor_id)
```
- **Risk**: Loses historical data
- **Recommendation**: Use upsert or soft delete

---

## 10. Strategic Enhancements

### High Priority
1. **Add Authentication**: Protect all endpoints with JWT
2. **Use Logging**: Replace print statements with proper logging
3. **Standardize Responses**: Use Pydantic models consistently

### Medium Priority
4. **Preserve Historical Data**: Don't delete reviews on rescrape
5. **Add More Sources**: Support TripAdvisor, Google for competitors
6. **Scheduled Scrapes**: Auto-scrape competitors on schedule

### Low Priority
7. **Thread-Safe AI Client**: Replace global singleton
8. **Export Comparisons**: PDF/CSV export of comparison data
9. **Alert on Competitor Changes**: Notify when competitor rating drops

---

*Last Updated: 2026-04-12*  
*Module Version: Competitors Module v1.0*
