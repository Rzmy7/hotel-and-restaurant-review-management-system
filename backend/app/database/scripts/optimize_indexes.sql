-- Performance Optimization: Database Indexing Strategy
-- Target: dbo.processed_review

-- 1. Index for default sorting and date range filtering
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_review_date' AND object_id = OBJECT_ID('dbo.processed_review'))
BEGIN
    CREATE INDEX idx_review_date ON dbo.processed_review (reviewDate DESC);
END

-- 2. Index for filtering by status (pending, processed, failed)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_review_status' AND object_id = OBJECT_ID('dbo.processed_review'))
BEGIN
    CREATE INDEX idx_review_status ON dbo.processed_review (status);
END

-- 3. Composite index for organization-level dashboard queries
-- Speeds up queries joining source and processed_review filtered by organization_id
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_review_source_status' AND object_id = OBJECT_ID('dbo.processed_review'))
BEGIN
    CREATE INDEX idx_review_source_status ON dbo.processed_review (source_id, status);
END

-- 4. Index for rating distribution and filtering
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_review_rating' AND object_id = OBJECT_ID('dbo.processed_review'))
BEGIN
    CREATE INDEX idx_review_rating ON dbo.processed_review (rating);
END

-- 5. Index for sentiment analysis filtering
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_review_sentiment' AND object_id = OBJECT_ID('dbo.processed_review'))
BEGIN
    CREATE INDEX idx_review_sentiment ON dbo.processed_review (sentiment);
END
