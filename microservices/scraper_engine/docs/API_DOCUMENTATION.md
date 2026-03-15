# Scraper Engine — Full API Reference

Base URL: `http://127.0.0.1:8000`

---

## 1. Organizations (`/api/v1/organizations`)

### `POST /api/v1/organizations`
Create an organization with optional source URLs in a single call.

**Request Body:**
```json
{
  "organization_name": "Hilton Colombo",
  "sources": [
    {"platform": "Booking", "url": "https://www.booking.com/hotel/lk/hilton.html"},
    {"platform": "Agoda",   "url": "https://www.agoda.com/hilton-colombo"},
    {"platform": "Google",  "url": "https://maps.app.goo.gl/abc123"}
  ]
}
```
**Response:**
```json
{
  "status": "created",
  "organization_id": 1,
  "organization_name": "Hilton Colombo",
  "linked_sources": [
    {"organization_source_id": 1, "platform": "Booking", "url": "..."},
    {"organization_source_id": 2, "platform": "Agoda", "url": "..."},
    {"organization_source_id": 3, "platform": "Google", "url": "..."}
  ]
}
```

### `GET /api/v1/organizations`
List all organizations with source counts and total reviews.
- **Query Params:** `limit` (default 100), `skip` (default 0)

### `GET /api/v1/organizations/{id}`
Get organization details with all linked sources and per-platform review counts.

### `PUT /api/v1/organizations/{id}`
Update organization name.
- **Body:** `{"organization_name": "New Name"}`

### `DELETE /api/v1/organizations/{id}`
Delete organization. Cascades to all linked sources and reviews.

---

## 2. Organization Sources

### `GET /api/v1/organizations/{id}/sources`
List all linked platform sources for an organization.

### `POST /api/v1/organizations/{id}/sources`
Link a platform URL to an organization. Updates URL if platform already linked.
- **Body:** `{"platform": "Agoda", "url": "https://..."}`
- **Platforms:** `Agoda`, `Booking`, `Google` (case-sensitive)

### `DELETE /api/v1/organizations/{id}/sources/{platform}`
Unlink a platform from an organization. Cascade-deletes all reviews for that source.
- **Path Param:** `platform` — case-insensitive (`agoda`, `Booking`, etc.)

---

## 3. Organization Reviews & Stats

### `GET /api/v1/organizations/{id}/reviews`
Get all reviews for an organization across all platforms.
- **Query Params:** `platform` (optional filter), `limit`, `skip`
- **Response includes** platform-specific subtype data (agoda/booking/google fields)

### `GET /api/v1/organizations/{id}/stats`
Per-organization analytics.
```json
{
  "organization_id": 1,
  "organization_name": "Hilton Colombo",
  "total_reviews": 250,
  "overall_average_rating": 8.45,
  "platforms": {
    "agoda":   {"reviews": 100, "average_rating": 8.2, "last_synced": "..."},
    "booking": {"reviews": 120, "average_rating": 8.7, "last_synced": "..."},
    "google":  {"reviews": 30,  "average_rating": 4.3, "last_synced": null}
  }
}
```

---

## 4. Organization Scraping

### `POST /api/v1/organizations/{id}/scrape`
Scrape ALL linked sources simultaneously via the thread pool.
- **Body:** `{"headless": true, "pages": "*"}`
- **Response includes** `jobs` array with per-platform `job_id` and `pool` status

### `POST /api/v1/organizations/{id}/scrape/{platform}`
Scrape a specific platform only (e.g., `/scrape/agoda`).

---

## 5. Global Reviews (`/api/v1/reviews`)

### `GET /api/v1/reviews`
Query reviews across ALL organizations and platforms.
- **Query Params:**
  - `platform` — filter by platform name
  - `organization_id` — filter by org
  - `min_rating` / `max_rating` — rating range
  - `author` — partial match on author name
  - `limit`, `skip` — pagination

### `GET /api/v1/reviews/{review_id}`
Single review with full detail including platform subtype data.

### `DELETE /api/v1/reviews/{review_id}`
Delete a single review (cascades to media and subtype).

---

## 6. Platform Scrapers (Backward Compatible)

