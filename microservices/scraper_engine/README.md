# 🕷️ Universal Reviews Scraper Engine

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Playwright](https://img.shields.io/badge/Playwright-Chromium-2EAD33?style=for-the-badge&logo=google-chrome&logoColor=white)](https://playwright.dev/)
[![Python 3.9+](https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white)](https://www.sqlalchemy.org/)

A production-grade, multi-platform **review microservice** that scrapes, normalizes, and serves reviews from **Agoda**, **Booking.com**, **Google Maps**, and **TripAdvisor** through a unified REST API.

---

## 🌟 Key Features

| Feature | Description |
|---------|-------------|
| **🌍 Multi-Platform Scraping** | Agoda, Booking.com, Google Maps, TripAdvisor support |
| **🔗 Unified API** | Consistent data format across all sources |
| **📝 Audit Logging** | System-wide API call tracking |
| **📣 Callback Mechanism** | Automatic backend notification on completion |
| **⚡ Concurrent Execution** | ThreadPoolExecutor for parallel scraping |
| **🛡️ Rate Limiting** | Two-tier protection (API & Domain level) |
| **🗓️ Smart Scheduling** | Domain-aware queuing to prevent IP bans |
| **🏥 Health Monitoring** | Real-time job status and system diagnostics |
| **🗄️ Source-Centric Design** | UUID-based source management for scalability |

---

## 🏗️ Architecture

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
│
├── core/
│   ├── config.py                     # Env configuration + logging
│   ├── database.py                   # SQLAlchemy engine + session
│   ├── models.py                     # Source-centric unified models
│   ├── utils.py                      # Notification logic for backend
│   └── scrape_pool.py                # ThreadPoolExecutor management
│
├── platforms/
│   ├── agoda/
│   │   ├── browser.py                # Playwright launch config
│   │   ├── logic.py                  # Orchestrator & pagination
│   │   └── extractor.py              # DOM parsing
│   ├── booking/
│   │   ├── browser.py
│   │   ├── logic.py
│   │   └── extractor.py
│   ├── google/
│   │   ├── browser.py
│   │   ├── logic.py
│   │   └── extractor.py
│   └── tripadvisor/
│       ├── browser.py
│       ├── logic.py
│       └── extractor.py
│
├── scripts/
│   ├── debug/                        # check_*.py and test_*.py tools
│   └── maintenance/                  # fix_*.py and schema migrations
│
├── tests/                            # Integration tests
├── docs/                             # Platform-specific documentation
├── output/                           # Scraped data output (dev)
├── .env                              # Environment configuration
├── .env.example                      # Environment template
└── requirements.txt                  # Python dependencies
```

---

## 🗄️ Database Schema

The engine uses a **source-centric** model. Each source represents a unique URL and is identified by a UUID provided by the main backend.

### Core Tables

| Table | Description | Key Fields |
|-------|-------------|------------|
| `sources` | Registry of scrape target URLs and their assigned UUIDs | `id`, `url`, `platform`, `uuid`, `created_at` |
| `reviews` | **Supertype**: Central record linking to a source | `id`, `source_id`, `reviewer_name`, `rating`, `comment`, `stay_date` |
| `agoda_reviews` | **Subtype**: Agoda-specific data | `review_id`, `room_type`, `traveler_type`, `helpful_votes` |
| `booking_reviews` | **Subtype**: Booking.com-specific data | `review_id`, `room_type`, `nights_stayed`, `travel_date` |
| `google_reviews` | **Subtype**: Google Maps-specific data | `review_id`, `profile_image`, `likes`, `response_from_owner` |
| `tripadvisor_reviews` | **Subtype**: TripAdvisor-specific data | `review_id`, `trip_type`, `travel_date`, `helpful_votes` |
| `review_media` | Images/videos attached to any review | `id`, `review_id`, `media_type`, `url`, `caption` |
| `audit_log` | System-wide history of API calls, scrapes, and errors | `id`, `timestamp`, `endpoint`, `method`, `status`, `duration_ms` |

### Entity Relationship

```
┌─────────────┐         ┌──────────────┐
│   sources   │◄────────│   reviews    │
│─────────────┤         │──────────────┤
│ id (UUID)   │         │ id           │
│ url         │         │ source_id    │◄─── Links to source
│ platform    │         │ platform     │
│ uuid        │         │ rating       │
└─────────────┘         │ comment      │
                        │ stay_date    │
                        └──────┬───────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
            ▼                  ▼                  ▼
    ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
    │ agoda_reviews │  │booking_reviews│  │ google_reviews│
    │───────────────┤  │───────────────┤  │───────────────┤
    │ review_id     │  │ review_id     │  │ review_id     │
    │ room_type     │  │ room_type     │  │ profile_image │
    │ traveler_type │  │ nights_stayed │  │ likes         │
    └───────────────┘  └───────────────┘  └───────────────┘
```

---

## 📡 API Endpoints

### Scrapers

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| `POST` | `/api/agoda/scrape` | Trigger Agoda scrape | `{ source_id, url }` | `{ job_id, status }` |
| `POST` | `/api/booking/scrape` | Trigger Booking scrape | `{ source_id, url }` | `{ job_id, status }` |
| `POST` | `/api/google/scrape` | Trigger Google scrape | `{ source_id, url }` | `{ job_id, status }` |
| `POST` | `/api/tripadvisor/scrape` | Trigger TripAdvisor scrape | `{ source_id, url }` | `{ job_id, status }` |

### Data Management

| Method | Endpoint | Description | Query Params | Response |
|--------|----------|-------------|--------------|----------|
| `GET` | `/api/sources` | List all local source records | `platform`, `limit`, `offset` | `{ sources: [], total }` |
| `GET` | `/api/reviews` | Global review query with filtering | `source_id`, `platform`, `date_from`, `date_to`, `rating`, `page`, `limit` | `{ reviews: [], total, page }` |
| `GET` | `/api/audit` | View system audit logs | `endpoint`, `status`, `limit` | `{ logs: [], total }` |

### System & Admin

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| `GET` | `/api/system/health` | Health check + Job status | `{ status, jobs, pool_status }` |
| `GET` | `/api/db/stats` | Global review statistics | `{ total_reviews, by_platform, by_sentiment }` |
| `POST` | `/api/db/vacuum` | Database maintenance | `{ status, freed_space }` |
| `GET` | `/api/system/jobs` | List active/completed jobs | `{ jobs: [] }` |
| `GET` | `/api/system/pool` | Thread pool status | `{ active, idle, max_workers }` |

---

## 🔄 Callback Mechanism

Upon successful completion of a scrape, the microservice automatically notifies the main backend:

### Callback Flow

```
1. Scraper completes job
       ↓
2. Format review data
       ↓
3. POST to backend callback URL
       ↓
4. Backend acknowledges receipt
       ↓
5. Update job status in scraper_engine DB
```

### Callback Endpoint

```
POST ${BACKEND_API_URL}/source/tasks/{source_id}/sync-complete

Headers:
  Content-Type: application/json

Body:
{
  "source_id": "uuid-from-backend",
  "platform": "booking",
  "status": "completed",
  "reviews_count": 150,
  "scraped_at": "2026-03-31T10:30:00Z",
  "metadata": {
    "duration_seconds": 45,
    "pages_scraped": 15
  }
}
```

### Retry Logic

- **Max Retries**: 3
- **Backoff**: Exponential (1s, 2s, 4s)
- **Timeout**: 30 seconds per attempt
- **Fallback**: Log to audit table for manual review

---

## 🔧 Installation & Setup

### 📋 Prerequisites

- **Python 3.9+**
- **MS SQL Server** with `ODBC Driver 18 for SQL Server`
- **Playwright Chromium**: `playwright install chromium`
- **Git**

### 🚀 Getting Started

#### 1. Clone and Navigate

```bash
cd microservices/scraper_engine
```

#### 2. Install Dependencies

```bash
pip install -r requirements.txt
playwright install chromium
```

#### 3. Configure Environment

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# ============================================
# Database Configuration
# ============================================
DB_DRIVER=ODBC Driver 18 for SQL Server
DB_SERVER=your_server_name_or_ip
DB_NAME=ScraperEngine
DB_UID=sa
DB_PWD=your_secure_password

# ============================================
# Backend Notification
# ============================================
BACKEND_API_URL=http://127.0.0.1:8000

# ============================================
# Scraper Settings
# ============================================
MAX_CONCURRENT_SCRAPES=3
PAGE_TIMEOUT_SECONDS=60
HEADLESS_MODE=true

# ============================================
# Rate Limiting & Scheduler
# ============================================
MAX_QUEUE_SIZE=100           # Max jobs waiting in queue
RATE_LIMIT_SCRAPE=10/minute  # Requests per platform endpoint
RATE_LIMIT_GLOBAL=100/minute # Total API requests allowed
DELAY_GOOGLE=30              # Seconds between Google scrapes
DELAY_AGODA=20               # Seconds between Agoda scrapes
DELAY_BOOKING=20             # Seconds between Booking scrapes
DELAY_TRIPADVISOR=40         # Seconds between TripAdvisor scrapes

# ============================================
# Logging
# ============================================
LOG_LEVEL=INFO
LOG_FILE=scraper_engine.log
```

#### 4. Initialize Database

```bash
# Run schema migration (if needed)
python scripts/maintenance/init_schema.py
```

#### 5. Start Service

```bash
python api/main.py
```

**API Documentation**: http://localhost:8001/docs  
**Alternative Docs**: http://localhost:8001/redoc

---

## 💻 Usage Examples

### Trigger a Scrape

```bash
# Booking.com scrape
curl -X POST http://localhost:8001/api/booking/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "source_id": "550e8400-e29b-41d4-a716-446655440000",
    "url": "https://www.booking.com/hotel/us/example.html"
  }'

# Response:
{
  "job_id": "job_12345",
  "status": "queued",
  "message": "Scrape job initiated"
}
```

### Query Reviews

```bash
# Get all reviews
curl "http://localhost:8001/api/reviews?limit=20&offset=0"

# Filter by platform and rating
curl "http://localhost:8001/api/reviews?platform=booking&min_rating=4&date_from=2026-01-01"

# Get reviews for specific source
curl "http://localhost:8001/api/reviews?source_id=550e8400-e29b-41d4-a716-446655440000"
```

### Check Job Status

```bash
curl http://localhost:8001/api/system/jobs

# Response:
{
  "jobs": [
    {
      "job_id": "job_12345",
      "platform": "booking",
      "status": "completed",
      "progress": 100,
      "reviews_found": 150,
      "started_at": "2026-03-31T10:30:00Z",
      "completed_at": "2026-03-31T10:31:15Z"
    }
  ]
}
```

### View System Health

```bash
curl http://localhost:8001/api/system/health

# Response:
{
  "status": "healthy",
  "jobs": {
    "active": 2,
    "queued": 1,
    "completed_today": 15
  },
  "pool": {
    "active_workers": 2,
    "idle_workers": 1,
    "max_workers": 3
  },
  "database": "connected"
}
```

---

## 🏥 Monitoring

### Health Check Response

```json
{
  "status": "healthy",
  "uptime_seconds": 86400,
  "cpu_usage": 25.5,
  "memory_mb": 512,
  "jobs": {
    "active": 2,
    "queued": 0,
    "failed_today": 1
  },
  "thread_pool": {
    "active": 2,
    "idle": 1,
    "max": 3
  },
  "database": {
    "connected": true,
    "total_reviews": 15420,
    "total_sources": 45
  }
}
```

### Admin Panel Integration

The service integrates with the Admin Panel:

1. Navigate to **Admin Panel → Monitoring**
2. View **Scraping Service** status card
3. See real-time job progress and thread pool status

---

## 🧪 Testing

### Run Integration Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio

# Run all tests
pytest tests/

# Run with coverage
pytest tests/ --cov=. --cov-report=html

# Run specific platform tests
pytest tests/test_booking.py -v
```

### Debug Scripts

```bash
# Check database connectivity
python scripts/debug/check_db_connection.py

# Test scraper without saving
python scripts/debug/test_scraper.py --platform booking --url "https://..."

# View audit logs
python scripts/debug/view_audit_log.py --limit 50
```

---

## 🐛 Troubleshooting

### Playwright Browser Issues

```bash
# Reinstall Chromium
playwright install chromium --force

# Install system dependencies (Linux)
playwright install-deps chromium

# Verify installation
python -c "from playwright.sync_api import sync_playwright; print('OK')"
```

### Database Connection Fails

1. Verify ODBC Driver 18 is installed
2. Check connection string in `.env`
3. Ensure SQL Server is running
4. Test connection:

```bash
python scripts/debug/check_db_connection.py
```

### Scraper Hangs or Times Out

```bash
# Check active jobs
curl http://localhost:8001/api/system/jobs

# Kill stuck job (via admin endpoint)
curl -X POST http://localhost:8001/api/system/jobs/{job_id}/cancel

# Reduce concurrent scrapes in .env
MAX_CONCURRENT_SCRAPES=1
```

### Callback Fails

1. Verify `BACKEND_API_URL` is correct
2. Check backend is running
3. Review audit logs for callback attempts:

```bash
curl "http://localhost:8001/api/audit?endpoint=callback"
```

### High Memory Usage

- Reduce `MAX_CONCURRENT_SCRAPES` in `.env`
- Enable `HEADLESS_MODE=true`
- Restart service periodically
- Consider running in Docker with memory limits

---

## 📝 Development Conventions

### Code Style
- **Python**: PEP 8 compliant
- **Type Hints**: Used throughout codebase
- **Async/Await**: Preferred for I/O operations

### Platform Scraper Structure

```python
# platforms/{platform}/extractor.py
from playwright.sync_api import Page

def extract_reviews(page: Page) -> list[dict]:
    """
    Extract review data from current page.
    Returns list of review dictionaries.
    """
    reviews = []
    # Implementation...
    return reviews

# platforms/{platform}/logic.py
def scrape_reviews(url: str, source_id: str) -> dict:
    """
    Orchestrate full scraping workflow.
    Handles pagination, error handling, and data saving.
    """
    # Implementation...
```

### Git Workflow
- Feature branches: `feature/{platform}-scraper`
- Bug fixes: `fix/{issue}-scraper`
- Commit messages: Conventional Commits format

---

## 📚 Additional Resources

- **[Root README](../../README.md)** - Project overview
- **[Backend Documentation](../../backend/README.md)** - Main API reference
- **[Admin Panel](../../admin-frontend/README.md)** - Scraper orchestration UI
- **[Playwright Docs](https://playwright.dev/)** - Browser automation
- **[FastAPI Docs](https://fastapi.tiangolo.com/)** - API framework

---

## 📄 License

**Private / Proprietary**  
© 2026 Hotel & Restaurant Review Management System
