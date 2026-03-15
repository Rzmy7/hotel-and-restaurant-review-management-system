# Universal Reviews Scraper Engine

A production-grade, multi-platform **review microservice** that scrapes, normalizes, and serves hotel/place reviews from **Agoda**, **Booking.com**, and **Google Maps** through a unified REST API backed by a normalized SQL Server database.

## Architecture

```
scraper_engine/
├── api/
│   ├── main.py                       # FastAPI app entry point (v3.1.0)
│   ├── endpoints/
│   │   ├── agoda.py                  # POST /agoda/scrape, GET /agoda/reviews
│   │   ├── booking.py                # POST /booking/scrape, GET /booking/reviews
│   │   ├── google.py                 # POST /google/scrape, GET /google/reviews
│   │   ├── organizations.py          # Full CRUD + scrape-all + reviews + stats
│   │   ├── sources.py                # GET /sources (platform registry)
│   │   ├── reviews.py                # GET /reviews (global query with filters)
│   │   ├── db_admin.py               # Stats, purge, vacuum
│   │   └── system.py                 # Health, jobs, pool status, metrics
│   └── websockets/
│       └── events.py                 # WS /ws/jobs/{job_id} real-time streaming
├── core/
│   ├── config.py                     # Env-based config + logging setup
│   ├── database.py                   # SQLAlchemy engine, session, init + seed
│   ├── models.py                     # 11 unified tables (supertype/subtype)
│   ├── job_manager.py                # In-memory job state tracking
│   └── scrape_pool.py                # ThreadPoolExecutor (max 7 concurrent)
├── platforms/
│   ├── agoda/                        # Agoda scraper plugin
│   │   ├── browser.py                # Playwright launch config
│   │   ├── config.py                 # CSS selectors & locators
│   │   ├── extractor.py              # DOM parsing → structured data
│   │   ├── logic.py                  # Orchestrator: navigate, paginate, extract
│   │   ├── models.py                 # save_reviews_to_db() → unified schema
│   │   └── storage.py                # JSON file output
│   ├── booking/                      # Booking.com scraper plugin (same structure)
│   └── google/                       # Google Maps scraper plugin (same structure)
├── tests/                            # Integration tests & profile setup
├── docs/                             # API documentation
└── .env                              # Environment configuration
```

## Database Schema

The engine uses a **supertype/subtype** pattern with a normalized, unified schema:

| Table | Description |
|-------|-------------|
| `organizations` | Minimal registry (PK + name). Master data lives elsewhere. |
| `sources` | Platform registry — auto-seeded: Agoda, Booking, Google |
| `organization_sources` | M:N junction linking orgs → platform URLs |
| `reviews` | **Supertype**: rating, author, text, title, date, reply, sentiment |
| `agoda_reviews` | **Subtype**: nationality, stayed_dates, traveler_type, room_type |
| `booking_reviews` | **Subtype**: positive/negative text, stay_date, nights, room_name |
| `google_reviews` | **Subtype**: author_badge, place_url |
| `review_media` | Images/videos for any review |
| `review_embeddings` | AI vector storage (future) |
| `organization_review_stats` | Dashboard cache (future) |
| `review_audit_log` | Change history (future) |

## API Endpoints

### Organizations (`/api/v1/organizations`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/organizations` | Create org + link sources in one call |
| `GET` | `/api/v1/organizations` | List all with review counts |
| `GET` | `/api/v1/organizations/{id}` | Details + linked sources |
| `PUT` | `/api/v1/organizations/{id}` | Update name |
| `DELETE` | `/api/v1/organizations/{id}` | Cascade delete |
| `GET` | `/api/v1/organizations/{id}/sources` | List linked sources |
| `POST` | `/api/v1/organizations/{id}/sources` | Link platform URL |
| `DELETE` | `/api/v1/organizations/{id}/sources/{platform}` | Unlink platform |
| `GET` | `/api/v1/organizations/{id}/reviews` | Cross-platform reviews |
| `GET` | `/api/v1/organizations/{id}/stats` | Per-org analytics |
| `POST` | `/api/v1/organizations/{id}/scrape` | Scrape ALL sources |
| `POST` | `/api/v1/organizations/{id}/scrape/{platform}` | Scrape one platform |

### Global Reviews (`/api/v1/reviews`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/reviews` | Filter by platform, org, rating, author |
| `GET` | `/api/v1/reviews/{id}` | Single review detail |
| `DELETE` | `/api/v1/reviews/{id}` | Delete review |

