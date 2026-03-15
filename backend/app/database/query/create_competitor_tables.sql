-- =============================================
-- Competitor Feature - Database Tables
-- =============================================

-- 1. Master list of competitor hotels (added by admin)
-- Users pick from this list to track competitors
CREATE TABLE dbo.Competitors (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    name            NVARCHAR(255)   NOT NULL,
    location        NVARCHAR(255)   NULL,
    bookingUrl      NVARCHAR(500)   NULL,
    avgRating       FLOAT           NULL DEFAULT 0,
    sentimentScore  FLOAT           NULL DEFAULT 0,    -- % positive reviews
    reviewCount     INT             NULL DEFAULT 0,
    isTracked       BIT             NOT NULL DEFAULT 0, -- 0 = available pool, 1 = user is tracking
    status          NVARCHAR(50)    NOT NULL DEFAULT 'Pending', -- 'Active' (scraped), 'Pending', 'Scraping'
    createdAt       DATETIME        NOT NULL DEFAULT GETDATE()
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
