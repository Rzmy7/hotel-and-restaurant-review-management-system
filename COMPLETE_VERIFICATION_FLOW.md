# COMPLETE VERIFICATION & TESTING FLOW

## 📌 YOUR CURRENT SITUATION

You're seeing the same columns in `dbo.organization_review_sources` table = **Migration script hasn't been executed yet**.

```
Current state: ❌ No user_id column
Expected state after migration: ✅ Has user_id column
```

---

# 🚀 COMPLETE EXECUTION FLOW (Step-by-Step)

## PHASE 1: PRE-MIGRATION CHECKS (Current State)

### Step 1.1: Verify user_id Column DOES NOT Exist Yet

**Run this query in SQL Server**:
```sql
SELECT COL_LENGTH('dbo.organization_review_sources', 'user_id') AS user_id_column;
```

**Expected Result**:
```
user_id_column
NULL
```

✅ If you see NULL = Migration not applied yet (expected)
❌ If you see 4 = Migration already applied (skip to Phase 2)

---

### Step 1.2: View Current Table Structure

**Run this query**:
```sql
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'organization_review_sources'
  AND TABLE_SCHEMA = 'dbo'
ORDER BY ORDINAL_POSITION;
```

**Expected Result** (before migration):
```
COLUMN_NAME        | DATA_TYPE           | IS_NULLABLE
source_id          | uniqueidentifier    | NO
organization_id    | uniqueidentifier    | NO
source_name        | nvarchar            | NO
source_url         | nvarchar            | YES
is_active          | bit                 | NO
fetching_frequency | nvarchar            | NO
created_at         | datetime            | NO
updated_at         | datetime            | NO
(no user_id column)
```

✅ You should NOT see user_id in this list yet

---

### Step 1.3: Check Current Data Volume (Optional)

**Run this query** (to see how many source records exist):
```sql
SELECT COUNT(*) as total_sources FROM dbo.organization_review_sources;

SELECT organization_id, COUNT(*) as count 
FROM dbo.organization_review_sources 
GROUP BY organization_id 
ORDER BY count DESC;
```

This helps you understand the data you're working with.

---

## PHASE 2: APPLY MIGRATION (THE CRITICAL STEP)

### Step 2.1: Execute Migration Script

**Copy and paste this ENTIRE script into SQL Server and execute**:

```sql
/*
=============================================================
MIGRATION: Add user_id columns to organization_review_sources
=============================================================
Scripts all have IF EXISTS checks - safe to run multiple times
*/

PRINT '========================================================';
PRINT 'Starting migration...';
PRINT '========================================================';

-- ============================================================
-- STEP 1: Add user_id column (if not exists)
-- ============================================================
PRINT 'STEP 1: Adding user_id column...';
IF COL_LENGTH('dbo.organization_review_sources', 'user_id') IS NULL
BEGIN
    ALTER TABLE dbo.organization_review_sources
    ADD user_id UNIQUEIDENTIFIER NULL;
    PRINT '✓ Column user_id added successfully';
END
ELSE
BEGIN
    PRINT '✓ Column user_id already exists - skipping';
END;

-- ============================================================
-- STEP 2: Add Foreign Key constraint (if not exists)
-- ============================================================
PRINT 'STEP 2: Adding foreign key constraint...';
IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_org_review_sources_user'
      AND parent_object_id = OBJECT_ID('dbo.organization_review_sources')
)
BEGIN
    ALTER TABLE dbo.organization_review_sources
    ADD CONSTRAINT FK_org_review_sources_user
        FOREIGN KEY (user_id) REFERENCES dbo.users(user_id)
        ON DELETE CASCADE;
    PRINT '✓ Foreign key constraint created';
END
ELSE
BEGIN
    PRINT '✓ Foreign key constraint already exists - skipping';
END;

-- ============================================================
-- STEP 3: Add Index (if not exists)
-- ============================================================
PRINT 'STEP 3: Adding index on (user_id, organization_id)...';
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_org_review_sources_user_org'
      AND object_id = OBJECT_ID('dbo.organization_review_sources')
)
BEGIN
    CREATE INDEX IX_org_review_sources_user_org
    ON dbo.organization_review_sources(user_id, organization_id);
    PRINT '✓ Index created successfully';
END
ELSE
BEGIN
    PRINT '✓ Index already exists - skipping';
END;

PRINT '========================================================';
PRINT '✓ Migration completed successfully!';
PRINT '========================================================';
PRINT 'The user_id column is now ready for use.';
PRINT 'Run verification queries next.';
PRINT '========================================================';
```

