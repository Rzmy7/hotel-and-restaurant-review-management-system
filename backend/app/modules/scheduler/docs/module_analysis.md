# Module Analysis: Scheduler Module

## 1. Module Overview

### What & Why
The `scheduler` module is the background task orchestration engine of the Hotel and Restaurant Review Management System. It uses **APScheduler (AsyncIO Scheduler)** to manage periodic background jobs that handle review synchronization, notification broadcasting, and scraper job reconciliation.

It exists to:
- **Synchronize**: Automatically trigger review scraping for sources on their configured schedules
- **Broadcast**: Send scheduled notifications/announcements to users at specified times
- **Reconcile**: Detect and recover from scraper engine failures by identifying stuck jobs
- **Automate**: Eliminate manual intervention for routine background operations

### When
The module runs continuously as a background service, with tasks triggered on fixed intervals:
1. **Every Minute**: Check for pending sync tasks and broadcasts ready to send
2. **Periodically**: Reconcile scraper jobs to detect failures (interval configurable)
3. **Application Startup**: Scheduler starts when FastAPI application initializes
4. **Application Shutdown**: Scheduler gracefully shuts down with the application

---

## 2. Architecture & Structure

### File Tree
```
scheduler/
├── __init__.py                         # Module initialization
├── services/
│   ├── __init__.py                     # Service exports
│   └── scheduler_service.py            # APScheduler lifecycle management
└── tasks/
    ├── __init__.py                     # Task exports
    ├── sync_tasks.py                   # Review synchronization tasks
    ├── broadcasting_tasks.py           # Notification broadcast tasks
    └── reconciliation_tasks.py         # Scraper job reconciliation
```

### Module Responsibilities
| File | Purpose |
|------|---------|
| `scheduler_service.py` | Manages APScheduler instance lifecycle (start/stop) |
| `sync_tasks.py` | Scheduled tasks for triggering review scraping |
| `broadcasting_tasks.py` | Scheduled tasks for sending notifications |
| `reconciliation_tasks.py` | Detects and recovers from stuck scraper jobs |

---

## 3. APScheduler Configuration

### Scheduler Instance
```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()  # Single global instance
```

### Lifecycle Management

#### `start_scheduler()`
- **Purpose**: Start the background task scheduler
- **Behavior**: 
  - Checks if already running to prevent duplicate starts
  - Calls `scheduler.start()` to begin processing jobs
  - Logs startup message
- **Called From**: FastAPI application startup event (in `app/main.py`)

#### `stop_scheduler()`
- **Purpose**: Gracefully shut down the scheduler
- **Behavior**:
  - Checks if running before shutdown
  - Calls `scheduler.shutdown()` to stop all scheduled jobs
  - Logs shutdown message
- **Called From**: FastAPI application shutdown event (in `app/main.py`)

### Job Scheduling Configuration
**Note**: Jobs are scheduled in `app/main.py` during startup, not within this module. The typical schedule is:

| Task | Function | Schedule | Trigger Type |
|------|----------|----------|--------------|
| Sync Check | `process_pending_syncs()` | Every 1 minute | `interval(minutes=1)` |
| Broadcast Check | `process_pending_broadcasts()` | Every 1 minute | `interval(minutes=1)` |
| Job Reconciliation | `reconcile_scraper_jobs()` | Every 5 minutes | `interval(minutes=5)` |

---

## 4. Scheduled Tasks

### 4.1 Sync Tasks (`sync_tasks.py`)

**Purpose**: Manage automated review scraping synchronization.

#### `trigger_platform_scrape(platform_name, url, source_id)`
- **Signature**: `(platform_name: str, url: str, source_id: str) -> bool`
- **Purpose**: Trigger the scraper microservice for a specific platform
- **Platform Key Mapping**:
  - Converts platform names to API endpoints:
    - `"Google Reviews"` → `"google"`
    - `"Booking.com"` → `"booking"`
    - Removes `" reviews"` and `".com"` substrings
- **Endpoint**: `POST {SCRAPER_API_BASE_URL}/api/{platform_key}/scrape`
- **Payload**:
  ```json
  {
    "source_id": "uuid",
    "source_url": "https://...",
    "headless": true,
    "pages": "*"
  }
  ```
