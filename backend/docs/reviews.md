# Reviews Module Documentation

The `backend\app\modules\reviews` module is responsible for orchestrating the lifecycle of customer reviews, from ingestion and database persistence to AI-powered analysis and interactive response generation.

---

## 🚀 Overview

This module consolidates reviews from various sources (via a Scraper Engine), analyzes them using the LLM Gateway to extract sentiment and insights, and provides tools for management and AI-assisted replies.

### Key Capabilities
- **Automated Ingestion**: Fetching raw data from external scraping services.
- **AI Analysis Pipeline**: Categorizing reviews, scoring sentiment, and summarizing content.
- **Multi-Provider AI Replies**: Generating context-aware responses using configured OpenAI-compatible LLM models.
- **RAG Integration**: Utilizing similar reviews and business rules for personalized AI replies.
- **Usage Tracking**: Monitoring AI feature consumption and token usage.

---

## 🛠️ Module Structure

```text
backend\app\modules\reviews\
├── routes/
│   └── reviews.py          # API Endpoints (FastAPI)
├── services/
│   ├── review_service.py   # Main orchestration logic
│   ├── processor.py        # AI Analysis background worker
│   ├── llm_client.py       # Multi-model LLM abstraction via LLM Gateway
│   ├── reply_generation_service.py # Reply generation logic (RAG-enabled)
│   └── stats_service.py    # Review statistics calculations
├── repository.py           # SQL operations (pyodbc)
├── models.py               # SQLAlchemy database models
└── schemas.py              # Pydantic data validation
```

---

## 🔄 Working Flow: Review Sync & Analysis

This is a two-stage background process that moves a review from "Raw Data" to "Processed Insight".

### 1. Ingestion Phase
**Trigger**: Called when a user clicks "Sync" or via a manual trigger at `POST /api/reviews/trigger/{source_id}`.

1.  **Request**: The `review_service` calls the **Scraper Engine** (running internally on port 8001).
2.  **Mapping**: Raw JSON from the scraper is mapped to the internal `processed_review` schema.
    *   *Example*: Mapping platform-specific IDs, ratings, and merging text fields.
3.  **Persistence**: Data is saved to `dbo.processed_review` with a status of `pending`.
4.  **Media**: Associated images are saved to `dbo.review_media`.

### 2. AI Analysis Phase
**Trigger**: Automatically triggered after ingestion or via background worker.

1.  **Batching**: The `processor` fetches a batch of `pending` reviews (configurable via admin).
2.  **AI Call**: The text is sent to the `llm_client` / `llm_gateway` for a unified analysis.
    *   **Input**: Review text, rating, and metadata.
    *   **Output**: Sentiment (Positive/Negative/Neutral), Sentiment Score (1-5), Language, Summary, Key Phrases, Categories, and an initial AI Suggestion.
3.  **Updating**: The database record is updated:
    *   Status changes from `pending` -> `processed`.
    *   Insights fields are populated.
    *   In case of failure, a retry counter increments until reaching the limit (3), then marks as `failed`.

---

## 💬 Working Flow: AI Reply Generation

This is a real-time, on-demand flow used by managers to respond to reviews.

**Trigger**: UI call to `POST /api/reviews/generate-reply`.

1.  **Setting Retrieval**: Load active LLM models configured in `dbo.llm_model` via the LLM Gateway.
2.  **Context Enrichment (RAG)**:
    *   If enabled, it calls the **Embedding Service** to find "Similar Reviews" and "Business Rules" relevant to the current review text.
3.  **Prompt Construction**: Builds a highly detailed prompt including:
    *   Reviewer name and sentiment.
    *   The original review text.
    *   Similar past replies for consistency.
    *   Relevant business guidelines/rules.
    *   Tone (Professional/Casual) and Length (Short/Standard) requirements.
4.  **Inference**:
    *   Calls the LLM Gateway with automatic failover across active OpenAI-compatible models.
    *   Handles language matching (ensuring the reply matches the review language).
5.  **Return**: Returns the generated text, along with metadata on which model was used and how many rules/reviews influenced the result.
6.  **Usage Tracking**: Increments the `feature_usage` table for the user's subscription limits.

---

## 📊 Data & Returns

### Database Schema (`processed_review`)
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `status` | String | `pending`, `processed`, `failed` |
| `sentiment` | String | AI-determined (Positive, Negative, etc.) |
| `sentiment_score`| Float | Precise score from 1.0 to 5.0 |
| `categories` | JSON | List of topics (e.g., "Service", "Cleanliness") |
| `ai_reply` | Text | The suggested reply stored after analysis |

### API Response (`ReviewModel`)
Returns an enriched object containing:
- Review metadata (Rating, Date, Author).
- AI Insights (Sentiment, Summary, Categories).
- **Photos**: A list of source URLs for attached media.
- **Source Info**: Details of which platform the review originated from.

---

## ⚠️ Error Handling
- **Scraper Failure**: Logged as a warning; the pipeline aborts gracefully without crashing.
- **AI Timeout**: Handled by a retry mechanism in `processor.py`.
- **Reply Fallback**: If both AI providers fail during reply generation, a template-based fallback reply is generated so the user isn't left without a response.
