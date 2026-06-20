-- Idempotent script to drop the unused dbo.organization_review_sources table
IF OBJECT_ID('dbo.organization_review_sources', 'U') IS NOT NULL
BEGIN
    DROP TABLE dbo.organization_review_sources;
    PRINT 'Dropped table dbo.organization_review_sources';
END
ELSE
BEGIN
    PRINT 'Table dbo.organization_review_sources does not exist or has already been dropped.';
END
