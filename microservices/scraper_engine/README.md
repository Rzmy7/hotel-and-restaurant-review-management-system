# Universal Reviews Scraper Engine (v4.0.0)

A production-grade, multi-platform **review microservice** that scrapes, normalizes, and serves reviews from **Agoda**, **Booking.com**, **Google Maps**, and **TripAdvisor** through a unified REST API.

## Architecture

```
scraper_engine/
├── api/
│   ├── main.py                       # FastAPI app entry point (prefix: /api)
│   ├── endpoints/
│   │   ├── agoda.py                  # POST /api/agoda/scrape
│   │   ├── booking.py                # POST /api/booking/scrape
│   │   ├── google.py                 # POST /api/google/scrape
│   │   ├── tripadvisor.py            # POST /api/tripadvisor/scrape
│   │   ├── sources.py                # GET /api/sources
│   │   ├── reviews.py                # GET /api/reviews
│   │   ├── db_admin.py               # Stats, purge, vacuum
│   │   └── system.py                 # Health, jobs, pool status
│   └── middleware/
│       └── audit_middleware.py       # Global logging for API calls
├── core/
│   ├── config.py                     # Env configuration + logging
│   ├── database.py                   # SQLAlchemy engine + session
│   ├── models.py                     # Source-centric unified models
│   ├── utils.py                      # Notification logic for backend
│   └── scrape_pool.py                # ThreadPoolExecutor management
├── platforms/
│   ├── [platform]/
│   │   ├── browser.py                # Playwright launch config
│   │   ├── logic.py                  # Orchestrator & pagination
│   │   └── extractor.py              # DOM parsing
├── scripts/
│   ├── debug/                        # check_*.py and test_*.py tools
│   └── maintenance/                  # fix_*.py and schema migrations
├── tests/                            # Integration tests
└── .env                              # Environment configuration
```

## Database Schema

The engine uses a **source-centric** model. Each source represents a unique URL and is identified by a UUID provided by the main backend.

| Table | Description |
|-------|-------------|
| `sources` | Registry of scrape target URLs and their assigned UUIDs. |
| `reviews` | **Supertype**: Central record linking to a source. |
| `[platform]_reviews` | **Subtype**: Granular data specific to Agoda, Booking, Google, or TripAdvisor. |
| `review_media` | Images/videos attached to any review. |
| `audit_log` | System-wide history of API calls, scrapes, and errors. |

## API Endpoints

All endpoints are prefixed with `/api`.

### Scrapers

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/agoda/scrape` | Trigger Agoda scrape |
| `POST` | `/api/booking/scrape` | Trigger Booking scrape |
| `POST` | `/api/google/scrape` | Trigger Google scrape |
| `POST` | `/api/tripadvisor/scrape` | Trigger TripAdvisor scrape |

### Data Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/sources` | List all local source records |
| `GET` | `/api/reviews` | Global review query with filtering |
| `GET` | `/api/audit` | View system audit logs |

### System & Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/system/health` | Health check + Job status |
| `GET` | `/api/db/stats` | Global review statistics |
| `POST` | `/api/db/vacuum` | Database maintenance |

## Callback Mechanism

Upon successful completion of a scrape, the microservice automatically notifies the main backend using the `BACKEND_API_URL` environment variable.

- **Endpoint**: `${BACKEND_API_URL}/source/tasks/{source_id}/sync-complete`
- **Method**: `POST`

## Getting Started

### Prerequisites

- **Python 3.9+**
- **MS SQL Server** with `ODBC Driver 18 for SQL Server`
- **Playwright Chromium**: `playwright install chromium`

### Environment Setup

Create a `.env` file:

```env
# Database
DB_DRIVER=ODBC Driver 18 for SQL Server
DB_SERVER=your_server
DB_NAME=ScraperEngine
DB_UID=sa
DB_PWD=your_password

# Notification
BACKEND_API_URL=http://127.0.0.1:8000
```

### Running

```bash
python api/main.py
```

Navigate to **http://127.0.0.1:8001/docs** for the interactive Swagger UI.

## Tech Stack

- **Web Framework**: FastAPI + Uvicorn
- **Browser Automation**: Playwright (Chromium)
- **ORM**: SQLAlchemy 2.0
- **Database**: MS SQL Server via PyODBC
- **Concurrency**: ThreadPoolExecutor
- **Validation**: Pydantic v2
