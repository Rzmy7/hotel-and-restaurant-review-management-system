# QUICK EXECUTION GUIDE

## STEP 1: Check Current State
File: `BEFORE_MIGRATION_CHECKS.sql`
- Copy and run CHECK 1 query
- You should see: **NULL** (user_id column doesn't exist yet)

---

## STEP 2: Apply Migration
Paste this IN SQL SERVER:

```sql
-- Add user_id column
IF COL_LENGTH('dbo.organization_review_sources', 'user_id') IS NULL
BEGIN
    ALTER TABLE dbo.organization_review_sources
    ADD user_id UNIQUEIDENTIFIER NULL;
    PRINT 'user_id column added';
END;

-- Add FK constraint
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys 
    WHERE name = 'FK_org_review_sources_user'
      AND parent_object_id = OBJECT_ID('dbo.organization_review_sources'))
BEGIN
    ALTER TABLE dbo.organization_review_sources
    ADD CONSTRAINT FK_org_review_sources_user
        FOREIGN KEY (user_id) REFERENCES dbo.users(user_id)
        ON DELETE CASCADE;
    PRINT 'FK constraint added';
END;

-- Add Index
IF NOT EXISTS (SELECT 1 FROM sys.indexes
    WHERE name = 'IX_org_review_sources_user_org'
      AND object_id = OBJECT_ID('dbo.organization_review_sources'))
BEGIN
    CREATE INDEX IX_org_review_sources_user_org
    ON dbo.organization_review_sources(user_id, organization_id);
    PRINT 'Index created';
END;

PRINT 'Migration Complete!';
```

---

## STEP 3: Verify Migration Applied
File: `AFTER_MIGRATION_CHECKS.sql`
- Run VERIFY 1 query
- You should see: **4** (user_id column now exists!)

---

## STEP 4: Test in Swagger
File: `SWAGGER_TESTING_GUIDE.md`
- Follow 13 test cases
- Most important: **Test 5** - User B should see empty sources for same org as User A

---

## STEP 5: Final DB Check

Run this query to see data separation:
```sql
SELECT 
    u.user_name,
    ors.source_name,
    ors.user_id
FROM dbo.organization_review_sources ors
JOIN dbo.users u ON ors.user_id = u.user_id
WHERE ors.organization_id = '<your-org-id>'
ORDER BY u.user_name;
```

Expected: Different users = different source_ids!

---

## KEY SUCCESS INDICATORS

✅ Migration completes without errors
✅ VERIFY 1 query returns 4 (column exists)
✅ Test 5 in Swagger: User B sees empty sources
✅ Test 9 DB query: Different users have different source records
✅ Final DB query shows complete data separation per user