- **Timeout**: 20 seconds
- **Returns**: `true` on success, `false` on failure (logs error)
- **Error Handling**: Catches both HTTPError and generic Exception

#### `process_pending_syncs()`
- **Signature**: `()` (no parameters, scheduled task)
- **Purpose**: Find pending sources and trigger their sync
- **Schedule**: Runs every minute
- **Flow**:
  1. Get current UTC time
  2. Query for active sources where `next_synced_at <= now_utc`
  3. For each pending source:
     - Verify platform linkage (skip if missing)
     - Call `trigger_platform_scrape()` with platform details
     - Timestamps updated via callback to `/source/tasks/{source_id}/sync-complete`
- **Database Query**:
  ```python
  db.query(Source).options(
      joinedload(SourceSource.platform)
  ).filter(
      SourceSource.source_status == 'active',
      SourceSource.next_synced_at <= now_utc
  ).all()
  ```
- **Status Filter**: Only processes sources with `source_status = 'active'`
- **Error Handling**: Logs errors, closes DB session in finally block
- **Logging**: Reports count of pending sources and individual triggers

### 4.2 Broadcasting Tasks (`broadcasting_tasks.py`)

**Purpose**: Process pending broadcast events and send notifications.

#### `process_pending_broadcasts()`
- **Signature**: `()` (no parameters, scheduled task)
- **Purpose**: Find pending broadcasts ready to send and deliver notifications
- **Schedule**: Runs every minute
- **Timezone Handling**:
  - Fetches system timezone from `dbo.system_settings`
  - Converts UTC time to system timezone for accurate scheduled time comparison
  - Uses `_get_timezone_offset()` helper to calculate offset

- **Flow**:
  1. Connect to database via pyodbc
  2. Ensure `broadcast_event` and notifications tables exist
  3. Get system timezone setting
  4. Calculate current time in system timezone
  5. Query for pending broadcasts where `scheduled_at <= now_in_system_tz`
  6. For each ready broadcast:
     - Get recipient IDs based on audience configuration
     - If channel is `"notification"` or `"both"`:
       - Call `create_notifications()` for all recipients
     - Update broadcast status to `'sent'` with `sent_at` timestamp
  7. Commit all changes
  8. Log success/failure counts

- **Database Query**:
  ```sql
  SELECT broadcast_id, subject, body, channel,
         audience_type, audience_value, audience_label,
         message_type, recipient_count, status,
         schedule_type, scheduled_at, sent_at, sent_by, created_at
  FROM dbo.broadcast_event
  WHERE status = 'pending'
    AND scheduled_at IS NOT NULL
    AND scheduled_at <= ?
  ORDER BY scheduled_at ASC
  ```

- **Audience Types** (handled by `get_recipient_ids()`):
  - All users
  - Specific organization members
  - Specific user IDs
  - Role-based targeting

- **Error Handling**:
  - Per-broadcast try/catch (continues processing on individual failures)
  - Updates failed broadcasts to status `'failed'`
  - Rolls back entire transaction on catastrophic failure
  - Closes connection in finally block

- **Logging**: Reports counts of sent and failed broadcasts

#### `_get_timezone_offset(tz_name, utc_dt)` (Internal Helper)
- **Signature**: `(tz_name: str, utc_dt: datetime) -> timedelta`
- **Purpose**: Calculate timezone offset for accurate time comparison
- **Flow**:
  1. Create ZoneInfo object for target timezone
  2. Convert UTC datetime to local datetime
  3. Calculate offset between local and UTC times
  4. Return timedelta
- **Fallback**: Returns `timedelta(0)` (UTC) on any error
- **Used For**: Converting system timezone scheduled_at to UTC for comparison

### 4.3 Reconciliation Tasks (`reconciliation_tasks.py`)

**Purpose**: Detect and recover from scraper engine job failures.

#### `reconcile_scraper_jobs()`
- **Signature**: `()` (no parameters, scheduled task)
- **Purpose**: Find stuck jobs in backend and cross-reference with Scraper Engine's active jobs
- **Schedule**: Typically every 5 minutes (configured in main.py)
- **Problem Solved**: When Scraper Engine crashes or loses track of jobs, backend still shows them as `running` or `queued`

