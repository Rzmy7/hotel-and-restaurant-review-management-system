-- =============================================
-- Competitor Feature - Database Tables
-- =============================================

-- 1. Junction table linking an organization to competitors it tracks.
--    All display data (name, location, sources, review stats) is read
--    from dbo.organization + dbo.source + dbo.processed_review via JOINs.
CREATE TABLE dbo.Competitors (
    id                          UNIQUEIDENTIFIER   PRIMARY KEY DEFAULT NEWID(),
    tracking_organization_id    UNIQUEIDENTIFIER   NOT NULL,   -- the org that is tracking
    competitor_organization_id  UNIQUEIDENTIFIER   NOT NULL,   -- the org being tracked as a competitor
    isTracked                   BIT                NOT NULL DEFAULT 0,
    createdAt                   DATETIME           NOT NULL DEFAULT GETDATE()
);
GO

CREATE INDEX IX_Competitors_TrackingOrg
    ON dbo.Competitors(tracking_organization_id);
GO

CREATE INDEX IX_Competitors_CompetitorOrg
    ON dbo.Competitors(competitor_organization_id);
GO