**⚠️ IMPORTANT**: 
- Copy the entire script (all the SQL)
- Paste into SQL Server Management Studio
- Click Execute (or press F5)
- Wait for completion

**Expected Output** (in Messages/Output window):
```
========================================================
Starting migration...
========================================================
STEP 1: Adding user_id column...
✓ Column user_id added successfully
STEP 2: Adding foreign key constraint...
✓ Foreign key constraint created
STEP 3: Adding index on (user_id, organization_id)...
✓ Index created successfully
========================================================
✓ Migration completed successfully!
========================================================
```

✅ If you see these messages = Migration applied correctly!

---

## PHASE 3: POST-MIGRATION VERIFICATION

### Step 3.1: Verify user_id Column NOW Exists

**Run this query**:
```sql
SELECT COL_LENGTH('dbo.organization_review_sources', 'user_id') AS user_id_column;
```

**Expected Result**:
```
user_id_column
4
```

✅ If you see 4 = Column exists! ✅

---

### Step 3.2: View Updated Table Structure

**Run this query**:
```sql
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'organization_review_sources'
  AND TABLE_SCHEMA = 'dbo'
ORDER BY ORDINAL_POSITION;
```

**Expected Result** (after migration):
```
COLUMN_NAME        | DATA_TYPE           | IS_NULLABLE
source_id          | uniqueidentifier    | NO
organization_id    | uniqueidentifier    | NO
source_name        | nvarchar            | NO
source_url         | nvarchar            | YES
is_active          | bit                 | NO
fetching_frequency | nvarchar            | NO
created_at         | datetime            | NO
updated_at         | datetime            | NO
user_id            | uniqueidentifier    | YES  ✅ NEW!
```

✅ Now you should see user_id as the LAST column

---

### Step 3.3: Verify Foreign Key Constraint

**Run this query**:
```sql
SELECT 
    name,
    parent_object_name,
    referenced_object_name
FROM sys.foreign_keys fk
JOIN sys.tables t ON fk.parent_object_id = t.object_id
JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
WHERE fk.name = 'FK_org_review_sources_user';
```

**Expected Result**:
```
name                            | parent_object_name        | referenced_object_name
FK_org_review_sources_user      | organization_review_sources | users
```

✅ If you see this row = FK constraint created! ✅

---

### Step 3.4: Verify Index Created

**Run this query**:
```sql
SELECT 
    i.name,
    ic.column_id,
    c.name as column_name
FROM sys.indexes i
JOIN sys.index_columns ic ON i.object_id = ic.object_id 
    AND i.index_id = ic.index_id
JOIN sys.columns c ON ic.object_id = c.object_id 
    AND ic.column_id = c.column_id
WHERE i.object_id = OBJECT_ID('dbo.organization_review_sources')
  AND i.name = 'IX_org_review_sources_user_org'
ORDER BY ic.key_ordinal;
```

**Expected Result**:
```
name                                | column_id | column_name
IX_org_review_sources_user_org      | 1         | user_id
IX_org_review_sources_user_org      | 2         | organization_id
```

✅ If you see 2 rows with user_id first = Index created! ✅

---

### Step 3.5: View Sample Data (user_id = NULL for existing records)

**Run this query**:
```sql
SELECT TOP 20
    source_id,
    organization_id,
    user_id,  -- Will be NULL for existing records
    source_name,
    source_url,
    is_active,
    created_at
FROM dbo.organization_review_sources
ORDER BY created_at DESC;
```

**Expected Result**:
```
source_id                        | organization_id          | user_id | source_name
12345678-1234-1234-1234-123456 | org-uuid                 | NULL    | Google Reviews
87654321-4321-4321-4321-654321 | org-uuid                 | NULL    | Booking.com
...
```

✅ If you see NULL user_id = Normal for old data! ✅

---

## PHASE 4: SWAGGER TESTING (Multi-User Scenario)

### Step 4.1: Get Your Test Credentials Ready

Gather this information BEFORE testing:
- **User A Token**: (JWT/Bearer token for user A)
- **User B Token**: (JWT/Bearer token for user B - different user!)
- **Organization ID**: (ID of an org that BOTH users belong to)

