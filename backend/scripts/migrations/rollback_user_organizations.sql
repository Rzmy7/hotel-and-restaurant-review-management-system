-- Rollback script to remove dbo.user_organizations table
IF OBJECT_ID('dbo.user_organizations', 'U') IS NOT NULL
BEGIN
    DROP TABLE dbo.user_organizations;
    PRINT 'Dropped table dbo.user_organizations.';
END
ELSE
BEGIN
    PRINT 'Table dbo.user_organizations does not exist or has already been dropped.';
END
