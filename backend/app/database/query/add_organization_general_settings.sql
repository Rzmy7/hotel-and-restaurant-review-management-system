IF OBJECT_ID('dbo.user_organization_general_settings', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.user_organization_general_settings (
        user_id UNIQUEIDENTIFIER NOT NULL,
        organization_id UNIQUEIDENTIFIER NOT NULL,
        timezone NVARCHAR(100) NOT NULL,
        theme_preference NVARCHAR(16) NOT NULL
            CONSTRAINT DF_user_org_general_settings_theme DEFAULT 'system',
        language NVARCHAR(32) NOT NULL
            CONSTRAINT DF_user_org_general_settings_language DEFAULT 'en',
        created_at DATETIME2(7) NOT NULL
            CONSTRAINT DF_user_org_general_settings_created_at DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2(7) NOT NULL
            CONSTRAINT DF_user_org_general_settings_updated_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_user_org_general_settings
            PRIMARY KEY (user_id, organization_id),
        CONSTRAINT FK_user_org_general_settings_user
            FOREIGN KEY (user_id)
            REFERENCES dbo.users(user_id)
            ON DELETE CASCADE,
        CONSTRAINT FK_user_org_general_settings_org
            FOREIGN KEY (organization_id)
            REFERENCES dbo.organizations_source(organization_id)
            ON DELETE CASCADE
    );
END;

IF COL_LENGTH('dbo.user_organization_general_settings', 'theme_preference') IS NULL
BEGIN
    ALTER TABLE dbo.user_organization_general_settings
    ADD theme_preference NVARCHAR(16) NOT NULL
        CONSTRAINT DF_user_org_general_settings_theme DEFAULT 'system';
END;

