-- ============================================================
-- VERIFY 1: Confirm user_id column EXISTS
-- ============================================================
SELECT COL_LENGTH('dbo.organization_review_sources', 'user_id') AS user_id_column_length;
-- Expected Result: 4 (UNIQUEIDENTIFIER column exists)

-- ============================================================
-- VERIFY 2: View ALL columns including new user_id
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

-- Expected columns (in order):
-- 1. source_id (UNIQUEIDENTIFIER, NOT NULL)
-- 2. organization_id (UNIQUEIDENTIFIER, NOT NULL)
-- 3. source_name (NVARCHAR(100), NOT NULL)
-- 4. source_url (NVARCHAR(1000), NULLABLE)
-- 5. is_active (BIT, NOT NULL)
-- 6. fetching_frequency (NVARCHAR(20), NOT NULL)
-- 7. created_at (DATETIME, NOT NULL)
-- 8. updated_at (DATETIME, NOT NULL)
-- 9. user_id (UNIQUEIDENTIFIER, NULLABLE) <-- NEW COLUMN

-- ============================================================
-- VERIFY 3: Confirm Foreign Key Constraint EXISTS
-- ============================================================
SELECT 
    name,
    parent_object_id,
    referenced_object_id
FROM sys.foreign_keys
WHERE parent_object_id = OBJECT_ID('dbo.organization_review_sources')
  AND name = 'FK_org_review_sources_user';

-- Expected: 1 row with name = FK_org_review_sources_user

-- ============================================================
-- VERIFY 4: Confirm Index EXISTS
-- ============================================================
SELECT 
    i.name,
    i.type_desc,
    ic.is_descending_key
FROM sys.indexes i
JOIN sys.index_columns ic ON i.object_id = ic.object_id 
    AND i.index_id = ic.index_id
WHERE i.object_id = OBJECT_ID('dbo.organization_review_sources')
  AND i.name = 'IX_org_review_sources_user_org'
ORDER BY ic.key_ordinal;

-- Expected: 1 index with columns (user_id, organization_id)

-- ============================================================
-- VERIFY 5: View table structure with column details
-- ============================================================
EXEC sp_help 'dbo.organization_review_sources';

-- This shows complete table structure including:
-- - All columns with types
-- - Primary key
-- - Foreign keys (should include FK_org_review_sources_user)
-- - Indexes (should include IX_org_review_sources_user_org)

-- ============================================================
-- VERIFY 6: View current data (should have NULL user_id for old records)
-- ============================================================
SELECT TOP 20
    source_id,
    organization_id,
    user_id,  -- This will be NULL for existing records
    source_name,
    source_url,
    is_active,
    fetching_frequency,
    created_at
FROM dbo.organization_review_sources
ORDER BY created_at DESC;
