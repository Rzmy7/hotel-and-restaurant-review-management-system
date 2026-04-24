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

-- 2. Scraped + AI-processed reviews for each competitor
CREATE TABLE dbo.CompetitorReviews (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    competitorId    INT             NOT NULL,
    platformReviewId NVARCHAR(100)  NULL,
    rating          INT             NULL,           -- 1-5 star scale
    userName        NVARCHAR(255)   NULL,
    reviewText      NVARCHAR(MAX)   NULL,
    summary         NVARCHAR(MAX)   NULL,           -- AI-generated summary
    sentiment       NVARCHAR(50)    NULL,           -- Positive / Negative / Neutral
    categories      NVARCHAR(MAX)   NULL,           -- JSON array e.g. ["Cleanliness","Staff"]
    keyPhrases      NVARCHAR(MAX)   NULL,           -- JSON array
    language        NVARCHAR(50)    NULL DEFAULT 'English',
    reviewDate      DATE            NULL,
    source          NVARCHAR(100)   NULL DEFAULT 'Booking.com',
    createdAt       DATETIME        NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_CompetitorReviews_Competitors 
        FOREIGN KEY (competitorId) REFERENCES dbo.Competitors(id) 
        ON DELETE CASCADE
);
GO

-- Index for faster lookups
CREATE INDEX IX_CompetitorReviews_CompetitorId 
    ON dbo.CompetitorReviews(competitorId);
GO

CREATE INDEX IX_CompetitorReviews_Sentiment 
    ON dbo.CompetitorReviews(sentiment);
GO
