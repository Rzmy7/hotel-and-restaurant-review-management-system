-- =============================================
-- Seed Data for Source Module Tables
-- =============================================

-- 1. Insert Test Tenant
-- Use a fixed UUID for consistency in testing
DECLARE @TenantID UNIQUEIDENTIFIER = 'D7A3E7C9-8F2B-4B1A-9C1A-1A2B3C4D5E6F';

IF NOT EXISTS (SELECT 1 FROM dbo.tenants_source WHERE tenant_id = @TenantID)
BEGIN
    INSERT INTO dbo.tenants_source (tenant_id, tenant_name, created_at)
    VALUES (@TenantID, 'Grand Plaza Hotel Group', GETUTCDATE());
    PRINT 'Tenant seeded.';
END

-- 2. Insert Test Organizations for the Tenant
DECLARE @Org1ID UNIQUEIDENTIFIER = 'A1B2C3D4-E5F6-4A1B-8C2D-3E4F5A6B7C8D';
DECLARE @Org2ID UNIQUEIDENTIFIER = 'B2C3D4E5-F6A1-4B2C-9D3E-4F5A6B7C8D9E';

IF NOT EXISTS (SELECT 1 FROM dbo.organizations_source WHERE organization_id = @Org1ID)
BEGIN
    INSERT INTO dbo.organizations_source (organization_id, tenant_id, organization_name, created_at, updated_at)
    VALUES (@Org1ID, @TenantID, 'Grand Plaza - New York', GETUTCDATE(), GETUTCDATE());
    
    INSERT INTO dbo.organizations_source (organization_id, tenant_id, organization_name, created_at, updated_at)
    VALUES (@Org2ID, @TenantID, 'Grand Plaza - London', GETUTCDATE(), GETUTCDATE());
    PRINT 'Organizations seeded.';
END

-- 3. Platforms are usually seeded via script, but here is the SQL for safety
-- (Note: platforms_source uses IDENTITY for platform_id)
IF NOT EXISTS (SELECT 1 FROM dbo.platforms_source WHERE platform_name = 'TripAdvisor')
BEGIN
    INSERT INTO dbo.platforms_source (platform_name, base_url, fetching_type, platform_status, success_rate, created_at, updated_at)
    VALUES ('TripAdvisor', 'https://www.tripadvisor.com', 'SCRAPING', 'active', 0.95, GETUTCDATE(), GETUTCDATE());
    
    INSERT INTO dbo.platforms_source (platform_name, base_url, fetching_type, platform_status, success_rate, created_at, updated_at)
    VALUES ('Booking.com', 'https://www.booking.com', 'SCRAPING', 'active', 0.92, GETUTCDATE(), GETUTCDATE());
    
    INSERT INTO dbo.platforms_source (platform_name, base_url, fetching_type, platform_status, success_rate, created_at, updated_at)
    VALUES ('Google Reviews', 'https://maps.google.com', 'API', 'active', 0.98, GETUTCDATE(), GETUTCDATE());
    PRINT 'Platforms seeded.';
END

-- 4. Insert Test Source Links
-- Link a tenant's organization to a platform source
DECLARE @TripAdvisorID INT = (SELECT platform_id FROM dbo.platforms_source WHERE platform_name = 'TripAdvisor');
DECLARE @BookingID INT = (SELECT platform_id FROM dbo.platforms_source WHERE platform_name = 'Booking.com');
DECLARE @GoogleID INT = (SELECT platform_id FROM dbo.platforms_source WHERE platform_name = 'Google Reviews');
DECLARE @AgodaID INT = (SELECT platform_id FROM dbo.platforms_source WHERE platform_name = 'Agoda');
DECLARE @AirbnbID INT = (SELECT platform_id FROM dbo.platforms_source WHERE platform_name = 'Airbnb');