### Platform Scrapers (backward compatible)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/agoda/scrape` | Trigger Agoda scrape |
| `GET` | `/agoda/reviews` | Query Agoda reviews |
| `POST` | `/booking/scrape` | Trigger Booking scrape |
| `GET` | `/booking/reviews` | Query Booking reviews |
| `POST` | `/google/scrape` | Trigger Google scrape |
| `GET` | `/google/reviews` | Query Google reviews |

### System & Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/system/health` | Health + DB + pool status |
| `GET` | `/api/v1/system/jobs` | Active jobs |
| `GET` | `/api/v1/system/jobs/all` | All jobs (incl. completed/failed) |
| `GET` | `/api/v1/system/pool` | Thread pool status |
| `PUT` | `/api/v1/system/pool` | Change max concurrent workers |
| `GET` | `/api/v1/system/metrics` | Python/OS/CPU info |
| `GET` | `/api/v1/sources` | List platforms + review counts |
| `GET` | `/api/v1/sources/{id}` | Platform detail |
| `GET` | `/api/v1/db/stats` | Global review stats |
| `DELETE` | `/api/v1/db/reviews/{platform}` | Purge reviews by platform |
| `DELETE` | `/api/v1/db/organizations/{platform}` | Remove org-source links |
| `POST` | `/api/v1/db/vacuum` | DBCC SHRINKDATABASE |
| `WS` | `/api/v1/ws/jobs/{job_id}` | Real-time job progress |

## Thread Pool

All scrape jobs execute through a **centralized `ThreadPoolExecutor`** with configurable concurrency:

- **Default**: 7 simultaneous scrape jobs
- **Excess jobs are queued** automatically and execute as slots free up
- **Runtime configurable** via `PUT /api/v1/system/pool` with `{"max_workers": N}`
- Every scrape response includes current pool status
- Pool status visible in health check, job listings, and dedicated pool endpoint

## Getting Started

### Prerequisites

- **Python 3.9+**
- **MS SQL Server** with `ODBC Driver 18 for SQL Server`
- **Playwright Chromium**: `playwright install chromium`

### Environment Setup

Create `.env` in the project root:

```env
# Database
DB_DRIVER=ODBC Driver 18 for SQL Server
DB_SERVER=your_server
DB_NAME=ScraperEngine
DB_UID=sa
DB_PWD=your_password

# Google Account (for persistent Playwright profile)
GOOGLE_EMAIL=your_email@gmail.com
GOOGLE_PASSWORD=your_password
```

### Installation

```bash
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
playwright install chromium
```

### Running

```bash
python api/main.py
```

Navigate to **http://127.0.0.1:8000/docs** for the interactive Swagger UI.


### Quick Start Example

```bash
# 1. Create an organization with all platform URLs
curl -X POST http://127.0.0.1:8000/api/v1/organizations \
  -H "Content-Type: application/json" \
  -d '{
    "organization_name": "Hilton Colombo",
    "sources": [
      {"platform": "Booking", "url": "https://www.booking.com/hotel/lk/hilton-colombo.html"},
      {"platform": "Agoda",   "url": "https://www.agoda.com/hilton-colombo"},
      {"platform": "Google",  "url": "https://maps.app.goo.gl/abc123"}
    ]
  }'

# 2. Scrape ALL platforms simultaneously
curl -X POST http://127.0.0.1:8000/api/v1/organizations/1/scrape \
  -H "Content-Type: application/json" \
  -d '{"headless": true, "pages": "*"}'

# 3. Get cross-platform reviews
curl http://127.0.0.1:8000/api/v1/organizations/1/reviews

# 4. Monitor via WebSocket
wscat -c ws://127.0.0.1:8000/api/v1/ws/jobs/<job_id>
```

## Expanding the Engine

To add a new platform (e.g., TripAdvisor):

1. Create `platforms/tripadvisor/` with `browser.py`, `config.py`, `extractor.py`, `logic.py`, `models.py`, `storage.py`
2. Add a subtype model in `core/models.py` (e.g., `TripAdvisorReviewDetail`)
3. Add a new `Source` seed in `core/database.py` `_seed_sources()`
4. Create `api/endpoints/tripadvisor.py` with scrape + review endpoints
5. Mount the router in `api/main.py`

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Web Framework | FastAPI + Uvicorn |
| Browser Automation | Playwright (Chromium) |
| ORM | SQLAlchemy 2.0 |
| Database | MS SQL Server via PyODBC |
| Concurrency | ThreadPoolExecutor (7 workers) |
| Real-time | WebSockets (FastAPI native) |
| Validation | Pydantic v2 |
| Config | python-dotenv |