**How to verify users are in same org**:
```sql
SELECT 
    u.user_name,
    uo.organization_id
FROM dbo.user_organizations uo
JOIN dbo.users u ON uo.user_id = u.user_id
WHERE uo.organization_id = '<your-org-id>';
```

If you see both users listed = Ready to test! ✅

---

### Step 4.2: Test Case 1 - User A Gets Initial Sources

**In Swagger UI**:
1. Click "Authorize" button (top right)
2. Enter: `Bearer <user-a-token>`
3. Find endpoint: **GET /api/setup/sources**
4. Set parameter: `organization_id = <org-id>`
5. Click "Try it out"

**Expected Response (200 OK)**:
```json
{
  "organization_id": "org-uuid",
  "sources": [
    {"name": "Google Reviews", "icon": "G", "connected": false},
    {"name": "Booking.com", "icon": "B", "connected": false},
    {"name": "Trip Advisor", "icon": "T", "connected": false}
  ],
  "connected_sources": []
}
```

✅ **What this proves**:
- User A can access org
- No sources selected yet
- Backend recognizes User A's token

---

### Step 4.3: Test Case 2 - User A Connects 2 Sources

**Endpoint 1: Connect Google Reviews**

**In Swagger UI**:
1. Find endpoint: **POST /api/setup/sources/connect**
2. Set request body:
```json
{
  "organization_id": "<org-id>",
  "source_name": "Google Reviews",
  "source_url": null,
  "fetching_frequency": "daily"
}
```
3. Click "Try it out"

**Expected Response (200 OK)**:
```json
{
  "message": "Source connected successfully",
  "source_id": "uuid-1",
  "organization_id": "org-uuid"
}
```

**Endpoint 2: Connect Booking.com**

Same endpoint, change request body:
```json
{
  "organization_id": "<org-id>",
  "source_name": "Booking.com",
  "source_url": null,
  "fetching_frequency": "daily"
}
```

✅ **What this proves**:
- User A can create sources
- Each source gets unique source_id
- Sources stored with User A's user_id (invisible to API, but in DB)

---

### Step 4.4: **CRITICAL TEST** - Switch to User B

**In Swagger UI**:
1. Click "Authorize" button again
2. Clear User A token
3. Enter: `Bearer <user-b-token>` (DIFFERENT USER)
4. Click Authorize

---

### Step 4.5: Test Case 3 - User B Gets Sources (SHOULD BE EMPTY!)

**In Swagger UI**:
1. Find endpoint: **GET /api/setup/sources**
2. Set parameter: `organization_id = <SAME org-id as before>`
3. Click "Try it out"

**Expected Response (200 OK)**:
```json
{
  "organization_id": "org-uuid",
  "sources": [
    {"name": "Google Reviews", "icon": "G", "connected": false},
    {"name": "Booking.com", "icon": "B", "connected": false},
    {"name": "Trip Advisor", "icon": "T", "connected": false}
  ],
  "connected_sources": []  // <-- EMPTY! Not same as User A!
}
```

🎯 **THIS IS THE KEY TEST** ✅

- **Same organization** (same org_id)
- **Different user** (User B token)
- **Different results** (User B sees no sources!)
- **This proves isolation is working!**

---

### Step 4.6: Test Case 4 - User B Connects Different Sources

**Endpoint 1: Connect TripAdvisor**

**In Swagger UI**:
1. Find endpoint: **POST /api/setup/sources/connect**
2. Set request body:
```json
{
  "organization_id": "<org-id>",
  "source_name": "Trip Advisor",
  "source_url": null,
  "fetching_frequency": "weekly"  // Different frequency than User A!
}
```
3. Click "Try it out"

**Expected Response (200 OK)**:
```json
{
  "message": "Source connected successfully",
  "source_id": "uuid-3",  // Different from User A's source_ids
  "organization_id": "org-uuid"
}
```

**Endpoint 2: Connect Custom Source**

Same endpoint, change request body:
```json
{
  "organization_id": "<org-id>",
  "source_name": "Custom Review Platform",
  "source_url": "https://reviews.custom.com/myhotel",
  "fetching_frequency": "daily"
}
```

