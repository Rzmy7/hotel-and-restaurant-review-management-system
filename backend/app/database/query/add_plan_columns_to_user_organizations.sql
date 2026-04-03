/*
Adds per-user subscription plan fields to dbo.user_organizations.
Safe to run multiple times on SQL Server.
*/

IF COL_LENGTH('dbo.user_organizations', 'plan_id') IS NULL
BEGIN
    ALTER TABLE dbo.user_organizations
    ADD plan_id INT NULL;
END;

IF COL_LENGTH('dbo.user_organizations', 'plan_status') IS NULL
BEGIN
    ALTER TABLE dbo.user_organizations
    ADD plan_status NVARCHAR(30) NOT NULL
        CONSTRAINT DF_user_org_plan_status DEFAULT 'active';
END;

IF COL_LENGTH('dbo.user_organizations', 'plan_assigned_at') IS NULL
BEGIN
    ALTER TABLE dbo.user_organizations
    ADD plan_assigned_at DATETIME2(7) NULL;
END;

IF COL_LENGTH('dbo.user_organizations', 'plan_updated_at') IS NULL
BEGIN
    ALTER TABLE dbo.user_organizations
    ADD plan_updated_at DATETIME2(7) NULL;
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_user_org_plan'
      AND parent_object_id = OBJECT_ID('dbo.user_organizations')
)
BEGIN
    ALTER TABLE dbo.user_organizations
    ADD CONSTRAINT FK_user_org_plan
    FOREIGN KEY (plan_id) REFERENCES dbo.plans(plan_id) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_user_org_plan_id'
      AND object_id = OBJECT_ID('dbo.user_organizations')
)
BEGIN
    CREATE INDEX IX_user_org_plan_id ON dbo.user_organizations(plan_id);
END;
