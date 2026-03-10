# System Monitoring - API Ready Implementation

## Overview
The System Monitoring page in the admin frontend is now fully API-ready and connects to real backend health check endpoints to display live server status and performance metrics.

## What Was Implemented

### 1. Frontend Service Layer
Created **`monitoringService.ts`** ([admin-frontend/src/services/monitoringService.ts](admin-frontend/src/services/monitoringService.ts))
- Fetches health status from all backend services
- Supports configurable service URLs via environment variables or localStorage
- Implements 5-second timeout for health checks
- Handles errors gracefully with automatic fallback to "Offline" status
- Monitors 4 services:
  - Main Backend
  - Scraping Service  
  - Embedding Service
  - Frontend Server

### 2. Updated Monitoring Page
Updated **`Monitoring.tsx`** ([admin-frontend/src/pages/Monitoring.tsx](admin-frontend/src/pages/Monitoring.tsx))
- Uses real API service instead of mock data
- Implements error handling with user-friendly alerts
- Auto-refreshes every 10 seconds
- Shows real-time CPU/RAM usage and uptime

### 3. Backend Health Endpoints

#### Embedding Service
- Added `/health` endpoint to [backend/embedding-service/app/main.py](backend/embedding-service/app/main.py)
- Returns real CPU/RAM metrics using `psutil`
- Includes service pause status
- Added `psutil` to requirements.txt

#### Main Backend Template  
- Created reusable health check module: [backend/app/health.py](backend/app/health.py)
- Can be easily integrated into any FastAPI application
- Provides intelligent status determination (Online/Warning/Offline)

### 4. Configuration

#### Environment Variables
Updated [admin-frontend/.env.example](admin-frontend/.env.example):
```env
VITE_MAIN_BACKEND_URL=http://localhost:8000
VITE_SCRAPING_URL=http://localhost:8002
VITE_EMBEDDING_SERVICE_URL=http://localhost:8001
VITE_FRONTEND_URL=http://localhost:5173
```

#### Runtime Configuration
- Service URLs can be configured through Admin Panel → API Management
- Admin panel settings override environment variables
- Settings stored in browser localStorage

### 5. Documentation
Created **`MONITORING_API.md`** ([admin-frontend/MONITORING_API.md](admin-frontend/MONITORING_API.md))
- Complete API specification for health endpoints
- Example implementations in Python (FastAPI) and Node.js (Express)
- CORS configuration guide
- Error handling documentation

## API Endpoint Specification

### Request
```
GET /health
```

### Response
```json
{
  "status": "Online",
  "cpu_usage": 45.2,
  "ram_usage": 62.5,
  "uptime": "45d 12h 23m"
}
```

### Status Values
- **Online**: Normal operation
- **Warning**: High resource usage (CPU/RAM ≥ 90%) or service issues
- **Offline**: Server unreachable or not responding

## How to Use

### 1. Install Dependencies

**Embedding Service:**
```bash
cd backend/embedding-service
pip install -r requirements.txt
```

**Main Backend:**
```bash
cd backend
pip install -r requirements.txt
```

### 2. Add Health Endpoint to Main Backend

```python
# In backend/app/main.py
from app.health import router as health_router

app = FastAPI()
app.include_router(health_router)
```

### 3. Configure Service URLs

**Option A: Environment Variables**
Create `.env` file in `admin-frontend/`:
```env
VITE_MAIN_BACKEND_URL=http://localhost:8000
VITE_SCRAPING_URL=http://localhost:8002
VITE_EMBEDDING_SERVICE_URL=http://localhost:8001
```

**Option B: Admin Panel**
1. Navigate to Admin Panel → API Management
2. Enter service URLs
3. Click Save

### 4. Start Services

```bash
# Embedding Service
cd backend/embedding-service
uvicorn app.main:app --reload --port 8001

# Main Backend
cd backend
uvicorn app.main:app --reload --port 8000

# Admin Frontend
cd admin-frontend
npm run dev
```

### 5. View Monitoring

Navigate to Admin Panel → Monitoring to see live server status!

## Features

✅ **Real-time Monitoring**: Auto-refreshes every 10 seconds  
✅ **Live Metrics**: CPU usage, RAM usage, uptime  
✅ **Visual Status Indicators**: Color-coded badges with animations  
✅ **Error Handling**: Graceful fallback when servers are offline  
✅ **Configurable**: Environment variables or UI-based configuration  
✅ **Timeout Protection**: 5-second timeout prevents hanging requests  
✅ **Multi-Service**: Monitors 4 different backend services  

## Architecture

```
┌─────────────────┐
│  Admin Frontend │
│  (Port 5173)    │
└────────┬────────┘
         │
         │ Fetches /health every 10s
         │
         ├──────────────────┬──────────────────┬────────────────┐
         │                  │                  │                │
         ▼                  ▼                  ▼                ▼
┌─────────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Main Backend   │ │   Scraping   │ │  Embedding   │ │   Frontend   │
│  (Port 8000)    │ │  (Port 8002) │ │ (Port 8001)  │ │ (Port 5173)  │
│                 │ │              │ │              │ │              │
│  GET /health    │ │ GET /health  │ │ GET /health  │ │ GET /health  │
└─────────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

## Next Steps

1. **Implement Health Endpoint in Scraping Service** - Use the template from `backend/app/health.py`
2. **Add Frontend Health Endpoint** - Add a simple health check to the Vite server or production build
3. **Configure CORS** - Ensure all backend services allow requests from admin frontend
4. **Production Deployment** - Update service URLs for production environment

## Troubleshooting

### Server Shows as Offline
- Verify the service is running
- Check the service URL in API Management
- Ensure CORS is configured correctly
- Check browser console for network errors

### High CPU/RAM Warning
- Optimize service performance
- Scale resources if needed
- The system automatically shows "Warning" status when resources ≥ 90%

### Timeout Errors
- Default timeout is 5 seconds
- Ensure services respond quickly to health checks
- Check network connectivity

## Dependencies Added

- **`psutil`** - System and process utilities for CPU/RAM monitoring
  - Added to `backend/requirements.txt`
  - Added to `backend/embedding-service/requirements.txt`

## Files Created/Modified

### Created:
- `admin-frontend/src/services/monitoringService.ts`
- `admin-frontend/MONITORING_API.md`
- `backend/app/health.py`
- This README

### Modified:
- `admin-frontend/src/pages/Monitoring.tsx`
- `admin-frontend/.env.example`
- `backend/embedding-service/app/main.py`
- `backend/embedding-service/requirements.txt`
- `backend/requirements.txt`