-- Org 1: New York
IF @TripAdvisorID IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.sources_source WHERE tenant_id = @TenantID AND organization_id = @Org1ID AND platform_id = @TripAdvisorID)
BEGIN
    INSERT INTO dbo.sources_source (source_id, tenant_id, organization_id, platform_id, source_url, source_status, fetching_frequency, success_rate, created_at)
    VALUES (NEWID(), @TenantID, @Org1ID, @TripAdvisorID, 'https://www.tripadvisor.com/Hotel_Review-g60763-d123456-Reviews-Grand_Plaza_NY.html', 'active', 'daily', 0.94, GETUTCDATE());
END

IF @BookingID IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.sources_source WHERE tenant_id = @TenantID AND organization_id = @Org1ID AND platform_id = @BookingID)
BEGIN
    INSERT INTO dbo.sources_source (source_id, tenant_id, organization_id, platform_id, source_url, source_status, fetching_frequency, success_rate, created_at)
    VALUES (NEWID(), @TenantID, @Org1ID, @BookingID, 'https://www.booking.com/hotel/us/grand-plaza-ny.html', 'active', 'daily', 0.91, GETUTCDATE());
END

IF @GoogleID IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.sources_source WHERE tenant_id = @TenantID AND organization_id = @Org1ID AND platform_id = @GoogleID)
BEGIN
    INSERT INTO dbo.sources_source (source_id, tenant_id, organization_id, platform_id, source_url, source_status, fetching_frequency, success_rate, created_at)
    VALUES (NEWID(), @TenantID, @Org1ID, @GoogleID, 'https://www.google.com/maps/place/Grand+Plaza+NY', 'active', 'daily', 0.98, GETUTCDATE());
END

-- Org 2: London
IF @TripAdvisorID IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.sources_source WHERE tenant_id = @TenantID AND organization_id = @Org2ID AND platform_id = @TripAdvisorID)
BEGIN
    INSERT INTO dbo.sources_source (source_id, tenant_id, organization_id, platform_id, source_url, source_status, fetching_frequency, success_rate, created_at)
    VALUES (NEWID(), @TenantID, @Org2ID, @TripAdvisorID, 'https://www.tripadvisor.com/Hotel_Review-g186338-d654321-Reviews-Grand_Plaza_London.html', 'paused', 'daily', 0.88, GETUTCDATE());
END

IF @BookingID IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.sources_source WHERE tenant_id = @TenantID AND organization_id = @Org2ID AND platform_id = @BookingID)
BEGIN
    INSERT INTO dbo.sources_source (source_id, tenant_id, organization_id, platform_id, source_url, source_status, fetching_frequency, success_rate, created_at)
    VALUES (NEWID(), @TenantID, @Org2ID, @BookingID, 'https://www.booking.com/hotel/gb/grand-plaza-london.html', 'active', 'weekly', 0.95, GETUTCDATE());
END

IF @AgodaID IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.sources_source WHERE tenant_id = @TenantID AND organization_id = @Org2ID AND platform_id = @AgodaID)
BEGIN
    INSERT INTO dbo.sources_source (source_id, tenant_id, organization_id, platform_id, source_url, source_status, fetching_frequency, success_rate, created_at)
    VALUES (NEWID(), @TenantID, @Org2ID, @AgodaID, 'https://www.agoda.com/grand-plaza-london/hotel/london-gb.html', 'error', 'daily', 0.45, GETUTCDATE());
END

IF @AirbnbID IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.sources_source WHERE tenant_id = @TenantID AND organization_id = @Org2ID AND platform_id = @AirbnbID)
BEGIN
    INSERT INTO dbo.sources_source (source_id, tenant_id, organization_id, platform_id, source_url, source_status, fetching_frequency, success_rate, created_at)
    VALUES (NEWID(), @TenantID, @Org2ID, @AirbnbID, 'https://www.airbnb.com/rooms/987654', 'active', 'daily', 0.99, GETUTCDATE());
END

PRINT 'Source links seeded.';

-- 5. Verify results
SELECT * FROM dbo.tenants_source;
SELECT * FROM dbo.organizations_source;
SELECT * FROM dbo.platforms_source;
SELECT * FROM dbo.sources_source;
GO
