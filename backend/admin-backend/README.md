# Admin Backend

FastAPI service that provides the API required by the admin dashboard page in `admin-frontend`.

This backend is wired to **real SQL Server data** (no static mock payloads).

## Implemented endpoints

- `GET /health`
- `GET /dashboard/stats`
- `GET /dashboard/usage`
- `GET /dashboard/reviews`
- `GET /dashboard/alerts`
- `GET /dashboard/activities`
- `GET /monitoring/admin-backend-status`
- `GET /monitoring/admin-backend-usage`
- `GET /monitoring/scraping/platforms` (platforms from SQL database)
- `POST /monitoring/scraping/platforms` (create platform in SQL `sources`)
- `GET /monitoring/scraping/stats` (proxied from scraping backend runtime APIs)
- `GET /monitoring/scraping/jobs` (proxied from scraping backend runtime APIs)

These routes match the contract used in `admin-frontend/src/services/dashboardService.ts`.

## Database configuration

Create a `.env` file in this folder (or copy `.env.example`) and set:

```ini
DB_DRIVER=ODBC Driver 17 for SQL Server
DB_SERVER=localhost
DB_NAME=L2_Project_DB
DB_UID=sa
DB_PWD=your_password
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174
SCRAPING_BACKEND_URL=http://localhost:8001
```

The query strategy is aligned with your existing backend test routes in `backend/app/test/api/review_api.py`.

## Run locally (Windows PowerShell)

```powershell
cd backend/admin-backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs: `http://localhost:8000/docs`

## Frontend connection

The admin frontend already calls the main backend URL from `localStorage.mainBackendUrl` or falls back to `http://localhost:8000`, so this service works out of the box.

If needed, set in browser console:

```js
localStorage.setItem('mainBackendUrl', 'http://localhost:8000')
```
