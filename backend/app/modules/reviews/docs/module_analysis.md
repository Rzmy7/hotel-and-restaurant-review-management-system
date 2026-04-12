# Module Analysis: Reviews Module

## 1. Module Overview

### What & Why
The `reviews` module is the core intelligence hub of the Hotel and Restaurant Review Management System. Its primary purpose is to manage the lifecycle of customer feedback, transitioning it from raw scraped data into enriched, actionable insights.

It exists to:
- **Aggregate**: Consolidate reviews from multiple platforms (Booking.com, Google Maps, Agoda, TripAdvisor) via the Scraper Engine.
- **Analyze**: Perform automated sentiment analysis, categorization, and key phrase extraction using Google Gemini.
- **Engage**: Provide AI-powered drafting of professional responses to guests, utilizing Retrieval-Augmented Generation (RAG) for consistency with brand rules and past high-quality responses.
- **Visualize**: Provide aggregated metrics and trends for the administrative and organizational dashboards.

### When
The module's logic is triggered under four primary conditions:
1.  **Manual Sync**: When a user triggers a "Sync" action for a specific source via the `/api/reviews/trigger/{source_id}` endpoint.
2.  **Dashboard Access**: When the frontend requests review lists or statistics for an organization.
3.  **On-Demand Reply Generation**: When a user requests a high-quality, customized response draft for a specific review via the `/api/reviews/generate-reply` endpoint.
4.  **Platform Metrics**: When the admin dashboard requests total review counts via `/api/reviews/meta/count`.
5.  **On-Demand Processing**: When a reviewer or admin manually triggers re-analysis of a single specific review via `/api/reviews/process/{review_id}`.
6.  **Automatic Background Scheduler**: The system's APScheduler runs the analysis pipeline every 1 minute, and a dedicated startup hook ensures any pending reviews are processed immediately upon system boot.

---

## 2. Data Flow & Lifecycle

### Execution Flow: Ingestion & AI Pipeline
The module implements a two-stage background pipeline:

#### Stage 1: Ingestion (`review_service.py`)
- **Trigger**: `POST /api/reviews/trigger/{source_id}` endpoint.
- **Action**: Calls external **Scraper Engine** (`GET http://127.0.0.1:8001/api/reviews/{source_id}`).
- **Data Mapping**:
  - Transforms platform-specific JSON into unified internal format.
  - **Booking.com**: Preserves `positive_text` and `negative_text` as separate fields.
  - **Other platforms**: Uses `review_text` field directly as `text`.
  - Maps `author` → `reviewerName`, `rating`, `review_date`, `photos`.
- **Storage**: Upserts records to `dbo.processed_review` with status set to `pending`.
  - **Upsert Logic**: Checks `platformReviewId` for existence; updates existing record or inserts new one.
  - **Media Handling**: Deletes existing `review_media` entries and re-inserts to prevent duplicates.

#### Stage 2: AI Analysis (`processor.py`)
- **Trigger**: Automatically follows ingestion (same background task) or run as standalone task.
- **Batch Processing**: Fetches `GEMINI_BATCH_SIZE` reviews per batch (default: 10).
- **Processing Loop**: The pipeline now processes all pending reviews in a loop (up to 50 consecutive batches) to ensure complete ingestion jobs aren't left partially processed.
- **AI Processing**: Sends review batch to **Google Gemini** via `gemini_client.py`.
- **Enrichment**: Receives structured JSON containing sentiment, scores, categories, key phrases, and draft replies.
- **Finalization**: Updates database with enriched fields and sets status to `processed`.
- **Monitoring**: The current state of this queue can be monitored via the `/api/reviews/processing/status` endpoint.

#### Error Handling & Retry Logic
- **Retry Counter**: Each review tracks `retry_count` (increments on each failure).
- **Max Retries**: Configured via `MAX_RETRY_ATTEMPTS` env var (default: 3).
- **Status Transitions**:
  - Success: `pending` → `processed` (with `error_message` cleared)
  - Failure (retries remaining): `pending` → `pending` (retry_count++, error logged)
  - Failure (max retries exceeded): `pending` → `failed`
