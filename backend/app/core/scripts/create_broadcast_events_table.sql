-- Broadcast event table for admin broadcasting history
-- SQL Server (BookingScraper DB)

IF OBJECT_ID('dbo.broadcast_events', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.broadcast_events (
        broadcast_id UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_broadcast_events PRIMARY KEY
            CONSTRAINT DF_broadcast_events_id DEFAULT NEWID(),
        subject NVARCHAR(120) NOT NULL,
        body NVARCHAR(MAX) NOT NULL,
        channel NVARCHAR(20) NOT NULL,
        audience_type NVARCHAR(20) NOT NULL,
        audience_value NVARCHAR(100) NULL,
        audience_label NVARCHAR(200) NOT NULL,
        message_type NVARCHAR(30) NOT NULL,
        recipient_count INT NOT NULL
            CONSTRAINT DF_broadcast_events_recipient_count DEFAULT 0,
        status NVARCHAR(20) NOT NULL
            CONSTRAINT DF_broadcast_events_status DEFAULT 'sent',
        schedule_type NVARCHAR(20) NOT NULL
            CONSTRAINT DF_broadcast_events_schedule_type DEFAULT 'now',
        scheduled_at DATETIME2(7) NULL,
        sent_at DATETIME2(7) NULL,
        sent_by NVARCHAR(255) NULL,
        created_at DATETIME2(7) NOT NULL
            CONSTRAINT DF_broadcast_events_created_at DEFAULT SYSUTCDATETIME(),

        CONSTRAINT CK_broadcast_events_channel_valid
            CHECK (channel IN ('email', 'notification', 'both')),
        CONSTRAINT CK_broadcast_events_audience_type_valid
            CHECK (audience_type IN ('all', 'role', 'plan')),
        CONSTRAINT CK_broadcast_events_message_type_valid
            CHECK (message_type IN ('info', 'warning', 'maintenance', 'announcement')),
        CONSTRAINT CK_broadcast_events_schedule_type_valid
            CHECK (schedule_type IN ('now', 'scheduled')),
        CONSTRAINT CK_broadcast_events_status_valid
            CHECK (status IN ('sent', 'failed', 'pending'))
    );

    CREATE INDEX IX_broadcast_events_created_at
        ON dbo.broadcast_events (created_at DESC);
END;
GO