✅ **What this proves**:
- User B creates completely different sources
- Different source_ids (UUID-3, UUID-4 vs User A's UUID-1, UUID-2)
- Different fetching frequencies possible per user

---

### Step 4.7: Test Case 5 - Verify Data Isolation with Database Query

**Run this SQL** to see complete isolation:
```sql
SELECT 
    u.user_name,
    ors.source_name,
    ors.source_url,
    ors.fetching_frequency,
    ors.user_id
FROM dbo.organization_review_sources ors
JOIN dbo.users u ON ors.user_id = u.user_id
WHERE ors.organization_id = '<your-org-id>'
  AND ors.is_active = 1
ORDER BY u.user_name, ors.created_at;
```

**Expected Result**:
```
user_name | source_name              | source_url                       | fetching_frequency | user_id
User A    | Google Reviews           | NULL                             | daily              | user-a-uuid
User A    | Booking.com              | NULL                             | daily              | user-a-uuid
User B    | Trip Advisor             | NULL                             | weekly             | user-b-uuid
User B    | Custom Review Platform   | https://reviews.custom.com/...   | daily              | user-b-uuid
```

🎯 **PROOF OF ISOLATION** ✅

- Same organization_id
- Different user_ids
- Different sources per user
- Different frequencies per user
- **Zero overlap!**

---

## PHASE 5: FINAL VERIFICATION SUMMARY

Run this query to confirm everything:

```sql
-- ============================================================
-- FINAL VERIFICATION CHECKS
-- ============================================================

-- Check 1: Column exists
PRINT 'CHECK 1: user_id column exists?';
SELECT 
    CASE 
        WHEN COL_LENGTH('dbo.organization_review_sources', 'user_id') IS NOT NULL 
        THEN '✅ YES - Column exists'
        ELSE '❌ NO - Column missing'
    END as result;

-- Check 2: FK constraint exists
PRINT 'CHECK 2: Foreign key constraint created?';
SELECT 
    CASE 
        WHEN EXISTS(SELECT 1 FROM sys.foreign_keys 
                    WHERE name = 'FK_org_review_sources_user')
        THEN '✅ YES - FK exists'
        ELSE '❌ NO - FK missing'
    END as result;

-- Check 3: Index created
PRINT 'CHECK 3: Index created?';
SELECT 
    CASE 
        WHEN EXISTS(SELECT 1 FROM sys.indexes 
                    WHERE name = 'IX_org_review_sources_user_org')
        THEN '✅ YES - Index exists'
        ELSE '❌ NO - Index missing'
    END as result;

-- Check 4: Data has user_ids
PRINT 'CHECK 4: Sources populated with user_ids?';
SELECT 
    COUNT(*) as sources_with_user_id,
    COUNT(DISTINCT user_id) as unique_users
FROM dbo.organization_review_sources
WHERE user_id IS NOT NULL;

-- Check 5: Multi-user isolation
PRINT 'CHECK 5: Multiple users have sources for same org?';
SELECT 
    organization_id,
    COUNT(DISTINCT user_id) as user_count,
    COUNT(*) as total_sources
FROM dbo.organization_review_sources
WHERE user_id IS NOT NULL
GROUP BY organization_id
ORDER BY user_count DESC;

PRINT '========================================================';
PRINT '✅ All verification checks complete!';
PRINT '========================================================';
```

---

## ✅ SUCCESS CRITERIA

Migration is complete when ALL of the following are true:

- [ ] **Phase 1**: Pre-migration check shows NULL for user_id ✅
- [ ] **Phase 2**: Migration script executes without errors ✅
- [ ] **Phase 3.1**: Post-migration check shows 4 for user_id column ✅
- [ ] **Phase 3.2**: Table structure includes user_id column ✅
- [ ] **Phase 3.3**: Foreign key FK_org_review_sources_user exists ✅
- [ ] **Phase 3.4**: Index IX_org_review_sources_user_org exists ✅
- [ ] **Phase 4.5**: User B sees EMPTY sources for same org as User A ✅
- [ ] **Phase 4.7**: SQL query shows different users with different sources ✅

**If ALL checked = Multi-user sources working perfectly!** 🎉

---

## 🆘 ISSUES?

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common problems and solutions.

---

## 📚 REFERENCE FILES

- `BEFORE_MIGRATION_CHECKS.sql` - Pre-migration verification queries
- `AFTER_MIGRATION_CHECKS.sql` - Post-migration verification queries
- `SWAGGER_TESTING_GUIDE.md` - Detailed Swagger test procedures
- `BEFORE_AFTER_COMPARISON.md` - Visual comparison of schema changes
- `TROUBLESHOOTING.md` - Problem solving guide
- `QUICK_START.md` - Quick reference guide
