# Module Analysis: Source Module

## 1. Module Overview

### What & Why
The `source` module manages review data sources within the Hotel and Restaurant Review Management System. It handles source configuration, synchronization tracking, platform management, and embedding service integration for semantic search capabilities.

It exists to:
- **Manage Sources**: CRUD operations for review sources linked to organizations
- **Track Syncs**: Monitor synchronization status, timing, and success rates
- **Define Platforms**: Configure scraping platforms (Booking, Google, etc.)
- **Enable Semantic Search**: Integrate with embedding service for vector search

### When
The module's logic is triggered when:
1. Organizations connect new review sources
2. Sync operations are triggered or completed
3. Platform configurations are updated
4. Embedding service is queried for semantic search
5. Sync status needs updating from scraper engine callbacks

---

## 2. Architecture & Structure

### File Tree
```
source/
├── __init__.py                         # Module initialization
├── models.py                           # SQLAlchemy ORM models
├── schemas.py                          # Pydantic schemas
├── query/
│   └── source_queries.py               # Raw SQL queries
├── routers/
│   ├── __init__.py                     # Routers package
│   ├── source_router.py                # Source CRUD and sync endpoints
│   ├── sync_task_router.py             # Sync task management
│   └── test_routers.py                 # Test endpoints
└── services/
    ├── __init__.py                     # Services package
    ├── source_service.py               # Source business logic
    ├── embedding_client.py             # Embedding service client
    └── test_sources.py                 # Test utilities
```

---

## 3. Database Models & Tables

### Table: `platform`
Review platform definitions (Booking.com, Google Maps, etc.)

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `platform_id` | INT | PK, autoincrement | -- | Unique platform ID |
| `platform_name` | VARCHAR(100) | UNIQUE, NOT NULL | -- | Platform name |
| `base_url` | VARCHAR(500) | Nullable | NULL | Platform base URL |
| `fetching_type` | VARCHAR(20) | CHECK: API/SCRAPING/BOTH, NOT NULL | -- | Data fetching method |
| `platform_status` | VARCHAR(20) | CHECK: active/inactive, NOT NULL | 'active' | Platform status |
| `num_of_syncs` | INT | NOT NULL | 0 | Total sync count |
| `success_sync_count` | INT | NOT NULL | 0 | Successful syncs |
| `success_rate` | FLOAT | NOT NULL | 0.0 | Success percentage |
| `review_table` | VARCHAR(255) | Nullable | NULL | Associated review table name |
| `created_at` | DATETIME | NOT NULL | SYSUTCDATETIME() | Creation timestamp |
| `updated_at` | DATETIME | Nullable | On update | Last update timestamp |

### Table: `sync_frequency`
Sync interval definitions.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `frq_id` | INT | PK | -- | Frequency ID |
| `name` | VARCHAR(50) | NOT NULL | -- | Frequency name (Daily, Weekly, etc.) |
| `info` | VARCHAR(255) | Nullable | NULL | Short description |
| `description` | VARCHAR(255) | Nullable | NULL | Full description |

### Table: `source`
Organization review source definitions.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `source_id` | UNIQUEIDENTIFIER | PK | uuid.uuid4() | Unique source ID |
| `organization_id` | UNIQUEIDENTIFIER | FK → organization.organization_id (CASCADE), NOT NULL | -- | Owning organization |
| `platform_id` | INT | FK → platform.platform_id (CASCADE), NOT NULL | -- | Review platform |
| `source_url` | VARCHAR(1000) | NOT NULL | -- | Source URL to scrape |
| `source_status` | VARCHAR(20) | CHECK: active/paused/error/queued/running/verify duplication, NOT NULL | 'active' | Current status |
| `fetching_frequency` | INT | FK → sync_frequency.frq_id, NOT NULL | 1 | Sync interval |
| `last_synced_at` | DATETIME | Nullable | NULL | Last successful sync |
| `next_synced_at` | DATETIME | Nullable | NULL | Next scheduled sync |
| `num_of_syncs` | INT | NOT NULL | 0 | Total sync count |
| `success_sync_count` | INT | NOT NULL | 0 | Successful syncs |
| `success_rate` | FLOAT | NOT NULL | 0.0 | Success percentage |
| `created_at` | DATETIME | NOT NULL | SYSUTCDATETIME() | Creation timestamp |

**Unique Constraint**: `UNIQUE(organization_id, platform_id)` - one source per platform per org

