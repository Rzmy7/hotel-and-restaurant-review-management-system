# System Monitoring API Documentation

## Overview
The admin frontend's monitoring page connects to health endpoints on each backend service to display real-time server status and performance metrics.

## Health Endpoint Specification

Each backend service should implement a `/health` endpoint that returns the following JSON structure:

### Endpoint
```
GET /health
```

### Response Format

```json
{
  "status": "Online",
  "cpu_usage": 45.2,
  "ram_usage": 62.5,
  "uptime": "45d 12h 23m"
}
```

### Response Fields

| Field | Type | Required | Description | Allowed Values |
|-------|------|----------|-------------|----------------|
| `status` | string | Yes | Current server status | "Online", "Offline", "Warning" |
| `cpu_usage` | number | Yes | CPU usage percentage (0-100) | 0.0 - 100.0 |
| `ram_usage` | number | Yes | RAM/Memory usage percentage (0-100) | 0.0 - 100.0 |
| `uptime` | string | No | Server uptime in human-readable format | e.g., "45d 12h 23m" |

### Alternative Field Names
The frontend supports alternative field naming conventions:
- `cpu_usage` or `cpuUsage`
- `ram_usage`, `ramUsage`, `memory_usage`, or `memoryUsage`

### Example Implementations

#### Python (FastAPI)
```python
from fastapi import FastAPI
import psutil
from datetime import datetime

app = FastAPI()
start_time = datetime.now()

@app.get("/health")
async def health_check():
    cpu_usage = psutil.cpu_percent(interval=1)
    ram_usage = psutil.virtual_memory().percent
    uptime = datetime.now() - start_time
    
    # Format uptime
    days = uptime.days
    hours, remainder = divmod(uptime.seconds, 3600)
    minutes, _ = divmod(remainder, 60)
    uptime_str = f"{days}d {hours}h {minutes}m"
    
    return {
        "status": "Online",
        "cpu_usage": round(cpu_usage, 1),
        "ram_usage": round(ram_usage, 1),
        "uptime": uptime_str
    }
```

#### Node.js (Express)
```javascript
const express = require('express');
const os = require('os');

const app = express();
const startTime = Date.now();

app.get('/health', (req, res) => {
  const cpuUsage = os.loadavg()[0] / os.cpus().length * 100;
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const ramUsage = ((totalMem - freeMem) / totalMem) * 100;
  
  const uptime = Date.now() - startTime;
  const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
  const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
  
  res.json({
    status: 'Online',
    cpu_usage: parseFloat(cpuUsage.toFixed(1)),
    ram_usage: parseFloat(ramUsage.toFixed(1)),
    uptime: `${days}d ${hours}h ${minutes}m`
  });
});
```

## CORS Configuration

Ensure your backend services allow CORS requests from the admin frontend:

```python
# Python FastAPI
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Admin frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Timeout Handling

The frontend implements a 5-second timeout for health check requests. If a server doesn't respond within this time, it will be marked as "Offline".

## Error Handling

If the `/health` endpoint returns a non-200 status code or is unreachable:
- The server status will be set to "Offline"
- CPU and RAM usage will be set to 0
- Uptime will be displayed as "N/A"

## Service URLs Configuration

Service URLs can be configured in two ways:

1. **Environment Variables** (`.env` file):
```env
VITE_MAIN_BACKEND_URL=http://localhost:8000
VITE_SCRAPING_URL=http://localhost:8002
VITE_EMBEDDING_SERVICE_URL=http://localhost:8001
VITE_FRONTEND_URL=http://localhost:5173
```

2. **Admin Panel** (API Management page):
   - Users can configure service URLs through the admin UI
   - Settings are stored in browser localStorage
   - Admin panel settings override environment variables

## Auto-Refresh

The monitoring page automatically refreshes server statuses every 10 seconds to provide real-time monitoring.

## Required Services

The monitoring page tracks these services:

1. **Main Backend** - Primary application server
2. **Scraping Service** - Web scraping backend
3. **Embedding Service** - AI/ML embedding processing service
4. **Frontend Server** - Admin panel frontend (Vite dev server or production server)