- **Flow**:
  1. Query backend for "stuck" sources (status in `['running', 'queued']` beyond expected time)
  2. If no stuck sources, return early
  3. Contact Scraper Engine: `GET {SCRAPER_ENGINE_URL}api/system/jobs`
  4. Extract active job source IDs from response
  5. For each stuck source:
     - Check if source_id is in active jobs list
     - If NOT active in Scraper Engine:
       - Update source status to `FAILED` with error message
       - Log the reconciliation action
  6. Log total count of failed sources
- **Scraper Engine Response Format**:
  ```json
  {
    "jobs": {
      "job_id_1": {"source_id": "uuid", ...},
      "job_id_2": {"source_id": "uuid", ...}
    }
  }
  ```
- **Timeout**: 10 seconds for Scraper Engine health check
- **Error Handling**:
  - Returns early if Scraper Engine unreachable (logs warning)
  - Continues processing on individual source failures
  - Logs detailed errors for debugging
  - Closes DB session in finally block

---

## 5. Services

### Scheduler Service (`scheduler_service.py`)

**Purpose**: APScheduler instance lifecycle management.

#### Service Functions

##### `start_scheduler()`
- **Signature**: `() -> None`
- **Purpose**: Start the APScheduler background scheduler
- **Guard**: Checks `scheduler.running` to prevent duplicate starts
- **Called From**: `app/main.py` startup event
- **Logging**: INFO level on successful start

##### `stop_scheduler()`
- **Signature**: `() -> None`
- **Purpose**: Gracefully shutdown the APScheduler
- **Guard**: Checks `scheduler.running` before shutdown
- **Called From**: `app/main.py` shutdown event
- **Logging**: INFO level on successful shutdown

---

## 6. Integrations with Other Modules

### Source Module
- **Models**: Imports `Source` model (aliased as `SourceSource` for backward compatibility)
- **Service**: Calls `update_sync_status()` to update source synchronization status
- **Service**: Calls `get_stuck_sources()` to find sources needing reconciliation
- **Schemas**: Uses `SyncStatus` and `SyncStatusRequest` for status updates
- **Database**: Queries `source` table for pending and stuck sources

### Scraper Engine (Microservice)
- **Sync Tasks**: `POST {SCRAPER_API_BASE_URL}/api/{platform_key}/scrape`
  - Triggers platform-specific scraping
  - Sends source_id, source_url, headless flag, and pages parameter
- **Reconciliation**: `GET {SCRAPER_ENGINE_URL}api/system/jobs`
  - Retrieves active jobs list for cross-referencing
  - Used to detect orphaned/failed jobs

### Admin Module
- **Broadcasting Service**: Calls `create_notifications()`, `ensure_broadcast_events_table()`, `ensure_notifications_schema()`, `get_recipient_ids()`
- **System Settings**: Calls `get_system_timezone()` for timezone-aware scheduling
- **Database**: Writes to `broadcast_event` and notifications tables

### Database
- **SQLAlchemy**: Uses `SessionLocal` for ORM queries in sync and reconciliation tasks
- **PyODBC**: Uses direct connections for broadcast processing (for table creation and complex queries)
- **Tables Used**:
  - `source` - Source metadata and sync status
  - `platform` - Platform information (eager loaded)
  - `broadcast_event` - Scheduled broadcasts
  - `system_settings` - System timezone configuration

---

## 7. Configuration & Environment Variables

### Environment Variables

| Variable | Default | Description | Used In |
|----------|---------|-------------|---------|
| `SCRAPER_API_URL` | `http://127.0.0.1:8001` | Base URL for Scraper Engine microservice (sync tasks) | `sync_tasks.py` |
| `SCRAPER_ENGINE_URL` | `http://127.0.0.1:8001/` | Base URL for Scraper Engine (reconciliation, with trailing slash) | `reconciliation_tasks.py` |

**Note**: Two separate env vars for Scraper Engine URL is a **minor inconsistency** - they default to the same value but could diverge.

### System Settings (from `dbo.system_settings`)

| Setting Key | Type | Purpose |
|-------------|------|---------|
| `timezone` | string (IANA) | System timezone for broadcast scheduling (e.g., "Asia/Colombo") |

### Implicit Configuration

