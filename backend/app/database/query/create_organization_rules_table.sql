-- Create the organization_rule table for storing extracted rules & regulations
-- This table stores individual rules parsed from uploaded documents via Gemini AI

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'organization_rule')
BEGIN
    CREATE TABLE dbo.organization_rule (
        rule_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        organization_id UNIQUEIDENTIFIER NOT NULL,
        rule_text NVARCHAR(MAX) NOT NULL,
        rule_order INT NOT NULL DEFAULT 0,
        is_embedded BIT NOT NULL DEFAULT 0,
        source_filename NVARCHAR(500) NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

        -- Foreign key to organization table
        CONSTRAINT FK_organization_rule_organization
            FOREIGN KEY (organization_id)
            REFERENCES dbo.organization(organization_id)
            ON DELETE CASCADE
    );

    -- Index for fast lookups by organization
    CREATE NONCLUSTERED INDEX IX_organization_rule_org_id
        ON dbo.organization_rule (organization_id);

    PRINT 'Table dbo.organization_rule created successfully.';
END
ELSE
BEGIN
    PRINT 'Table dbo.organization_rule already exists.';
END
