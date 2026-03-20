-- Notifications table for in-app user notifications
-- SQL Server (BookingScraper DB)

IF OBJECT_ID('dbo.notifications', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.notifications (
        notification_id UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_notifications PRIMARY KEY
            CONSTRAINT DF_notifications_notification_id DEFAULT NEWID(),
        user_id UNIQUEIDENTIFIER NOT NULL,
        title NVARCHAR(200) NOT NULL,
        message NVARCHAR(MAX) NOT NULL,
        notification_type NVARCHAR(30) NOT NULL
            CONSTRAINT DF_notifications_type DEFAULT 'info',
        is_read BIT NOT NULL
            CONSTRAINT DF_notifications_is_read DEFAULT 0,
        created_at DATETIME2(7) NOT NULL
            CONSTRAINT DF_notifications_created_at DEFAULT SYSUTCDATETIME(),
        read_at DATETIME2(7) NULL,
        CONSTRAINT FK_notifications_users
            FOREIGN KEY (user_id)
            REFERENCES dbo.users(user_id)
            ON DELETE CASCADE,
        CONSTRAINT CK_notifications_type_valid
            CHECK (notification_type IN ('info', 'success', 'warning', 'error', 'maintenance', 'announcement'))
    );

    CREATE INDEX IX_notifications_user_read_created
        ON dbo.notifications (user_id, is_read, created_at DESC);
END;
GO
