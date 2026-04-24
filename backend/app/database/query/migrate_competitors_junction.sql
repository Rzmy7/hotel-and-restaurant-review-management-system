-- =============================================
-- Migration: Simplify dbo.Competitors into a junction table
-- 
-- Before: Competitors stores redundant org data (name, location, source_url, etc.)
-- After:  Competitors is a linking table between tracking_org and competitor_org
-- =============================================

-- Step 1: Rename organization_id → competitor_organization_id
IF COL_LENGTH('dbo.Competitors', 'organization_id') IS NOT NULL
   AND COL_LENGTH('dbo.Competitors', 'competitor_organization_id') IS NULL
BEGIN
    EXEC sp_rename 'dbo.Competitors.organization_id', 'competitor_organization_id', 'COLUMN';
END
GO

-- Step 2: Drop redundant columns (data now comes from dbo.organization + dbo.processed_review)
IF COL_LENGTH('dbo.Competitors', 'name') IS NOT NULL
    ALTER TABLE dbo.Competitors DROP COLUMN name;
GO
IF COL_LENGTH('dbo.Competitors', 'location') IS NOT NULL
    ALTER TABLE dbo.Competitors DROP COLUMN location;
GO
IF COL_LENGTH('dbo.Competitors', 'source_url') IS NOT NULL
    ALTER TABLE dbo.Competitors DROP COLUMN source_url;
GO
IF COL_LENGTH('dbo.Competitors', 'platform_id') IS NOT NULL
    ALTER TABLE dbo.Competitors DROP COLUMN platform_id;
GO
IF COL_LENGTH('dbo.Competitors', 'avgRating') IS NOT NULL
    ALTER TABLE dbo.Competitors DROP COLUMN avgRating;
GO
IF COL_LENGTH('dbo.Competitors', 'sentimentScore') IS NOT NULL
    ALTER TABLE dbo.Competitors DROP COLUMN sentimentScore;
GO
IF COL_LENGTH('dbo.Competitors', 'reviewCount') IS NOT NULL
    ALTER TABLE dbo.Competitors DROP COLUMN reviewCount;
GO
IF COL_LENGTH('dbo.Competitors', 'status') IS NOT NULL
    ALTER TABLE dbo.Competitors DROP COLUMN status;
GO
IF COL_LENGTH('dbo.Competitors', 'bookingUrl') IS NOT NULL
    ALTER TABLE dbo.Competitors DROP COLUMN bookingUrl;
GO

-- Result: dbo.Competitors now has only:
--   id (uniqueidentifier PK)
--   tracking_organization_id (uniqueidentifier) — the org doing the tracking
--   competitor_organization_id (uniqueidentifier) — the org being tracked
--   isTracked (bit)
--   createdAt (datetime)