### Table: `sync_log`
Sync execution history.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `log_id` | UNIQUEIDENTIFIER | PK | uuid.uuid4() | Unique log ID |
| `source_id` | UNIQUEIDENTIFIER | FK → source.source_id (CASCADE), NOT NULL, indexed | -- | Synced source |
| `status` | VARCHAR(20) | CHECK: Success/Failed/In Progress, NOT NULL | -- | Sync result |
| `timestamp` | DATETIME | NOT NULL, indexed | SYSUTCDATETIME() | Execution time |
| `duration_ms` | INT | NOT NULL | 0 | Sync duration in ms |
| `reviews_fetched` | INT | NOT NULL | 0 | Number of reviews retrieved |
| `error_message` | VARCHAR(1000) | Nullable | NULL | Error details if failed |

### Table: `tenant`
Tenant workspace mapping.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `tenant_id` | UNIQUEIDENTIFIER | PK, FK → user.user_id (CASCADE) | -- | User ID (tenant = user) |
| `plan` | VARCHAR(50) | Nullable | NULL | Subscription plan |
| `created_at` | DATETIME | NOT NULL | SYSUTCDATETIME() | Creation timestamp |

### Table: `organization`
Organization entity.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `organization_id` | UNIQUEIDENTIFIER | PK | uuid.uuid4() | Unique org ID |
| `tenant_id` | UNIQUEIDENTIFIER | FK → tenant.tenant_id (CASCADE), NOT NULL | -- | Owning tenant |
| `organization_name` | VARCHAR(255) | NOT NULL | -- | Organization name |
| `organization_type_id` | INT | FK → organization_type.type_code | NULL | Org type |
| `created_at` | DATETIME | NOT NULL | SYSUTCDATETIME() | Creation timestamp |
| `updated_at` | DATETIME | Nullable | On update | Last update timestamp |

---

## 4. Pydantic Schemas

### `SyncLogRead`
Sync log entry representation.

| Field | Type | Description |
|-------|------|-------------|
| `id` | str | Log ID |
| `sourceId` | str | Source ID |
| `platform` | str | Platform name |
| `status` | str | Sync status |
| `timestamp` | str | Execution timestamp |
| `durationMs` | int | Duration in milliseconds |
| `reviewsFetched` | int | Review count |
| `errorMessage` | str or None | Error details |

### `SyncStatusRequest`
Sync status update from scraper engine.

| Field | Type | Description |
|-------|------|-------------|
| `status` | SyncStatus enum | Success/Failed/In Progress |
| `new_review_count` | int | Reviews fetched count |
| `error_message` | str or None | Error details |

### `SyncStatus`
Enum: `SUCCESS = "Success"`, `FAILED = "Failed"`, `IN_PROGRESS = "In Progress"`

### Other Schemas
- `SourceRead` - Source details with platform info
- `PlatformRead` - Platform configuration
- `OrganizationRead` - Organization summary
- `SourceStats` - Source performance metrics
- `SourceCreate` - Source creation request
- `SourceUpdate` - Source update request

---

## 5. API Endpoints

### 5.1 Source Router (`source_router.py`)

| # | Method | Path | Purpose | Request/Response |
|---|--------|------|---------|------------------|
| 1 | GET | `/api/sources` | List all sources | `List[SourceRead]` |
| 2 | GET | `/api/sources/{source_id}` | Get source details | `SourceRead` |
| 3 | POST | `/api/sources` | Create new source | `SourceCreate` → `SourceRead` |
| 4 | PATCH | `/api/sources/{source_id}` | Update source | `SourceUpdate` → `SourceRead` |
| 5 | DELETE | `/api/sources/{source_id}` | Delete source | Success message |
| 6 | GET | `/api/sources/{source_id}/sync-logs` | Get sync history | `List[SyncLogRead]` |
| 7 | GET | `/api/sources/{source_id}/stats` | Get source statistics | `SourceStats` |

### 5.2 Sync Task Router (`sync_task_router.py`)

| # | Method | Path | Purpose | Request/Response |
|---|--------|------|---------|------------------|
| 8 | POST | `/api/sources/{source_id}/sync` | Trigger manual sync | Success message |
| 9 | POST | `/api/source/tasks/{source_id}/sync-complete` | Scraper engine callback | Status update |
| 10 | GET | `/api/source/tasks/stuck` | Get stuck sources | List of stuck sources |

---

## 6. Services

### 6.1 Source Service (`source_service.py`)

**Key Functions:**

