/*
Adds user_id support to organization_review_sources for per-user source management.
Enables different users in the same organization to select different review sources.
Safe to run multiple times.
*/

-- SQL Server version
IF OBJECT_ID('dbo.organization_review_sources', 'U') IS NOT NULL
BEGIN
    -- Add user_id column if it doesn't exist
    IF COL_LENGTH('dbo.organization_review_sources', 'user_id') IS NULL
    BEGIN
        ALTER TABLE dbo.organization_review_sources
        ADD user_id UNIQUEIDENTIFIER NULL;
    END

    -- Add FK constraint to users table if it doesn't exist
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
    END

    -- Add index on (user_id, organization_id) for query performance
    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IX_org_review_sources_user_org'
          AND object_id = OBJECT_ID('dbo.organization_review_sources')
    )
    BEGIN
        CREATE INDEX IX_org_review_sources_user_org
        ON dbo.organization_review_sources(user_id, organization_id);
    END
END;