- **Failure Tracking**: `error_message` and `last_attempt` timestamp persisted for diagnostics.

### Reply Generation Flow
When a user requests an AI-generated reply:

1. **Load Settings**: Fetch provider, model, API keys, and feature toggles from `dbo.system_settings`.
2. **Fetch RAG Context** (if enabled):
   - Call Embedding Service: `POST {EMBEDDING_SERVICE_URL}/search`
   - Retrieve similar reviews (semantic similarity)
   - Retrieve relevant brand rules/guidelines
3. **Build Prompt**: Combine review text with context, tone, length preferences, and language hints.
4. **Generate Reply**:
   - **Google Provider**: Call Gemini API (tries `v1` then `v1beta` for compatibility)
   - **Claude Provider**: Try SDK call → fallback to HTTP API → try up to 8 model aliases
5. **Handle Failures**: If AI generation fails, return hardcoded fallback reply based on sentiment.
6. **Track Usage**:
   - Increment provider request count and token usage in system settings
   - Increment per-user feature usage via `subscription_service.increment_feature_usage`
7. **Return Response**: Include reply text, provider name, context usage metadata, and any errors.

### Input/Output Specifications

| Endpoint | Method | Input Payload / Params | Output / Status |
| :--- | :--- | :--- | :--- |
| `/api/reviews/{organization_id}` | GET | `organization_id` (UUID, path param) | List of `ReviewModel` (JSON), Status 200 |
| `/api/reviews/trigger/{source_id}` | POST | `source_id` (UUID, path param) | `{"message": "Processing flow started in background."}`, Status 200 |
| `/api/reviews/ingest/{source_id}` | POST | `source_id` (UUID, path param) | `{"message": "Ingestion successful", ...}`, Status 200 |
| `/api/reviews/meta/count` | GET | None | `{"total_reviews": <int>}`, Status 200 |
| `/api/reviews/processing/status` | GET | `organization_id` (UUID, optional query) | `{"metrics": {...}, "health": "string", "timestamp": "ISO8601"}`, Status 200 |
| `/api/reviews/process/{review_id}` | POST | `review_id` (UUID, path param) | `{"message": "Review processed successfully", ...}`, Status 200 |
| `/api/reviews/generate-reply` | POST | `ReplyGenerationRequest` (JSON body) | `ReplyGenerationResponse` (JSON), Status 200 |

#### ReplyGenerationRequest Schema
```json
{
  "reviewId": "string | number",
  "tone": "standard | professional | casual",
  "length": "standard | short",
  "reviewText": "string (required, min_length=1)",
  "userName": "string (default: 'Guest')",
  "sentiment": "Positive | Neutral | Negative",
  "source": "string (optional)",
  "language": "string (optional)",
  "hotelId": "number (default: 1)"
}
```

#### ReplyGenerationResponse Schema
```json
{
  "reply": "string (generated reply text)",
  "provider": "string (google, claude, google-fallback, claude-fallback, fallback)",
  "similarReviewsUsed": "number (count of similar reviews retrieved)",
  "rulesUsed": "number (count of brand rules applied)",
  "providerError": "string | null (error message if fallback used)"
}
```

---

## 3. Architecture & Integrations

### Internal Module Structure
```
reviews/
├── __init__.py                      # Module initialization
├── models.py                        # SQLAlchemy ORM models (ProcessedReview, ReviewMedia)
├── schemas.py                       # Pydantic schemas (ReviewModel, ReplyGenerationRequest, etc.)
├── repository.py                    # Raw SQL data access layer
├── routes/
│   └── reviews.py                   # FastAPI route definitions
└── services/
    ├── review_service.py            # Ingestion orchestration, scraper communication
    ├── processor.py                 # AI analysis pipeline, batch processing, retry logic
    ├── gemini_client.py             # Google Gemini API wrapper for sentiment analysis
    ├── reply_generation_service.py  # Multi-provider reply generation with RAG
    └── stats_service.py             # Dashboard metrics, trends, activity feeds
```