- **Schedule Intervals**: Configured in `app/main.py` during scheduler setup
- **Sync Timeout**: 20 seconds for scraper API calls
- **Reconciliation Timeout**: 10 seconds for jobs API calls
- **Database Connection**: SQLAlchemy `SessionLocal` for ORM, pyodbc for broadcast processing

---

## 8. Code Review: Flaws & Technical Debt

### Inconsistent Scraper Engine URLs
> [!WARNING]
> **Configuration Risk**: Two separate environment variables (`SCRAPER_API_URL` and `SCRAPER_ENGINE_URL`) with the same default value.
- **Location**: `sync_tasks.py` line 13 vs `reconciliation_tasks.py` line 10
- **Risk**: Could diverge in different environments, causing confusion
- **Recommendation**: Use single `SCRAPER_ENGINE_URL` env var everywhere

### Mixed Database Access Patterns
> [!CAUTION]
> **Technical Debt**: Module uses both SQLAlchemy ORM (`sync_tasks.py`, `reconciliation_tasks.py`) and raw pyodbc (`broadcasting_tasks.py`).
- **Risk**: Inconsistent connection management, harder testing
- **Broadcasting**: Justifies pyodbc for dynamic table creation, but should migrate to ORM eventually
- **Recommendation**: Standardize on SQLAlchemy ORM where possible

### Timezone Conversion Complexity
The `_get_timezone_offset()` function performs manual timezone conversion:
- **Issue**: Creates datetime objects with `.replace(tzinfo=None)` then re-adds timezone (error-prone)
- **Risk**: Could produce incorrect offsets during DST transitions
- **Recommendation**: Use `datetime.now(ZoneInfo(tz_name))` directly for cleaner conversion

### Hardcoded Schedule Intervals
Schedule intervals (1 minute, 5 minutes) are defined in `main.py`, not in this module:
- **Risk**: Module cannot function independently; schedule is coupled to application startup
- **Recommendation**: Define schedule intervals as constants in this module or in configuration file

### No Retry Logic for Scraper Calls
`trigger_platform_scrape()` returns `false` on failure but doesn't retry:
- **Impact**: Transient network issues could skip sync cycles
- **Current Mitigation**: Next scheduled run will pick it up again (1 minute interval)
- **Recommendation**: Add retry with exponential backoff for critical sync operations

### Global Scheduler Instance
Using global `scheduler = AsyncIOScheduler()`:
- **Risk**: Makes testing difficult (state persists between tests)
- **Recommendation**: Use dependency injection or factory pattern for testability

### Broadcast Error Handling
Individual broadcast failures update status to `'failed'` but don't log the specific error in the broadcast record:
- **Gap**: No `error_message` field updated in `broadcast_event` table
- **Recommendation**: Store error details in broadcast record for debugging

