# 🕷️ Universal Reviews Scraper Engine Microservice

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Playwright](https://img.shields.io/badge/Playwright-Chromium-2EAD33?style=for-the-badge&logo=google-chrome&logoColor=white)](https://playwright.dev/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-Consumer-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white)](https://www.sqlalchemy.org/)

The **Universal Reviews Scraper Engine** is a high-reliability distributed scraping microservice engineered to extract, normalize, deduplicate, and persist customer reviews from **Google Maps**, **TripAdvisor**, **Booking.com**, and **Agoda**.

---

## 🌟 Core Architectural Features

| Capability | Technical Implementation |
|---|---|
| **Multi-Platform Support** | Dedicated scraping pipelines for **Google Maps**, **TripAdvisor**, **Booking.com**, and **Agoda** |
| **Browser Automation** | **Playwright with Headless Chromium**, dynamic scrolling, viewport emulation, and anti-bot evasion |
| **Asynchronous Job Brokering** | Persistent **RabbitMQ Consumer Worker** for background distributed job execution |
| **Automated URL Resolution** | Resolves property names/search queries into canonical platform review URLs |
| **Deep Trait Deduplication** | Fingerprint deduplication combining author names, ratings, publication timestamps, and content hashes |
| **Domain-Aware Rate Limiting** | Two-tier throttling preventing IP bans and target domain blacklisting |
| **Savepoints & Recovery** | Individual review batch commits ensuring zero data loss during network hiccups |
| **Audit & Callback Hooks** | Dispatches webhook completion events directly back to the FastAPI backend API |

---

## 🏗️ Directory Structure

```
microservices/scraper_engine/
├── api/
│   ├── main.py                       # FastAPI application entry point
│   ├── endpoints/
│   │   ├── scrape.py                 # POST /api/{platform}/scrape (Trigger manual/async scrape)
│   │   ├── resolution.py             # POST /api/resolve (Resolve property URL from query)
│   │   ├── sources.py                # GET /api/sources (Manage registered scrapable sources)
│   │   ├── reviews.py                # GET /api/reviews (Query normalized ingested reviews)
│   │   ├── db_admin.py               # Database stats, cleanup, and maintenance
│   │   └── system.py                 # Health diagnostics, job statuses, worker pool telemetry
│   └── middleware/
│       └── audit_middleware.py       # Global request/response logging & latency tracking
│
├── core/
│   ├── config.py                     # Environment settings and logging setup
│   ├── database.py                   # SQLAlchemy connection pool
│   ├── models.py                     # Normalized Review and Source entity models
│   ├── consumer.py                   # Persistent RabbitMQ Background Consumer Thread
│   ├── scrape_pool.py                # ThreadPoolExecutor managing concurrent browser instances
│   ├── throttler.py                  # Domain-aware request rate limiter
│   └── deduplication/                # Platform deduplication algorithms:
│       ├── agoda_deduplicator.py
│       ├── booking_deduplicator.py
│       ├── google_deduplicator.py
│       └── tripadvisor_deduplicator.py
│
├── platforms/                        # Platform-Specific Scraping Engines:
│   ├── agoda/                        # Agoda Playwright browser, logic & DOM extractor
│   ├── booking/                      # Booking.com Playwright browser, logic & DOM extractor
│   ├── google/                       # Google Maps browser automation & review parser
│   └── tripadvisor/                  # TripAdvisor browser automation & review parser
│
├── Dockerfile                        # Production container with Playwright & Chromium dependencies
└── requirements.txt                  # Python dependencies
```

---

## 📡 API Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/{platform}/scrape` | Trigger scraping job for `google`, `tripadvisor`, `booking`, or `agoda` |
| `POST` | `/api/resolve` | Resolve property query string into validated OTA URL |
| `GET` | `/api/reviews` | Query normalized reviews filtered by source ID, date, rating |
| `POST` | `/api/sources/{id}/cleanup` | Execute trait deduplication and purge duplicate entries |
| `GET` | `/api/system/health` | Service health, RabbitMQ status, and worker pool capacity |
| `GET` | `/api/system/jobs` | Live status of active and recently completed scraping tasks |

---

## ⚙️ Environment Variables (`.env`)

```env
# Database Credentials (MSSQL)
DB_DRIVER=ODBC Driver 18 for SQL Server
DB_SERVER=localhost
DB_NAME=ReviewManagementDB
DB_UID=sa
DB_PWD=YourPassword123

# Core Backend Callback
BACKEND_API_URL=http://localhost:8000
INTERNAL_API_KEY=your-internal-microservice-shared-key

# RabbitMQ Task Broker
RABBITMQ_URL=amqp://guest:guest@localhost:5672/

# Browser Execution Settings
HEADLESS=true
MAX_CONCURRENT_SCRAPERS=4
BROWSER_TIMEOUT_MS=60000
```

---

## 🚀 Running the Scraper Engine

```bash
# 1. Activate environment
cd microservices/scraper_engine
python -m venv venv
venv\Scripts\activate

# 2. Install dependencies and Playwright Chromium
pip install -r requirements.txt
playwright install chromium

# 3. Start Scraper API and RabbitMQ Consumer
python api/main.py
```
- **OpenAPI Interactive Documentation**: `http://localhost:8001/docs`
