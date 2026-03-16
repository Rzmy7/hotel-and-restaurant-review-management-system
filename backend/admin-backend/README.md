# Admin Backend

FastAPI service that provides the API required by the admin dashboard page in `admin-frontend`.

## Implemented endpoints

- `GET /health`
- `GET /dashboard/stats`
- `GET /dashboard/usage`
- `GET /dashboard/reviews`
- `GET /dashboard/alerts`
- `GET /dashboard/activities`

These routes match the contract used in `admin-frontend/src/services/dashboardService.ts`.

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