### Reconciliation Edge Case
Reconciliation only marks jobs as failed if they're NOT in Scraper Engine's active list:
- **Gap**: If Scraper Engine is down, ALL stuck jobs are skipped (reconciliation doesn't run)
- **Current Behavior**: Logs warning and returns early
- **Recommendation**: Add timeout-based failure (mark as failed if running for > X minutes regardless of active status)

### Database Session Management
`sync_tasks.py` and `reconciliation_tasks.py` use `SessionLocal()` directly:
```python
db = SessionLocal()
try:
    ...
finally:
    db.close()
```
- **Risk**: If exception occurs before `try`, session leaks
- **Recommendation**: Use context manager: `with SessionLocal() as db:`

---

## 9. Strategic Enhancements

### High Priority
1. **Unified Scraper URL**: Consolidate to single `SCRAPER_ENGINE_URL` environment variable
2. **Add Error Logging to Broadcasts**: Store error messages in `broadcast_event` table on failure
3. **Context Manager for DB Sessions**: Use `with SessionLocal() as db:` pattern consistently

### Medium Priority
4. **Retry Logic**: Add exponential backoff retry for scraper API calls
5. **Schedule Configuration**: Move schedule intervals to configuration file or environment variables
6. **Timezone Simplification**: Use Python 3.9+ `datetime.now(ZoneInfo())` for cleaner timezone handling
7. **Reconciliation Timeout**: Add maximum duration check (fail jobs running too long)

### Low Priority
8. **Dependency Injection**: Replace global scheduler instance with injectable factory
9. **Metrics Collection**: Track scheduler job execution times and success rates
10. **Job Prioritization**: Add priority field to broadcasts (urgent vs scheduled)
11. **Dead Letter Queue**: Move permanently failed broadcasts to separate table for manual review
12. **Health Check Endpoint**: Expose scheduler status and next run times via API

---

## Appendices

### A. Task Schedule Reference

| Task | Function | Frequency | Purpose |
|------|----------|-----------|---------|
| Sync Processing | `process_pending_syncs()` | Every 1 minute | Trigger pending source scrapes |
| Broadcast Processing | `process_pending_broadcasts()` | Every 1 minute | Send scheduled notifications |
| Job Reconciliation | `reconcile_scraper_jobs()` | Every 5 minutes | Detect and fail stuck scraper jobs |

### B. Source Status Flow with Scheduler

```
active → (next_synced_at passes) → scheduler triggers scrape → running
                                                      ↓
                                            Scraper Engine processes
                                                      ↓
                                    callback updates → synced (active) OR failed (active)
```

### C. Broadcast Status Flow

```
draft → schedule (status: pending, scheduled_at set)
         ↓
   (scheduled_at <= now)
         ↓
   scheduler processes
         ↓
   creates notifications
         ↓
   updates to sent (status: sent, sent_at set)

On error:
   updates to failed (status: failed, sent_at set)
```

### D. Quick Reference: Functions

| Function | File | Type | Purpose | Returns |
|----------|------|------|---------|---------|
| `start_scheduler` | scheduler_service.py | Service | Start APScheduler | None |
| `stop_scheduler` | scheduler_service.py | Service | Stop APScheduler | None |
| `trigger_platform_scrape` | sync_tasks.py | Task | Trigger scraper for platform | bool |
| `process_pending_syncs` | sync_tasks.py | Task | Find and trigger pending syncs | None |
| `process_pending_broadcasts` | broadcasting_tasks.py | Task | Send scheduled broadcasts | None |
| `reconcile_scraper_jobs` | reconciliation_tasks.py | Task | Detect stuck scraper jobs | None |
| `_get_timezone_offset` | broadcasting_tasks.py | Helper | Calculate TZ offset | timedelta |

### E. External API Contracts

#### Scraper Engine - Trigger Scrape
```http
POST {SCRAPER_API_URL}/api/{platform_key}/scrape
Content-Type: application/json
Timeout: 20s

{
  "source_id": "uuid-string",
  "source_url": "https://platform.com/hotel/123",
  "headless": true,
  "pages": "*"
}

Response (Success): 200 OK
Response (Failure): 4xx/5xx (logged, returns false)
```

#### Scraper Engine - Active Jobs
```http
GET {SCRAPER_ENGINE_URL}api/system/jobs
Timeout: 10s

Response:
{
  "jobs": {
    "job_id_1": {
      "source_id": "uuid-string",
      "status": "running",
      "started_at": "..."
    },
    "job_id_2": { ... }
  }
}
```

### F. Database Queries

#### Pending Sync Sources
```sql
SELECT * FROM source
WHERE source_status = 'active'
  AND next_synced_at <= :now_utc
```

#### Pending Broadcasts
```sql
SELECT * FROM broadcast_event
WHERE status = 'pending'
  AND scheduled_at IS NOT NULL
  AND scheduled_at <= :now_in_system_tz
ORDER BY scheduled_at ASC
```

#### Stuck Sources (via source_service.get_stuck_sources)
```sql
SELECT * FROM source
WHERE source_status IN ('running', 'queued')
  AND last_synced_at < :timeout_threshold
```

### G. Error Scenarios

| Scenario | Detection | Recovery | Impact |
|----------|-----------|----------|--------|
| Scraper Engine down | Reconciliation task fails to connect | Skips until Engine recovers | Stuck sources not failed |
| Broadcast send fails | Exception in create_notifications | Marks broadcast as failed | Some users miss notification |
| Database unavailable | Session creation fails | Task skips execution | Next run will retry |
| Timezone misconfigured | _get_timezone_offset fails | Defaults to UTC | Broadcasts sent at wrong time |
| Source has no platform | Platform is None | Skipped with warning | Source never synced |

---

*Last Updated: 2026-04-12*  
*Module Version: Scheduler Module v1.0 (Complete Documentation)*