These endpoints use the same thread pool as organization-level scraping.

### Agoda
- `POST /agoda/scrape` — Body: `{"url": "...", "headless": true, "pages": "1"}`
- `GET /agoda/reviews` — Query: `hotel_url`, `limit`, `skip`

### Booking.com
- `POST /booking/scrape` — Body: `{"url": "...", "headless": true, "pages": "1"}`
- `GET /booking/reviews` — Query: `hotel_url`, `limit`, `skip`

### Google Maps
- `POST /google/scrape` — Body: `{"url": "...", "headless": true, "pages": "*"}`
- `GET /google/reviews` — Query: `place_url`, `limit`, `skip`
- **Note:** Requires a pre-configured Playwright Chrome profile with Google sign-in. Run `python tests/setup_google_profile.py` first.

---

## 7. Sources / Platforms (`/api/v1/sources`)

### `GET /api/v1/sources`
List all registered platforms with review counts and linked organization counts.
```json
{
  "total": 3,
  "data": [
    {"source_id": 1, "platform_name": "Agoda", "base_url": "https://www.agoda.com", "linked_organizations": 5, "total_reviews": 1400},
    {"source_id": 2, "platform_name": "Booking", "base_url": "https://www.booking.com", "linked_organizations": 3, "total_reviews": 850},
    {"source_id": 3, "platform_name": "Google", "base_url": "https://maps.google.com", "linked_organizations": 1, "total_reviews": 30}
  ]
}
```

### `GET /api/v1/sources/{source_id}`
Get platform details with all linked organizations.

---

## 8. Database Administration (`/api/v1/db`)

### `GET /api/v1/db/stats`
Global review statistics with per-platform breakdown.
```json
{
  "total_organizations": 5,
  "total_reviews": 2280,
  "total_media": 450,
  "platforms": {
    "agoda":   {"organizations": 5, "reviews": 1400},
    "booking": {"organizations": 3, "reviews": 850},
    "google":  {"organizations": 1, "reviews": 30}
  }
}
```

### `DELETE /api/v1/db/reviews/{platform}`
Purge all reviews for a platform (e.g., `agoda`, `booking`, `google`).

### `DELETE /api/v1/db/organizations/{platform}`
Remove all organization-source links for a platform.

### `POST /api/v1/db/vacuum`
Executes `DBCC SHRINKDATABASE(0)` on the SQL Server instance.

---

## 9. System Monitoring (`/api/v1/system`)

### `GET /api/v1/system/health`
Readiness probe with DB connection check and thread pool status.
```json
{
  "status": "online",
  "uptime_seconds": 3600.5,
  "database_connected": true,
  "active_jobs": 2,
  "pool": {"max_workers": 7, "active_jobs": 2, "queued_jobs": 3, "total_pending": 5}
}
```

### `GET /api/v1/system/jobs`
Lists all currently active (pending/running) jobs with pool status.

### `GET /api/v1/system/jobs/all`
Lists ALL jobs including completed and failed.

### `GET /api/v1/system/pool`
Thread pool statistics: max workers, active, queued, total pending.

### `PUT /api/v1/system/pool`
Change max concurrent workers at runtime.
- **Body:** `{"max_workers": 10}`
- **Range:** 1–50

### `GET /api/v1/system/metrics`
Environment info: Python version, OS platform, CPU count, pool max workers.

---

## 10. Real-Time WebSocket (`/api/v1/ws`)

### `WS /api/v1/ws/jobs/{job_id}`
Bidirectional streaming hook for live scrape progress.

**Connect:** `ws://127.0.0.1:8000/api/v1/ws/jobs/<job_id>`

**Streamed payload (every ~1 second):**
```json
{
  "id": "abc-123",
  "platform": "agoda",
  "url": "https://...",
  "status": "running",
  "progress": "Extracting reviews on page 3...",
  "current_page": 3,
  "total_pages": 57,
  "reviews_extracted": 30,
  "total_reviews": 570,
  "percentage": 5.3,
  "created_at": "2026-03-09T22:00:00"
}
```

Stream closes automatically when `status` is `completed` or `failed`.
