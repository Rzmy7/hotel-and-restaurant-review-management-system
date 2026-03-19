# Scraper Engine — Full API Reference (v4.0.0)

Base URL: `http://127.0.0.1:8001`

---

## 1. Scrapers

Trigger a background scrape job for a specific platform.

### `POST /api/[platform]/scrape`
**Platforms:** `agoda`, `booking`, `google`, `tripadvisor`

**Request Body:**
```json
{
  "source_id": "9fc93611-d9c8-4b84-ae2e-6a42a58467fa",
  "source_url": "https://www.agoda.com/example-hotel",
  "headless": true,
  "pages": "1"
}
```

**Response:**
```json
{
  "status": "queued",
  "job_id": "job_1234567890",
  "source_id": "9fc93611-d9c8-4b84-ae2e-6a42a58467fa",
  "platform": "agoda",
  "pool": {
    "max_workers": 7,
    "active_jobs": 1,
    "queued_jobs": 0
  }
}
```

---

## 2. Sources (`/api/sources`)

Manage the local registry of scrape targets.

### `GET /api/sources`
List all known sources with their local review counts.
- **Query Params:** `limit` (default 100), `skip` (default 0)

### `GET /api/sources/{source_id}`
Get details for a single source.

### `DELETE /api/sources/{source_id}`
Delete a source and cascade-delete all associated reviews and media.

---

## 3. Reviews (`/api/reviews`)

Retrieve scraped review data.

### `GET /api/reviews/{source_id}`
Get all reviews for a specific source ID, including platform-specific details and media.
- **Query Params:** `limit`, `skip`

**Response Example:**
```json
{
  "source_id": "9fc93611-d9c8-4b84-ae2e-6a42a58467fa",
  "platform": "agoda",
  "total": 150,
  "data": [
    {
      "review_id": 1,
      "platform": "agoda",
      "detail": {
        "rating": 9.2,
        "author": "John Doe",
        "review_text": "Great stay!",
        "reviewer_nationality": "United Kingdom"
      },
      "media": [
        {"url": "https://...", "type": "image"}
      ]
    }
  ]
}
```

---

## 4. Audit Logs (`/api/audit`)

### `GET /api/audit`
Query the system audit log for scrape events, API calls, and errors.
- **Query Params:** `category`, `level`, `limit`, `skip`

---

## 5. Database & System

### `GET /api/db/stats`
Global statistics across all platforms.

### `POST /api/db/vacuum`
Perform database maintenance (SQL Server shrink).

### `GET /api/system/health`
Check service status, database connectivity, and thread pool availability.

---

## 6. Callback Mechanism

The scraper microservice notifies the backend upon job completion.

**Callback URL:** `${BACKEND_API_URL}/source/tasks/{source_id}/sync-complete`
**Method:** `POST`
