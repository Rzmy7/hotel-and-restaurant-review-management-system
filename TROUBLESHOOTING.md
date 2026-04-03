# Troubleshooting Migration Issues

## Problem 1: Migration Script Fails with "Column already exists"

```
Error: ALTER TABLE dbo.organization_review_sources
       ADD user_id UNIQUEIDENTIFIER NULL
       
[SQL0911] [S0011] Cannot create Relationship 'user_id'. Column 'user_id' already exists.
```

### Solution
The column already exists (migration was run before). This is safe!

**Check**:
```sql
SELECT COL_LENGTH('dbo.organization_review_sources', 'user_id');
-- If result is: 4 = Column already exists, that's fine!
```

**Action**: Skip to VERIFY step - your migration already applied

---

## Problem 2: FK Constraint Fails with "Invalid column reference"

```
Error: ALTER TABLE dbo.organization_review_sources
       ADD CONSTRAINT FK_org_review_sources_user
           FOREIGN KEY (user_id) REFERENCES dbo.users(user_id)

[SQL0911] [S0908] Invalid column reference 'user_id'
```

### Solution
The user_id column doesn't exist yet when FK is being created.

**Check**:
```sql
SELECT COL_LENGTH('dbo.organization_review_sources', 'user_id');
-- If NULL = column missing
```

**Action**: 
1. First ensure column is created:
```sql
IF COL_LENGTH('dbo.organization_review_sources', 'user_id') IS NULL
BEGIN
    ALTER TABLE dbo.organization_review_sources
    ADD user_id UNIQUEIDENTIFIER NULL;
    PRINT 'Column created';
END;
```

2. Then re-run FK creation

---

## Problem 3: Index Creation Fails with "Duplicate index name"

```
Error: CREATE INDEX IX_org_review_sources_user_org
       ON dbo.organization_review_sources(user_id, organization_id)

[SQL0912] Cannot create index 'IX_org_review_sources_user_org'
Index with same name or specification already exists.
```

### Solution
Index already exists. This is safe!

**Check**:
```sql
SELECT name FROM sys.indexes 
WHERE object_id = OBJECT_ID('dbo.organization_review_sources')
  AND name = 'IX_org_review_sources_user_org';
-- If result exists = Index already created
```

**Action**: Skip to VERIFY step - your index is already created

---

## Problem 4: FK References Non-existent Table

```
Error: CONSTRAINT FK_org_review_sources_user
       FOREIGN KEY (user_id) REFERENCES dbo.users(user_id)

[SQL0908] Table 'dbo.users' doesn't have column 'user_id'
```

### Solution
Check if users table and user_id column exist

**Check**:
```sql
-- Check if users table exists
SELECT 1 WHERE OBJECT_ID('dbo.users', 'U') IS NOT NULL;
-- Result: 1 = Table exists

-- Check if user_id column exists in users table
SELECT COL_LENGTH('dbo.users', 'user_id');
-- Result: 4 = Column exists
```

**Action**: 
- If users table doesn't exist, create it first
- If user_id column missing, add it to users table
- Then retry FK creation

---

## Problem 5: Swagger Test - 403 Forbidden on GET /api/setup/sources

```
GET /api/setup/sources?organization_id=<org_id>
Response: 403 Forbidden
Message: "You are not a member of this organization"
```

### Solution
Your user token is not a member of the organization

**Check**:
```sql
SELECT * FROM dbo.user_organizations
WHERE user_id = '<your-user-id>'
  AND organization_id = '<the-org-id-you-used>';
```

**Action**:
- If no result: Add yourself to organization first
- If result exists: Use that exact organization_id in Swagger tests

---

## Problem 6: Swagger Test - 404 Not Found on POST /api/setup/sources/connect

```
POST /api/setup/sources/connect
Response: 404 Not Found
Message: "Source not found"
```

### Solution
The source doesn't exist for the user yet (expected on first insert)

**Actually this is normal behavior?** 
- This 404 means the source already exists from a previous test
- But it's marked as is_active = 0 (disconnected)

**Check**:
```sql
SELECT source_id, is_active FROM dbo.organization_review_sources
WHERE organization_id = '<org-id>'
  AND user_id = '<user-id>'
  AND LOWER(source_name) = LOWER('Google Reviews');
```

**Action**:
- If result has is_active = 0: API will reactivate it (try again)
- If no result: Brand new source, will be created
- If result has is_active = 1: Already connected, use GET to verify

---

## Problem 7: Swagger Test 5 FAILS - User B Sees User A's Sources

