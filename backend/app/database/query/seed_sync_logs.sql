-- =============================================
-- Seed Data for Sync Log Source
-- =============================================

-- Ensure table exists
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
END

-- Seed additional sync logs for the existing sources
-- Use the same UUIDs from seed_source_data.sql if possible, or just seed for whatever is in the table

INSERT INTO sync_log_source (log_id, source_id, status, timestamp, duration_ms, reviews_fetched, error_message)
SELECT 
    NEWID(), 
    source_id, 
    CASE WHEN ABS(CHECKSUM(NEWID())) % 5 = 0 THEN 'Failed' ELSE 'Success' END,
    DATEADD(minute, -ABS(CHECKSUM(NEWID())) % 10000, GETUTCDATE()),
    ABS(CHECKSUM(NEWID())) % 5000 + 1000,
    ABS(CHECKSUM(NEWID())) % 50,
    CASE WHEN ABS(CHECKSUM(NEWID())) % 5 = 0 THEN 'Network timeout during scraping' ELSE NULL END
FROM sources_source;

-- Add a few more for specific sources to have a "history"
INSERT INTO sync_log_source (log_id, source_id, status, timestamp, duration_ms, reviews_fetched)
SELECT TOP 5
    NEWID(), 
    source_id, 
    'Success',
    DATEADD(hour, -1, GETUTCDATE()),
    3200,
    5
FROM sources_source;
