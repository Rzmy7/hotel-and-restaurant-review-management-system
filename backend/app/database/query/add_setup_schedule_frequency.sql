/*
Adds setup schedule frequency support for onboarding sources.
Safe to run multiple times.
*/

IF OBJECT_ID('dbo.organization_review_sources', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.organization_review_sources (
        source_id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        organization_id UNIQUEIDENTIFIER NOT NULL,
        source_name NVARCHAR(100) NOT NULL,
        source_url NVARCHAR(1000) NULL,
        is_active BIT NOT NULL DEFAULT 1,
        fetching_frequency NVARCHAR(20) NOT NULL DEFAULT 'daily',
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NOT NULL DEFAULT GETDATE()
    );
END;

IF COL_LENGTH('dbo.organization_review_sources', 'fetching_frequency') IS NULL
BEGIN
    ALTER TABLE dbo.organization_review_sources
    ADD fetching_frequency NVARCHAR(20) NOT NULL
        CONSTRAINT DF_org_review_sources_fetching_frequency DEFAULT 'daily';
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'ck_org_review_sources_fetching_frequency'
      AND parent_object_id = OBJECT_ID('dbo.organization_review_sources')
)
BEGIN
    ALTER TABLE dbo.organization_review_sources
    ADD CONSTRAINT ck_org_review_sources_fetching_frequency
    CHECK (fetching_frequency IN ('hourly', 'daily', 'weekly'));
END;
