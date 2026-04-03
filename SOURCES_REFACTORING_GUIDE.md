# Multi-User Review Sources Refactoring

## Overview
Changed `dbo.organization_review_sources` from **organization-level** to **user-level** (membership-level) source management. This enables different users within the same organization to select different review sources, similar to the subscription plan setup.

## Problem Solved
**Before**: User A and User B in org 'ABC' shared the same sources (Google Reviews, Booking.com)
**After**: User A can select (Google Reviews, Booking.com) AND User B can independently select (TripAdvisor, Custom URL) for the same org 'ABC'

## Database Changes

### Schema Modification
- **Added column**: `user_id` (UNIQUEIDENTIFIER NULL) to `dbo.organization_review_sources`
- **Added FK constraint**: `FK_org_review_sources_user` → `dbo.users(user_id)` with CASCADE delete
- **Added index**: `IX_org_review_sources_user_org` on `(user_id, organization_id)` for query performance

### Migration Script
File: `backend/app/database/query/add_user_id_to_review_sources.sql`

**To execute on SQL Server**:
```sql
-- Run this SQL script to apply the schema changes:
IF OBJECT_ID('dbo.organization_review_sources', 'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.organization_review_sources', 'user_id') IS NULL
    BEGIN
        ALTER TABLE dbo.organization_review_sources
        ADD user_id UNIQUEIDENTIFIER NULL;
    END
    -- (FK and index creation follows...)
END;
```

The script is **idempotent** - safe to run multiple times.

## Backend API Changes

### Affected Endpoints
1. **GET /api/setup/sources** - Now filters by `(user_id, organization_id)` instead of just `organization_id`
2. **POST /api/setup/sources/connect** - Stores source with `user_id` and filters on insert/update/check
3. **POST /api/setup/sources/custom** - Delegates to connect_setup_source with user_id
4. **POST /api/setup/schedule/finalize** - Updates fetching frequency only for user's sources
5. **POST /api/setup/sources/disconnect** - Disconnects only user's specific sources

### SQL Examples

**Before** (org-level):
```sql
SELECT source_id, source_name FROM organization_review_sources
WHERE organization_id = @org_id
```

**After** (user-level):
```sql
SELECT source_id, source_name FROM organization_review_sources
WHERE organization_id = @org_id AND user_id = @user_id
```

### Key Implementation Details
- All endpoints extract `user_id` from authenticated user token via `get_current_user`
- All INSERT/UPDATE/SELECT queries now include `AND user_id = :user_id` filter
- For SQLite and SQL Server compatibility, uses `_is_sqlite()` conditional SQL generation
- Maintains same request/response schemas with no breaking changes to API contract

## Backward Compatibility

### Existing Data
- **Current sources will have NULL user_id** (data integrity maintained)
- Queries only return sources where `user_id` matches current user
- Data with NULL user_id becomes invisible to new queries (safe isolation)
- Optional cleanup: Can run UPDATE to assign existing sources to their organization creator

### Optional Data Migration
If you want to assign existing org-level sources to the organization creator:
```sql
UPDATE ors
SET user_id = uo.user_id
FROM dbo.organization_review_sources ors
JOIN dbo.user_organizations uo ON ors.organization_id = uo.organization_id
WHERE ors.user_id IS NULL
  AND uo.user_id IN (
    SELECT user_id 
    FROM dbo.user_organizations 
    WHERE organization_id = ors.organization_id 
    ORDER BY created_at
    LIMIT 1
  )
```

## Database Verification

### Pre-Migration Check
```sql
-- Check for user_id column (before running migration)
SELECT COL_LENGTH('dbo.organization_review_sources', 'user_id');
-- Result: NULL = column doesn't exist, not NULL = column exists
```

### Post-Migration Verification
```sql
-- Verify new columns and constraints exist
SELECT 
    c.name AS column_name,
    t.name AS data_type,
    c.is_nullable
FROM sys.columns c
JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE object_id = OBJECT_ID('dbo.organization_review_sources')
ORDER BY c.column_id;

-- Verify foreign key constraint
SELECT name
FROM sys.foreign_keys
WHERE parent_object_id = OBJECT_ID('dbo.organization_review_sources')
  AND name = 'FK_org_review_sources_user';

-- Verify index
SELECT name
FROM sys.indexes
WHERE object_id = OBJECT_ID('dbo.organization_review_sources')
  AND name = 'IX_org_review_sources_user_org';
```