```
GET /api/setup/sources (User B Token)
Response shows: connected_sources with Google Reviews and Booking.com

❌ WRONG! User B should see empty list
```

### Solution
The user_id filtering is not working properly

**Check**:
```sql
-- Verify user_id column exists and is populated
SELECT user_id, source_name FROM dbo.organization_review_sources
WHERE organization_id = '<org-id>';

-- Check if ANY sources have NULL user_id
SELECT COUNT(*) FROM dbo.organization_review_sources
WHERE organization_id = '<org-id>'
  AND user_id IS NULL;
```

**Action**:
1. If column is NULL for all: Migration didn't apply properly
   - Re-run migration script completely
   
2. If only some have NULL: Old data from before migration
   - Optional: Assign old sources to organization creator:
   ```sql
   UPDATE ors
   SET user_id = uo.user_id
   FROM dbo.organization_review_sources ors
   JOIN dbo.user_organizations uo ON ors.organization_id = uo.organization_id
   WHERE ors.user_id IS NULL
     AND uo.user_id IN (
       SELECT TOP 1 user_id 
       FROM dbo.user_organizations 
       WHERE organization_id = ors.organization_id 
       ORDER BY created_at
     );
   ```

3. If column doesn't exist: 
   - Check BEFORE_MIGRATION_CHECKS.sql results
   - Migration may not have executed

---

## Problem 8: DB Shows Correct Data but Swagger Returns Wrong Results

```
SQL Query shows: User A = 2 sources, User B = 2 sources (different)
Swagger GET shows: Both users see same 2 sources ❌
```

### Solution
Backend API is not using user_id properly

**Check**:
1. Backend code uses `user_id` in queries
   ```python
   # Should see this in source_routes.py:
   WHERE organization_id = :organization_id AND user_id = :user_id
   ```

2. User token is being extracted correctly
   ```python
   user = Depends(get_current_user)
   user_id = user.user_id
   ```

**Action**:
- Verify backend code: [backend/app/modules/organization/routes/source_routes.py](source_routes.py)
- Look for user_id in all SQL queries (should be in WHERE clause)
- Restart backend server
- Clear browser cache
- Test again

---

## Problem 9: Index Creation Takes Too Long

```
CREATE INDEX IX_org_review_sources_user_org
ON dbo.organization_review_sources(user_id, organization_id)

⏳ Taking 5+ minutes...
```

### Solution
Table has huge number of rows, index creation in progress

**Action**:
- Be patient, let it complete
- If it times out after 10+ minutes:
  ```sql
  -- Cancel with Ctrl+C and try async index creation:
  CREATE INDEX IX_org_review_sources_user_org
  ON dbo.organization_review_sources(user_id, organization_id)
  WITH (ONLINE = ON);  -- Allows queries during index creation
  ```

---

## Problem 10: FK Cascade Delete Causes Issues

```
DELETE FROM dbo.users WHERE user_id = '<test-user-id>'

Error: Cannot delete user - referenced by foreign key
or
Everything deleted unexpectedly
```

### Solution
FK has CASCADE DELETE which deletes sources when user is deleted

**Expected Behavior**:
```
DELETE user → Automatically DELETE user's sources
```

**This is by design** ✅

**Action**:
- If you want to test deletion: Be aware that user's sources auto-delete
- If you want to keep sources: Manually NULL user_id before deleting user:
  ```sql
  UPDATE dbo.organization_review_sources
  SET user_id = NULL
  WHERE user_id = '<user-to-delete>';
  
  DELETE FROM dbo.users WHERE user_id = '<user-to-delete>';
  ```

---

## Verification Checklist

If everything is working, all these should return results:

```sql
-- 1. Column exists
✅ SELECT COL_LENGTH('dbo.organization_review_sources', 'user_id');
   Result: 4

-- 2. FK constraint exists
✅ SELECT name FROM sys.foreign_keys 
     WHERE name = 'FK_org_review_sources_user';
   Result: 1 row

-- 3. Index exists
✅ SELECT name FROM sys.indexes 
     WHERE name = 'IX_org_review_sources_user_org';
   Result: 1 row

-- 4. Data has user_ids
✅ SELECT COUNT(*) FROM dbo.organization_review_sources 
     WHERE user_id IS NOT NULL;
   Result: > 0

-- 5. Different users have different sources
✅ SELECT DISTINCT user_id FROM dbo.organization_review_sources
     WHERE organization_id = '<org_id>';
   Result: Multiple rows (= multiple users)
```

All 5 returning results = Migration successful ✅
