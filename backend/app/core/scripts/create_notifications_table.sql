-- Normalized notification schema for in-app notifications
-- SQL Server (BookingScraper DB)

IF OBJECT_ID('dbo.notifications', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.notifications (
        notification_id UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_notifications PRIMARY KEY
            CONSTRAINT DF_notifications_notification_id DEFAULT NEWID(),
        title NVARCHAR(200) NOT NULL,
        message NVARCHAR(MAX) NOT NULL,
        notification_type NVARCHAR(30) NOT NULL
            CONSTRAINT DF_notifications_type DEFAULT 'info',
        created_at DATETIME2(7) NOT NULL
            CONSTRAINT DF_notifications_created_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT CK_notifications_type_valid
            CHECK (notification_type IN ('info', 'success', 'warning', 'error', 'maintenance', 'announcement'))
    );

    CREATE INDEX IX_notifications_created_at
        ON dbo.notifications (created_at DESC);
END;
GO

IF OBJECT_ID('dbo.user_notifications', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.user_notifications (
        notification_id UNIQUEIDENTIFIER NOT NULL,
        user_id UNIQUEIDENTIFIER NOT NULL,
        is_read BIT NOT NULL
            CONSTRAINT DF_user_notifications_is_read DEFAULT 0,
        read_at DATETIME2(7) NULL,
        delivered_at DATETIME2(7) NOT NULL
            CONSTRAINT DF_user_notifications_delivered_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_user_notifications PRIMARY KEY (notification_id, user_id),
        CONSTRAINT FK_user_notifications_notification
            FOREIGN KEY (notification_id)
            REFERENCES dbo.notifications(notification_id)
            ON DELETE CASCADE,
        CONSTRAINT FK_user_notifications_user
            FOREIGN KEY (user_id)
            REFERENCES dbo.users(user_id)
            ON DELETE CASCADE
    );

    CREATE INDEX IX_user_notifications_user_read_notification
        ON dbo.user_notifications (user_id, is_read, notification_id);
END;
GO
