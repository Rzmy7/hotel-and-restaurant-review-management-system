-- Idempotent script to create dbo.user_organizations table, indexes, and perform backfill
IF OBJECT_ID('dbo.user_organizations', 'U') IS NULL
BEGIN
    -- 1. Create table with primary key and foreign key constraints
    CREATE TABLE dbo.user_organizations (
        user_id UNIQUEIDENTIFIER NOT NULL,
        organization_id UNIQUEIDENTIFIER NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'owner',
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        joined_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT PK_user_organizations PRIMARY KEY (user_id, organization_id),
        CONSTRAINT FK_user_organizations_user FOREIGN KEY (user_id) REFERENCES dbo.[user](user_id),
        CONSTRAINT FK_user_organizations_organization FOREIGN KEY (organization_id) REFERENCES dbo.organization(organization_id) ON DELETE CASCADE
    );
    PRINT 'Table dbo.user_organizations created successfully.';
END
ELSE
BEGIN
    PRINT 'Table dbo.user_organizations already exists.';
END

-- 2. Create index on user_id if not exists
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = 'IX_user_organizations_user_id' 
      AND object_id = OBJECT_ID('dbo.user_organizations')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_user_organizations_user_id 
    ON dbo.user_organizations(user_id);
    PRINT 'Index IX_user_organizations_user_id created successfully.';
END

-- 3. Create index on organization_id if not exists
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = 'IX_user_organizations_organization_id' 
      AND object_id = OBJECT_ID('dbo.user_organizations')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_user_organizations_organization_id 
    ON dbo.user_organizations(organization_id);
    PRINT 'Index IX_user_organizations_organization_id created successfully.';
END

-- 4. Backfill data: populate membership rows from existing organizations (organization.tenant_id -> user_organizations.user_id)
INSERT INTO dbo.user_organizations (user_id, organization_id, role, created_at, joined_at)
SELECT 
    o.tenant_id, 
    o.organization_id, 
    'owner', 
    o.created_at, 
    o.created_at
FROM dbo.organization o
WHERE NOT EXISTS (
    SELECT 1 
    FROM dbo.user_organizations uo 
    WHERE uo.user_id = o.tenant_id 
      AND uo.organization_id = o.organization_id
)
-- Ensure the tenant/user actually exists in the user table to avoid FK violation
AND EXISTS (
    SELECT 1
    FROM dbo.[user] u
    WHERE u.user_id = o.tenant_id
);

PRINT 'Backfill completed. Mapped owners for existing organizations.';
