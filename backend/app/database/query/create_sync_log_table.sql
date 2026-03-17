-- =============================================
-- Sync Log Source Table - Creation Script
-- =============================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'sync_log_source')
BEGIN
    CREATE TABLE dbo.sync_log_source (
        log_id          UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        source_id       UNIQUEIDENTIFIER NOT NULL,
        status          NVARCHAR(20)     NOT NULL,
        timestamp       DATETIME         NOT NULL DEFAULT GETUTCDATE(),
        duration_ms     INT              NOT NULL DEFAULT 0,
        reviews_fetched INT              NOT NULL DEFAULT 0,
        error_message   NVARCHAR(1000)   NULL,

        CONSTRAINT FK_SyncLog_Source 
            FOREIGN KEY (source_id) REFERENCES dbo.sources_source(source_id) 
            ON DELETE CASCADE,

        CONSTRAINT CK_SyncLog_Status 
            CHECK (status IN ('Success', 'Failed', 'In Progress'))
    );

    CREATE INDEX IX_SyncLog_SourceId ON dbo.sync_log_source(source_id);
    CREATE INDEX IX_SyncLog_Timestamp ON dbo.sync_log_source(timestamp DESC);
    
    PRINT 'sync_log_source table created.';
END
ELSE
BEGIN
    PRINT 'sync_log_source table already exists.';
END
GO
