-- Migration script to convert naive DATETIME columns to DATETIMEOFFSET in Scraper Engine
-- This version handles dropping existing default constraints and indexes before altering columns.

BEGIN TRANSACTION;

-- Helper to drop default constraint and alter column
-- 1. Table: sources
DECLARE @ConstraintName nvarchar(200)
SELECT @ConstraintName = Name FROM sys.default_constraints WHERE parent_object_id = OBJECT_ID('sources') AND parent_column_id = (SELECT column_id FROM sys.columns WHERE name = 'created_at' AND object_id = OBJECT_ID('sources'))
IF @ConstraintName IS NOT NULL EXEC('ALTER TABLE sources DROP CONSTRAINT ' + @ConstraintName)
ALTER TABLE sources ALTER COLUMN created_at DATETIMEOFFSET;
ALTER TABLE sources ADD CONSTRAINT DF_sources_created_at DEFAULT SYSDATETIMEOFFSET() FOR created_at;

-- 2. Table: reviews
SELECT @ConstraintName = Name FROM sys.default_constraints WHERE parent_object_id = OBJECT_ID('reviews') AND parent_column_id = (SELECT column_id FROM sys.columns WHERE name = 'created_at' AND object_id = OBJECT_ID('reviews'))
IF @ConstraintName IS NOT NULL EXEC('ALTER TABLE reviews DROP CONSTRAINT ' + @ConstraintName)
ALTER TABLE reviews ALTER COLUMN created_at DATETIMEOFFSET;
ALTER TABLE reviews ADD CONSTRAINT DF_reviews_created_at DEFAULT SYSDATETIMEOFFSET() FOR created_at;

-- 3. Table: review_media
SELECT @ConstraintName = Name FROM sys.default_constraints WHERE parent_object_id = OBJECT_ID('review_media') AND parent_column_id = (SELECT column_id FROM sys.columns WHERE name = 'created_at' AND object_id = OBJECT_ID('review_media'))
IF @ConstraintName IS NOT NULL EXEC('ALTER TABLE review_media DROP CONSTRAINT ' + @ConstraintName)
ALTER TABLE review_media ALTER COLUMN created_at DATETIMEOFFSET;
ALTER TABLE review_media ADD CONSTRAINT DF_review_media_created_at DEFAULT SYSDATETIMEOFFSET() FOR created_at;

-- 4. Table: audit_log
-- Drop index first
IF EXISTS (SELECT name FROM sys.indexes WHERE name = 'IX_audit_timestamp' AND object_id = OBJECT_ID('audit_log'))
    DROP INDEX IX_audit_timestamp ON audit_log;

SELECT @ConstraintName = Name FROM sys.default_constraints WHERE parent_object_id = OBJECT_ID('audit_log') AND parent_column_id = (SELECT column_id FROM sys.columns WHERE name = 'timestamp' AND object_id = OBJECT_ID('audit_log'))
IF @ConstraintName IS NOT NULL EXEC('ALTER TABLE audit_log DROP CONSTRAINT ' + @ConstraintName)
ALTER TABLE audit_log ALTER COLUMN timestamp DATETIMEOFFSET;
ALTER TABLE audit_log ADD CONSTRAINT DF_audit_log_timestamp DEFAULT SYSDATETIMEOFFSET() FOR timestamp;

-- Recreate index
CREATE INDEX IX_audit_timestamp ON audit_log (timestamp);

COMMIT;

PRINT 'Migration to DATETIMEOFFSET completed successfully.';