| Function | Signature | Purpose |
|----------|-----------|---------|
| `get_source_by_id(db, source_id)` | `(db, UUID) -> Source` | Fetch source with platform/org |
| `get_all_sources()` | `() -> List[dict]` | List all sources with stats |
| `create_source(db, payload)` | `(db, SourceCreate) -> Source` | Create new source |
| `update_source(db, source_id, payload)` | `(db, UUID, SourceUpdate) -> Source` | Update source config |
| `delete_source(db, source_id)` | `(db, UUID) -> bool` | Delete source |
| `get_sync_logs(db, source_id)` | `(db, UUID) -> List[SyncLogRead]` | Fetch sync history |
| `get_source_stats(db, source_id)` | `(db, UUID) -> SourceStats` | Calculate source metrics |
| `calculate_next_sync_time(frequency_id)` | `(int) -> datetime` | Compute next sync time |
| `get_stuck_sources(db)` | `(db) -> List[Source]` | Find sources stuck in running/queued |
| `update_sync_status(db, source_id, payload)` | `(db, UUID, SyncStatusRequest) -> None` | Update from scraper callback |
| `update_sync_timestamps(db, source_id)` | `(db, UUID) -> None` | Update last_synced_at and next_synced_at |

**Sync Status Flow:**
```
active → (sync triggered) → running/queued
                              ↓
                    (scraper callback)
                              ↓
              success → active (update timestamps)
              failed → error (log error)
```

**Stuck Source Detection:**
```python
# Sources in running/queued status beyond expected time
source_status IN ('running', 'queued')
AND last_synced_at < timeout_threshold
```

### 6.2 Embedding Client (`embedding_client.py`)

**Purpose**: HTTP client for embedding service communication.

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `search_embeddings(query, hotel_id, top_k)` | Semantic search for similar reviews |
| `get_embedding(text)` | Generate embedding for text |
| `batch_embed(texts)` | Batch embedding generation |
| `test_connection()` | Verify embedding service health |

**Embedding Service API:**
```http
POST {EMBEDDING_SERVICE_URL}/search
{
    "query": "review text",
    "hotel_id": 123,
    "top_k": 3
}

Response:
{
    "reviews": [{"text": "...", "distance": 0.123}],
    "rules": [{"text": "...", "distance": 0.456}]
}
```

---

## 7. Integrations

### Scheduler Module
- **Sync Triggers**: Scheduler calls `trigger_platform_scrape()` for scheduled syncs
- **Reconciliation**: Scheduler detects stuck sources via `get_stuck_sources()`

### Scraper Engine (Microservice)
- **Sync Callbacks**: Scraper calls `/api/source/tasks/{source_id}/sync-complete`
- **Status Updates**: Sends SyncStatusRequest with results

### Reviews Module
- **Data Flow**: Sources feed into review ingestion pipeline
- **Trigger**: Reviews module calls scraper engine for source sync

### Organization Module
- **Ownership**: Sources belong to organizations via organization_id FK
- **Validation**: Organization must exist before source creation

### Embedding Service (Microservice)
- **Semantic Search**: Used for RAG-based reply generation
- **Vector Storage**: Stores review embeddings for similarity search

---

## 8. Configuration & Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `EMBEDDING_SERVICE_URL` | `http://localhost:8001` | Embedding service base URL |
| `SCRAPER_API_URL` | `http://127.0.0.1:8001` | Scraper engine base URL |

---

## 9. Code Review: Flaws & Technical Debt

### Port Conflict
> [!CAUTION]
> Embedding service and scraper engine both default to port 8001.
- **Impact**: One service will fail to bind in single-node deployments
- **Recommendation**: Use distinct ports (e.g., 8001 for scraper, 8002 for embedding)

### Sync Status Race Conditions
Multiple syncs could overlap if triggered manually while running:
- **Risk**: Duplicate review ingestion
- **Current Mitigation**: Unique constraint on (organization_id, platform_id)
- **Recommendation**: Add row-level locking or status checks before sync

### No Rate Limiting on Sync
Manual sync endpoint has no rate limiting:
- **Risk**: Excessive scraper engine load
- **Recommendation**: Add cooldown period between syncs

### Embedding Client Error Handling
```python
try:
    response = requests.post(...)
    response.raise_for_status()
except Exception:
    return [], []
```
- **Risk**: Silently fails, no logging
- **Recommendation**: Log errors and return partial results

---

## 10. Strategic Enhancements

### High Priority
1. **Fix Port Conflicts**: Use distinct ports for microservices
2. **Add Sync Locking**: Prevent overlapping sync operations
3. **Improve Error Logging**: Log embedding and scraper failures

### Medium Priority
4. **Add Rate Limiting**: Cooldown between manual syncs
5. **Sync Retry Logic**: Auto-retry failed syncs with backoff
6. **Source Validation**: Validate URL format before creation

### Low Priority
7. **Batch Operations**: Bulk source creation/updates
8. **Source Templates**: Pre-configured source templates by platform
9. **Sync History Search**: Filter sync logs by date/status
10. **Health Dashboard**: Source health overview endpoint

---

*Last Updated: 2026-04-12*  
*Module Version: Source Module v1.0*