### Internal Connections
- **Auth Module**:
  - Validates user identity via `get_current_user` dependency for reply generation.
  - Imports models for SQLAlchemy registry (`import app.modules.auth.models`).
- **Source Module**:
  - Provides source metadata (URLs, platform types, organization_id) via `get_source_by_id`.
  - Required to initiate ingestion for a specific source.
- **Admin Module**:
  - **System Settings Service**: Reads/writes reply generation configuration (provider, model, API keys, feature toggles).
  - **Subscription Service**: Tracks per-user reply generation counts via `increment_feature_usage`.

### External Integrations

#### Scraper Engine (Microservice)
- **Endpoint**: `GET http://127.0.0.1:8001/api/reviews/{source_id}`
- **Purpose**: Retrieves raw scraped review data for a specific source.
- **Response Format**:
  ```json
  {
    "data": [
      {
        "review_id": "string",
        "created_at": "datetime",
        "platform_id": "number",
        "detail": {
          "rating": "number",
          "author": "string",
          "review_text": "string",
          "review_date": "datetime",
          "positive_text": "string (Booking.com only)",
          "negative_text": "string (Booking.com only)"
        },
        "photos": [
          {"src": "url", "alt": "description"}
        ]
      }
    ]
  }
  ```
- **Timeout**: 30 seconds per request.
- **Error Handling**: Returns 0 reviews on failure (logged, no exception thrown).

#### Embedding Service (Microservice)
- **Endpoint**: `POST {EMBEDDING_SERVICE_URL}/search` (default: `http://localhost:8001/search`)
- **Purpose**: Semantic search to find "Similar Reviews" and "Relevant Rules" for RAG-based reply generation.
- **Request Payload**:
  ```json
  {
    "query": "review text",
    "hotel_id": 123,
    "top_k": 3
  }
  ```
- **Response Format**:
  ```json
  {
    "reviews": [{"text": "...", "distance": 0.123}],
    "rules": [{"text": "...", "distance": 0.456}]
  }
  ```
- **Timeout**: 12 seconds per request.
- **Feature Toggles**: Controlled by `reply_use_similar_reviews` and `reply_use_embedding_rules` system settings.

#### AI Providers

**Google Gemini**
- **Analysis Model**: `gemini-2.5-flash-lite` (hardcoded in `gemini_client.py`)
- **Reply Model**: Configurable via system settings (default: `gemini-2.5-flash-lite`)
- **API Versions**: Tries `v1` then `v1beta` for compatibility
- **Token Tracking**: Request count and token usage stored in system settings
- **Fallback**: Returns generic reply on failure

**Anthropic Claude**
- **Reply Model**: Configurable via system settings (default: `claude-sonnet-4-6`)
- **Model Aliases**: Automatically maps deprecated model names to current versions:
  - `claude-3-5-sonnet-*` → `claude-sonnet-4-6`
  - `claude-3-5-haiku-*` → `claude-haiku-4-5-20251001`
  - `claude-3-opus-*` → `claude-opus-4-6`
- **Fallback Chain**: Tries 8 model candidates before failing:
  1. Selected model
  2. Mapped alias (if applicable)
  3. Default Claude model
  4. Mapped default alias
  5. `claude-sonnet-4-6`
  6. `claude-sonnet-4-5-20250929`
  7. `claude-haiku-4-5-20251001`
  8. `claude-opus-4-6`
- **Call Strategy**: Prefers SDK call → fallback to direct HTTP API
- **Token Tracking**: Request count and token usage stored in system settings
- **Fallback**: Returns generic reply on failure

### Configuration Variables

#### Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_BATCH_SIZE` | `10` | Number of reviews to process in single Gemini batch |
| `MAX_RETRY_ATTEMPTS` | `3` | Maximum AI analysis retries before marking review as failed |
| `EMBEDDING_SERVICE_URL` | `http://localhost:8001` | Base URL for Embedding Service |
| `GENAI_KEY` | (required) | Google Gemini API key (for analysis) |

