-- ============================================================
-- CHECK 1: Verify user_id column DOES NOT exist yet
-- ============================================================
SELECT COL_LENGTH('dbo.organization_review_sources', 'user_id') AS user_id_column_length;
-- Result: NULL = Column does NOT exist (you should see this now)
-- Result: 4 = Column EXISTS (after migration)

-- ============================================================
-- CHECK 2: View all current columns in the table
-- ============================================================
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'organization_review_sources'
  AND TABLE_SCHEMA = 'dbo'
ORDER BY ORDINAL_POSITION;

-- Expected BEFORE: source_id, organization_id, source_name, source_url, is_active, fetching_frequency, created_at, updated_at
-- Expected AFTER: (same as above) + user_id

-- ============================================================
-- CHECK 3: View current data in the table
-- ============================================================
SELECT TOP 10 
    source_id,
    organization_id,
    source_name,
    source_url,
    is_active,
    fetching_frequency,
    created_at,
    updated_at
FROM dbo.organization_review_sources
ORDER BY created_at DESC;

-- ============================================================
-- CHECK 4: Check for FK constraint (should NOT exist yet)
-- ============================================================
SELECT name
FROM sys.foreign_keys
WHERE parent_object_id = OBJECT_ID('dbo.organization_review_sources')
  AND name = 'FK_org_review_sources_user';
-- Result: No rows = FK doesn't exist yet (normal before migration)

-- ============================================================
-- CHECK 5: Check for index (should NOT exist yet)
-- ============================================================
SELECT name
FROM sys.indexes
WHERE object_id = OBJECT_ID('dbo.organization_review_sources')
  AND name = 'IX_org_review_sources_user_org';
-- Result: No rows = Index doesn't exist yet (normal before migration)