### Check User's Sources
```sql
-- View sources for specific user in specific org
SELECT source_id, user_id, source_name, source_url, is_active
FROM dbo.organization_review_sources
WHERE organization_id = '<org_id>'
  AND user_id = '<user_id>'
ORDER BY created_at DESC;

-- Count sources per user per organization
SELECT 
    u.user_id,
    u.user_name,
    ors.organization_id,
    COUNT(DISTINCT CASE WHEN ors.is_active = 1 THEN ors.source_id END) AS active_sources_count,
    COUNT(*) AS total_sources
FROM dbo.organization_review_sources ors
JOIN dbo.users u ON ors.user_id = u.user_id
WHERE ors.user_id IS NOT NULL
GROUP BY u.user_id, u.user_name, ors.organization_id
ORDER BY u.user_id, ors.organization_id;
```

## Testing Guide

### Swagger UI Testing - Multi-User Source Selection

#### Step 1: Verify DB Migration
- Run the SQL migration script from `add_user_id_to_review_sources.sql`
- Verify with INFORMATION_SCHEMA query above

#### Step 2: Get User A's Sources (Setup Flow)
```
GET /api/setup/sources?organization_id=<org_id>
Authorization: Bearer <user_a_token>
```

**Expected Response**:
```json
{
  "organization_id": "...",
  "sources": [
    {"name": "Google Reviews", "icon": "G", "connected": false},
    {"name": "Booking.com", "icon": "B", "connected": false},
    {"name": "Trip Advisor", "icon": "T", "connected": false}
  ],
  "connected_sources": []
}
```

#### Step 3: User A Connects Sources
```
POST /api/setup/sources/connect
Authorization: Bearer <user_a_token>
Content-Type: application/json

{
  "source_name": "Google Reviews",
  "organization_id": "<org_id>",
  "source_url": null,
  "fetching_frequency": "daily"
}
```

Then connect another source for User A (e.g., Booking.com)

#### Step 4: Switch to User B - Get Sources
```
GET /api/setup/sources?organization_id=<org_id>
Authorization: Bearer <user_b_token>
```

Notice: User B sees **empty sources** (different user = different selection)
```json
{
  "organization_id": "...",
  "sources": [
    {"name": "Google Reviews", "icon": "G", "connected": false},
    {"name": "Booking.com", "icon": "B", "connected": false},
    {"name": "Trip Advisor", "icon": "T", "connected": false}
  ],
  "connected_sources": []
}
```

#### Step 5: User B Connects Different Sources
```
POST /api/setup/sources/connect
Authorization: Bearer <user_b_token>
Content-Type: application/json

{
  "source_name": "Trip Advisor",
  "organization_id": "<org_id>",
  "source_url": null,
  "fetching_frequency": "daily"
}
```

Then connect a custom source for User B:
```
POST /api/setup/sources/custom
Authorization: Bearer <user_b_token>
Content-Type: application/json

{
  "source_name": "Custom URL",
  "organization_id": "<org_id>",
  "source_url": "https://custom.example.com/reviews",
  "fetching_frequency": "weekly"
}
```

#### Step 6: Database Verification
```sql
-- Verify sources are stored separately per user
SELECT 
    u.user_name,
    ors.source_name,
    ors.source_url,
    ors.fetching_frequency
FROM dbo.organization_review_sources ors
JOIN dbo.users u ON ors.user_id = u.user_id
WHERE ors.organization_id = '<org_id>'
ORDER BY u.user_name, ors.created_at;

-- Expected output:
-- user_name      | source_name       | source_url              | fetching_frequency
-- User A         | Google Reviews    | NULL                    | daily
-- User A         | Booking.com       | NULL                    | daily
-- User B         | Trip Advisor      | NULL                    | daily
-- User B         | Custom URL        | https://custom.example...| weekly
```

## Frontend Integration
- Frontend API calls automatically include current `user_id` from auth context
- No frontend code changes needed - endpoints handle user_id extraction
- Setup flow continues to work normally for multi-user scenarios

## Migration Checklist
- [ ] Execute SQL migration script on target database
- [ ] Verify columns, FK, and index created with INFORMATION_SCHEMA queries
- [ ] Test GET /api/setup/sources with User A
- [ ] Test POST /api/setup/sources/connect with User A
- [ ] Test GET /api/setup/sources with User B (should show different sources)
- [ ] Test POST /api/setup/sources/connect with User B
- [ ] Run DB verification query to confirm separate source records
- [ ] Test POST /api/setup/schedule/finalize for both users
- [ ] Test POST /api/setup/sources/disconnect works per user
- [ ] Full setup flow (Step 1→5) with two users in same org

## Known Limitations
- Existing sources with NULL user_id are invisible to new queries (intended behavior)
- Sources cannot be shared between users - each user has independent selection
- Organization-level source administration requires separate endpoint (not in scope)

## Files Modified
1. `backend/app/modules/organization/routes/source_routes.py` - All endpoints updated with user_id filtering
2. `backend/app/database/query/add_user_id_to_review_sources.sql` - New migration script (created)