#### System Settings (dbo.system_settings)
| Setting Key | Type | Default | Description |
|-------------|------|---------|-------------|
| `reply_selected_model` | string | `gemini-2.5-flash-lite` | Currently selected AI model |
| `reply_google_api_key` | string | (empty) | Google Gemini API key for replies |
| `reply_claude_api_key` | string | (empty) | Anthropic Claude API key for replies |
| `reply_use_similar_reviews` | bool | `true` | Enable similar review context in prompts |
| `reply_use_embedding_rules` | bool | `true` | Enable brand rule context in prompts |
| `reply_similar_reviews_count` | int (1-20) | `3` | Number of similar reviews to fetch |
| `reply_google_request_count` | int | `0` | Total Google API requests made (auto-tracked) |
| `reply_google_token_usage` | int | `0` | Total Google tokens consumed (auto-tracked) |
| `reply_claude_request_count` | int | `0` | Total Claude API requests made (auto-tracked) |
| `reply_claude_token_usage` | int | `0` | Total Claude tokens consumed (auto-tracked) |

---

## 4. Database Schema & State

The module operates primarily on two tables in the **MSSQL** database:

### Table: `processed_review`
Acts as the central repository for all review data and AI-derived insights.

#### External Identifiers
| Column | Type | Description |
|--------|------|-------------|
| `id` | UNIQUEIDENTIFIER (PK) | Internal unique identifier (UUID v4). |
| `platformReviewId` | NVARCHAR(100) | Unique ID from the source platform (prevents duplicates). |
| `organization_id` | UNIQUEIDENTIFIER | Links review to owning organization. |
| `platform_id` | INT | Platform identifier (e.g., 1=Booking, 2=Google). |
| `source_id` | UNIQUEIDENTIFIER (FK) | Foreign key to `source.source_id` (on delete CASCADE). |

#### Review Content
| Column | Type | Description |
|--------|------|-------------|
| `rating` | INT | Normalized 1-5 star rating. |
| `reviewerName` | NVARCHAR(255) | Name of the reviewer. |
| `text` | NVARCHAR(MAX) | Full review text (combined for Booking.com). |
| `summary` | NVARCHAR(MAX) | AI-generated one-sentence summary. |

#### AI Analysis Results
| Column | Type | Description |
|--------|------|-------------|
| `sentiment` | NVARCHAR(20) | `Positive`, `Neutral`, or `Negative`. |
| `sentiment_score` | FLOAT | AI-derived sentiment score (1.0 to 5.0). |
| `language` | NVARCHAR(50) | Detected language (e.g., "English", "German"). |
| `categories` | NVARCHAR(MAX) | JSON array of category tags (e.g., `["Cleanliness", "Staff"]`). |
| `keyPhrases` | NVARCHAR(MAX) | JSON array of key phrases (e.g., `["great location", "friendly staff"]`). |
| `positive_text` | NVARCHAR(MAX) | Extracted positive points mentioned by reviewer. |
| `negative_text` | NVARCHAR(MAX) | Extracted negative points mentioned by reviewer. |
| `ai_reply` | NVARCHAR(MAX) | Most recently generated AI response draft. |

#### Error Tracking & Retry
| Column | Type | Description |
|--------|------|-------------|
| `status` | NVARCHAR(20) | `pending`, `processed`, or `failed`. |
| `error_message` | NVARCHAR(MAX) | Last error encountered during processing. |
| `retry_count` | INT | Number of AI analysis attempts (default: 0). |
| `last_attempt` | DATETIME | Timestamp of last processing attempt. |

#### Timestamps
| Column | Type | Description |
|--------|------|-------------|
| `reviewDate` | DATETIME | Date the review was originally posted. |
| `scrapedAt` | DATETIME | Timestamp when review was scraped from platform. |

### Table: `review_media`
Stores URLs for images associated with reviews.

