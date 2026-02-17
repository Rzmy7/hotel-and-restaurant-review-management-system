-- Verify Competitor Data Setup
-- Run this after executing competitor_schema.sql and insert_mock_competitors.sql

PRINT 'Checking Competitor Database Setup...';
PRINT '';

-- 1. Check Hotels
PRINT '===== HOTELS =====';
SELECT 
    hotel_id as ID,
    name as Name,
    location as Location,
    CASE WHEN is_my_hotel = 1 THEN 'MY HOTEL' ELSE 'Competitor' END as Type,
    CASE WHEN is_tracked = 1 THEN 'Tracked' ELSE 'Available' END as Status
FROM Hotels
ORDER BY is_my_hotel DESC, is_tracked DESC, hotel_id;
PRINT '';

-- 2. Check Metrics Summary
PRINT '===== HOTEL METRICS SUMMARY =====';
SELECT 
    h.name as Hotel,
    m.avg_rating as Rating,
    m.sentiment_score as Sentiment,
    m.review_count as Reviews,
    m.response_rate as ResponseRate,
    m.recent_trend as Trend
FROM Hotels h
JOIN HotelMetrics m ON h.hotel_id = m.hotel_id
ORDER BY m.sentiment_score DESC;
PRINT '';

-- 3. Check Category Scores
PRINT '===== TOP CATEGORY SCORES =====';
SELECT TOP 5
    h.name as Hotel,
    c.category_name as Category,
    c.score as Score
FROM Hotels h
JOIN HotelCategoryScores c ON h.hotel_id = c.hotel_id
ORDER BY c.score DESC;
PRINT '';

-- 4. Check Trend Data
PRINT '===== TREND DATA SUMMARY =====';
SELECT 
    h.name as Hotel,
    COUNT(t.trend_id) as MonthsOfData,
    MIN(t.avg_rating) as MinRating,
    MAX(t.avg_rating) as MaxRating
FROM Hotels h
LEFT JOIN HotelTrendData t ON h.hotel_id = t.hotel_id
GROUP BY h.name
HAVING COUNT(t.trend_id) > 0;
PRINT '';

-- 5. Check Sentiment Distribution
PRINT '===== SENTIMENT DISTRIBUTION =====';
SELECT 
    h.name as Hotel,
    s.positive_count as Positive,
    s.neutral_count as Neutral,
    s.negative_count as Negative,
    s.very_negative_count as VeryNegative
FROM Hotels h
LEFT JOIN HotelSentimentDistribution s ON h.hotel_id = s.hotel_id
WHERE s.sentiment_id IS NOT NULL;
PRINT '';

-- 6. Summary Stats
PRINT '===== DATABASE SUMMARY =====';
SELECT 
    'Hotels' as [Table], 
    COUNT(*) as [Record Count]
FROM Hotels
UNION ALL
SELECT 'HotelMetrics', COUNT(*) FROM HotelMetrics
UNION ALL
SELECT 'HotelCategoryScores', COUNT(*) FROM HotelCategoryScores
UNION ALL
SELECT 'HotelTrendData', COUNT(*) FROM HotelTrendData
UNION ALL
SELECT 'HotelSentimentDistribution', COUNT(*) FROM HotelSentimentDistribution;

PRINT '';
PRINT 'Setup verification complete!';