| Column | Type | Description |
|--------|------|-------------|
| `media_id` | UNIQUEIDENTIFIER (PK) | Unique identifier for media record. |
| `review_id` | UNIQUEIDENTIFIER (FK) | Foreign key to `processed_review.id` (on delete CASCADE, indexed). |
| `src` | NVARCHAR(1000) | URL of the image. |
| `alt` | NVARCHAR(500) | Alt text/description for the image. |

### ORM Models
The module defines two SQLAlchemy ORM models in `models.py`:

- **`ProcessedReview`**: Full ORM representation with relationship to `ReviewMedia` (cascade delete).
- **`ReviewMedia`**: Media relationship with back-reference to `ProcessedReview`.

These are registered in SQLAlchemy's `Base.metadata` for automatic table creation via `Base.metadata.create_all()`.

---

## 5. Service Details

### 5.1 Review Service (`review_service.py`)
**Purpose**: Orchestrates review ingestion and processing pipeline.

**Key Functions**:
- `get_all_reviews_from_db(organization_id)`: Fetches all enriched reviews for an organization.
- `ingest_from_scraper(source_id, organization_id)`: Calls Scraper Engine, maps data, upserts to DB.
- `start_ingestion_and_processing_flow(source_id)`: Full pipeline (ingest → analyze) as background task.
- `count_all_reviews()`: Returns total review count across all organizations.

**Data Mapping Logic**:
```python
# Booking.com: Preserve separate text components
positive_text = detail.get("positive_text")
negative_text = detail.get("negative_text")

# Other platforms: Use review_text directly as 'text'
review_text = detail.get("review_text", "")

# Unified mapping for pending storage
mapping = {
    "platformReviewId": r_data.get("review_id"),
    "rating": detail.get("rating", 0),
    "reviewerName": detail.get("author", "Guest"),
    "text": review_text if not (positive_text or negative_text) else None,
    "positive_text": positive_text,
    "negative_text": negative_text,
    "reviewDate": detail.get("review_date"),
    "scrapedAt": r_data.get("created_at"),
    "source_id": source_id,
    "organization_id": organization_id,
    "platform_id": raw_data.get("platform_id")
}
```

### 5.2 Processor Service (`processor.py`)
**Purpose**: Manages AI analysis pipeline with batch processing and retry logic.

**Key Functions**:
- `run_analysis_pipeline()`: Main entry point; fetches pending reviews, calls Gemini, updates DB.
- `_update_review_success(cursor, review_id, analysis)`: Updates review with AI insights, sets status to `processed`.
- `_update_review_failure(cursor, review_id, error)`: Increments retry count, marks as `failed` if max retries exceeded.
- `_mark_batch_as_failed(cursor, batch, error)`: Marks entire batch for retry on Gemini API failure.

**Configuration**:
- `BATCH_SIZE = int(os.getenv("GEMINI_BATCH_SIZE", 10))`
- `MAX_RETRIES = int(os.getenv("MAX_RETRY_ATTEMPTS", 3))`

### 5.3 Gemini Client (`gemini_client.py`)
**Purpose**: Communicates with Google Gemini API for sentiment analysis.

**Key Functions**:
- `analyze_reviews_batch(reviews)`: Sends batch to Gemini, parses JSON response.

**System Prompt**: Defines role as "Advanced Reputation Analyst" with strict JSON output requirements including sentiment, categories, key phrases, summary, positive/negative extraction, and draft reply.

**Model**: `gemini-2.5-flash-lite` (hardcoded)

**Response Parsing**:
- Removes markdown code fences (```json)
- Parses JSON array
- Validates list structure
- Raises exception on failure (triggers retry logic)

### 5.4 Reply Generation Service (`reply_generation_service.py`)
**Purpose**: Multi-provider AI reply generation with RAG context and fallback mechanisms.

**Key Functions**:
- `generate_review_reply(payload)`: Main entry point for reply generation.
- `_load_reply_generation_settings()`: Fetches provider, model, API keys, toggles from DB.
- `_fetch_embedding_context(review_text, hotel_id, top_k)`: Calls Embedding Service for similar reviews and rules.
- `_build_prompt(payload, similar_reviews, rules)`: Constructs prompt with tone, length, language hints.
- `_generate_with_google(api_key, model, prompt)`: Calls Gemini API (tries v1 and v1beta).
- `_generate_with_claude(api_key, model, prompt)`: Calls Claude API with 8-model fallback chain.
- `_fallback_reply(payload)`: Returns hardcoded reply based on sentiment (positive/negative/neutral).
- `_increment_provider_usage(provider, tokens_used)`: Tracks API usage in system settings.

**Provider Inference**:
```python
def _infer_provider_from_model(model: str) -> str:
    normalized = model.strip().lower()
    if normalized.startswith("claude"):
        return "claude"
    return "google"
```

**Prompt Construction**:
- **Tone Options**: `standard`, `professional`, `casual`
- **Length Options**: `standard` (120-180 words), `short` (40-90 words)
- **Language Hint**: Uses `language` field from request if provided
- **Context Sections**: Similar reviews and brand rules formatted with distance scores

**Reply Requirements** (enforced in prompt):
- Match review language (no translation unless review is in English)
- Thank the reviewer
- Address key points from original review
- Follow brand rules exactly when applicable
- Acknowledge issues for negative reviews
- Never mention AI, rules, or similar reviews used

### 5.5 Stats Service (`stats_service.py`)
**Purpose**: Provides aggregated metrics for admin and organizational dashboards.

**Key Functions**:
- `get_review_metrics(cursor)`: Returns system-wide KPIs:
  - `totalReviews`: Total count from `processed_review`
  - `reviewsCollectedToday`: Count where `scrapedAt` is today
  - `reviewsGrowth`: Placeholder (currently hardcoded to 5.2)
- `get_usage_trend(cursor)`: Returns 12-month review volume trend (chronological order).
- `get_recent_activity(cursor)`: Returns latest 10 review events for activity feed.
- `get_system_alerts(cursor)`: Returns latest 5 sync failures from `dbo.sync_log` table.

**Usage**: Called by admin dashboard routes to populate charts, trends, and alert widgets.

---

## 6. Code Review: Flaws & Technical Debt

### Mixed Database Access Patterns
> [!WARNING]
> **Technical Debt**: The module inconsistently uses **SQLAlchemy ORM** (in `models.py`) and **raw pyodbc** (in `repository.py` and services).
- **Risk**: This leads to fragmented connection management, potential leaks, and makes unit testing significantly more difficult.
- **Recommendation**: Standardize all data access on the SQLAlchemy ORM. Migrate `repository.py` to use ORM queries.

### Microservice Port Conflict
> [!CAUTION]
> **Bug Risk**: Both the **Scraper Engine** and the **Embedding Service** are referenced as running on `localhost:8001` in different parts of the services.
- **Impact**: In single-node deployments, one service will fail to bind, breaking either ingestion or reply generation.
- **Locations**:
  - `review_service.py` line 42: `http://127.0.0.1:8001/api/reviews/{source_id}`
  - `reply_generation_service.py` line 35: `EMBEDDING_SERVICE_URL = os.getenv("EMBEDDING_SERVICE_URL", "http://localhost:8001")`
- **Recommendation**: Explicitly assign distinct ports in `.env` (e.g., Scraper on 8001, Embedding on 8002) and update default values.

### Mixed Sync/Async Logic
The routes use `async def`, but the underlying services often perform synchronous blocking I/O via `pyodbc`. This can block the FastAPI event loop under high load.
- **Affected**: `generate_reply` route (sync DB calls), `count_all_reviews` route.
- **Recommendation**: Use `run_in_executor` for blocking calls or migrate to async database driver.

### Hardcoded URLs
> [!WARNING]
> **Configuration Issue**: Scraper Engine URL is hardcoded in `review_service.py` instead of being configurable via environment variable.
- **Impact**: Cannot easily switch between development, staging, and production environments.
- **Recommendation**: Add `SCRAPER_ENGINE_URL` to `.env` and use `os.getenv()`.

### No Validation of AI Output
> [!WARNING]
> **Reliability Risk**: Gemini response parsing relies on regex to remove markdown fences, with no JSON schema validation.
- **Risk**: Malformed AI responses can crash the pipeline or corrupt database records.
- **Recommendation**: Implement Pydantic model validation for AI responses before database insertion.

### SQL Injection Risk
> [!CAUTION]
> **Security Risk**: `get_pending_batch` in `repository.py` uses f-string for `limit` parameter:
  ```python
  sql = f"SELECT TOP {limit} ... FROM dbo.processed_review ..."
  ```
- **Risk**: If `limit` is ever derived from user input, this creates SQL injection vulnerability.
- **Recommendation**: Use parameterized queries or validate `limit` is integer before string interpolation.

### Connection Leak Risk
Multiple manual `pyodbc.connect()` calls without consistent context managers throughout services.
- **Risk**: Database connections may not be properly closed on exceptions.
- **Recommendation**: Use context managers (`with pyodbc.connect(...) as conn:`) consistently.

### Fallback Masking
AI failures silently fall back to generic replies, hiding problems from users and administrators.
- **Impact**: Users may receive low-quality replies without knowing AI provider failed.
- **Recommendation**: Return `providerError` in response (already implemented) and log alerts for monitoring.

### Model Candidate Fallback Chain
Claude tries 8 different model names before failing (brittle and difficult to maintain).
- **Risk**: Technical debt accumulates as new models are released.
- **Recommendation**: Maintain model aliases in centralized configuration, update periodically.

### No Rate Limiting
No protection against excessive API calls to AI providers.
- **Risk**: Could exceed API quotas or incur unexpected costs.
- **Recommendation**: Implement rate limiting per user/organization with configurable limits.

---

## 7. Strategic Enhancements

### High Priority
1.  **Distributed Task Queue**: Replace FastAPI `BackgroundTasks` with **Celery + Redis** or **RQ**. This ensures that scraping and AI analysis tasks are persistent and can be retried across service restarts.
2.  **Configuration Management**: Move hardcoded Scraper Engine URL to environment variable. Add validation for all external service URLs on startup.
3.  **AI Response Validation**: Implement Pydantic models for Gemini and Claude responses to catch malformed output before database insertion.

### Medium Priority
4.  **Caching Layer**: Implement **Redis caching** for the `stats_service.py` metrics. Dashboard KPIs currently perform heavy aggregate SQL queries on every page load.
5.  **Schema Evolution**: Move `categories` and `keyPhrases` from serialized strings to a proper junction table or use SQL Server's native JSON support more effectively for better query performance.
6.  **Batch AI Optimization**: Implement a "Debounce" or "Buffer" in the `processor.py` to group single-review ingestions into larger Gemini batches, reducing API latency and cost.
7.  **Rate Limiting**: Add per-user and per-organization rate limits for reply generation to control API costs.

### Low Priority
8.  **Unified Database Access**: Migrate all `pyodbc` calls to SQLAlchemy ORM for consistency and testability.
9.  **Async Database Driver**: Consider migrating to `asyncpg` or `aioodbc` for true async I/O in FastAPI.
10. **Monitoring & Alerting**: Add metrics for AI provider failure rates, average response times, and token usage trends.
11. **Model Alias Management**: Centralize Claude model aliases in system settings or configuration file for easier updates.

---

## 8. Testing Recommendations

### Unit Tests
- Test data mapping logic in `ingest_from_scraper` with mock scraper responses.
- Test prompt construction with various tone/length/language combinations.
- Test fallback reply generation for each sentiment type.
- Test retry logic boundary conditions (MAX_RETRIES - 1, MAX_RETRIES, MAX_RETRIES + 1).

### Integration Tests
- Test full pipeline flow: trigger sync → ingestion → analysis → processed reviews.
- Test reply generation with both Google and Claude providers.
- Test RAG context fetching from Embedding Service.
- Test error scenarios: Scraper Engine down, Gemini API timeout, Claude API rate limit.

### Performance Tests
- Test batch processing with 100+ pending reviews.
- Test concurrent reply generation requests.
- Test database query performance for organizations with 10,000+ reviews.

---

## 9. Quick Reference

### File Responsibilities
| File | Purpose |
|------|---------|
| `models.py` | SQLAlchemy ORM definitions for `processed_review` and `review_media` |
| `schemas.py` | Pydantic schemas for API request/response validation |
| `repository.py` | Raw SQL data access layer (upsert, batch fetch, enriched fetch) |
| `routes/reviews.py` | FastAPI route definitions (4 endpoints) |
| `services/review_service.py` | Ingestion orchestration and scraper communication |
| `services/processor.py` | AI analysis pipeline with batch processing and retry logic |
| `services/gemini_client.py` | Google Gemini API wrapper for sentiment analysis |
| `services/reply_generation_service.py` | Multi-provider reply generation with RAG and fallbacks |
| `services/stats_service.py` | Dashboard metrics, trends, and activity feeds |

### Status Transitions
```
pending ──[AI success]──→ processed
   │
   └──[AI failure, retries < MAX]──→ pending (retry_count++)
         │
         └──[AI failure, retries >= MAX]──→ failed
```

### Provider Selection Logic
```
User Request → Load System Settings
                  ↓
           Determine Provider (google/claude)
                  ↓
           Fetch API Key & Model Name
                  ↓
           Generate Reply (with fallback chain)
                  ↓
           Track Usage & Return Response
```

### Error Propagation
```
Scraper Engine Failure → Log Error → Return 0 Reviews → Skip Analysis
Gemini Analysis Failure → Retry (up to MAX_RETRIES) → Mark as Failed
Reply Generation Failure → Return Fallback Reply → Include providerError in Response
Database Error → Log Error → Raise HTTPException (500)
```

---

## Appendix A: Pydantic Schema Definitions

### ReviewModel
```python
class ReviewModel(BaseModel):
    id: str
    platformReviewId: Optional[str] = None
    rating: int
    reviewerName: str  # Alias: userName
    userName: str      # Alias: reviewerName
    text: Optional[str]       # Alias: reviewText
    reviewText: Optional[str] # Alias: text
    summary: Optional[str] = None
    sentiment: Optional[str] = "Neutral"
    language: Optional[str] = "English"
    categories: List[str] = []
    keyPhrases: List[str] = []
    photos: List[PhotoModel] = []
    source_id: Optional[uuid.UUID] = None
    date: Optional[datetime.date] = None
    status: str = "pending"
    positive_text: Optional[str] = None
    negative_text: Optional[str] = None
    error_message: Optional[str] = None
    retry_count: int = 0
    last_attempt: Optional[datetime.datetime] = None
```

### PhotoModel
```python
class PhotoModel(BaseModel):
    src: str
    alt: str = ""
```

---

## Appendix B: External API Contracts

### Scraper Engine Request
```http
GET http://127.0.0.1:8001/api/reviews/{source_id}
Timeout: 30s
```

### Embedding Service Request
```http
POST {EMBEDDING_SERVICE_URL}/search
Content-Type: application/json
Timeout: 12s

{
  "query": "review text here",
  "hotel_id": 123,
  "top_k": 3
}
```

### Google Gemini Request (Analysis)
```python
client.models.generate_content(
    model="gemini-2.5-flash-lite",
    contents=SYSTEM_PROMPT.format(batch_json=batch_json)
)
```

### Anthropic Claude Request (HTTP Fallback)
```http
POST https://api.anthropic.com/v1/messages
Headers:
  x-api-key: {api_key}
  anthropic-version: 2023-06-01
  content-type: application/json

{
  "model": "claude-sonnet-4-6",
  "max_tokens": 450,
  "messages": [{"role": "user", "content": prompt}]
}
```

---

*Last Updated: 2026-04-12*  
*Module Version: Reviews Module v2.0 (Complete Documentation)*
