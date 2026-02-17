-- Insert Mock Competitor Data
-- This script populates the database with mock data for testing

-- Clear existing data (optional - comment out if you want to keep existing data)
DELETE FROM HotelSentimentDistribution;
DELETE FROM HotelTrendData;
DELETE FROM HotelCategoryScores;
DELETE FROM HotelMetrics;
DELETE FROM Hotels;

-- Reset identity seeds
DBCC CHECKIDENT ('Hotels', RESEED, 0);
DBCC CHECKIDENT ('HotelMetrics', RESEED, 0);
DBCC CHECKIDENT ('HotelCategoryScores', RESEED, 0);
DBCC CHECKIDENT ('HotelTrendData', RESEED, 0);
DBCC CHECKIDENT ('HotelSentimentDistribution', RESEED, 0);

-- ==========================================
-- 1. INSERT HOTELS
-- ==========================================

-- Your Hotel (is_my_hotel = 1)
INSERT INTO Hotels (name, location, domain, is_my_hotel, is_tracked) VALUES
('Grand Plaza Hotel', 'Manhattan', 'hotel', 1, 1);

-- Tracked Competitors (is_tracked = 1)
INSERT INTO Hotels (name, location, domain, is_my_hotel, is_tracked) VALUES
('Luxury Grand Resort', 'Downtown', 'hotel', 0, 1),
('Royal Beach Resort', 'Beachfront', 'hotel', 0, 1),
('Seaside Paradise Inn', 'Coastal Area', 'hotel', 0, 1),
('Mountain View Lodge', 'Hillside', 'hotel', 0, 1);

-- Available Competitors (is_tracked = 0)
INSERT INTO Hotels (name, location, domain, is_my_hotel, is_tracked) VALUES
('Jetwin hotel', 'Downtown', 'hotel', 0, 0),
('Cinnamon Hotel', 'Beachfront', 'hotel', 0, 0),
('Turtle watch Hotel', 'Coastal Area', 'hotel', 0, 0),
('Turkey Lodge', 'Hillside', 'hotel', 0, 0);

-- ==========================================
-- 2. INSERT HOTEL METRICS
-- ==========================================

INSERT INTO HotelMetrics (hotel_id, avg_rating, sentiment_score, review_count, positive_reviews, negative_reviews, neutral_reviews, response_rate, avg_response_time_days, recent_trend) VALUES
-- Your Hotel
(1, 4.5, 86, 2234, 1921, 156, 157, 88, 2.8, 'up'),
-- Tracked Competitors
(2, 4.7, 89, 2847, 2534, 169, 144, 92, 2.3, 'up'),
(3, 4.6, 88, 2156, 1897, 129, 130, 85, 3.1, 'stable'),
(4, 4.3, 82, 1654, 1356, 182, 116, 78, 4.2, 'down'),
(5, 4.2, 80, 1432, 1146, 172, 114, 74, 5.1, 'stable'),
-- Available Competitors
(6, 4.7, 87, 1876, 1632, 113, 131, 90, 2.5, 'up'),
(7, 4.6, 85, 1654, 1405, 132, 117, 83, 3.3, 'stable'),
(8, 4.3, 81, 1432, 1159, 158, 115, 76, 4.5, 'stable'),
(9, 4.2, 79, 1234, 975, 148, 111, 72, 5.3, 'down');

-- ==========================================
-- 3. INSERT CATEGORY SCORES (for radar chart)
-- ==========================================

-- Your Hotel (hotel_id = 1)
INSERT INTO HotelCategoryScores (hotel_id, category_name, score, review_count) VALUES
(1, 'Cleanliness', 4.3, 2100),
(1, 'Service', 4.6, 2050),
(1, 'Location', 4.8, 2200),
(1, 'Food', 4.2, 1950),
(1, 'Comfort', 4.4, 2150);

-- Luxury Grand Resort (hotel_id = 2)
INSERT INTO HotelCategoryScores (hotel_id, category_name, score, review_count) VALUES
(2, 'Cleanliness', 4.8, 2800),
(2, 'Service', 4.9, 2750),
(2, 'Location', 4.5, 2700),
(2, 'Food', 4.6, 2650),
(2, 'Comfort', 4.7, 2800);

-- Royal Beach Resort (hotel_id = 3)
INSERT INTO HotelCategoryScores (hotel_id, category_name, score, review_count) VALUES
(3, 'Cleanliness', 4.7, 2100),
(3, 'Service', 4.5, 2050),
(3, 'Location', 4.6, 2150),
(3, 'Food', 4.1, 2000),
(3, 'Comfort', 4.3, 2100);

-- Seaside Paradise Inn (hotel_id = 4)
INSERT INTO HotelCategoryScores (hotel_id, category_name, score, review_count) VALUES
(4, 'Cleanliness', 4.2, 1600),
(4, 'Service', 4.4, 1580),
(4, 'Location', 4.5, 1650),
(4, 'Food', 4.0, 1550),
(4, 'Comfort', 4.1, 1600);

-- Mountain View Lodge (hotel_id = 5)
INSERT INTO HotelCategoryScores (hotel_id, category_name, score, review_count) VALUES
(5, 'Cleanliness', 4.1, 1400),
(5, 'Service', 4.0, 1380),
(5, 'Location', 4.4, 1420),
(5, 'Food', 3.9, 1350),
(5, 'Comfort', 4.2, 1400);

-- ==========================================
-- 4. INSERT TREND DATA (for line chart)
-- ==========================================

-- Your Hotel - 7 months trend
INSERT INTO HotelTrendData (hotel_id, month, avg_rating, review_count) VALUES
(1, 'Jun', 4.3, 300), (1, 'Jul', 4.2, 310), (1, 'Aug', 4.3, 320),
(1, 'Sep', 4.4, 330), (1, 'Oct', 4.5, 340), (1, 'Nov', 4.6, 335),
(1, 'Dec', 4.7, 350);

-- Luxury Grand Resort
INSERT INTO HotelTrendData (hotel_id, month, avg_rating, review_count) VALUES
(2, 'Jun', 4.5, 400), (2, 'Jul', 4.6, 410), (2, 'Aug', 4.6, 405),
(2, 'Sep', 4.7, 420), (2, 'Oct', 4.7, 425), (2, 'Nov', 4.8, 430),
(2, 'Dec', 4.7, 435);

-- Royal Beach Resort
INSERT INTO HotelTrendData (hotel_id, month, avg_rating, review_count) VALUES
(3, 'Jun', 3.9, 280), (3, 'Jul', 4.0, 290), (3, 'Aug', 4.1, 300),
(3, 'Sep', 4.2, 310), (3, 'Oct', 4.3, 315), (3, 'Nov', 4.4, 320),
(3, 'Dec', 4.5, 325);

-- ==========================================
-- 5. INSERT SENTIMENT DISTRIBUTION (for bar chart)
-- ==========================================

INSERT INTO HotelSentimentDistribution (hotel_id, positive_count, neutral_count, negative_count, very_negative_count) VALUES
-- Your Hotel
(1, 45, 28, 12, 8),
-- Luxury Grand Resort
(2, 55, 20, 10, 5),
-- Royal Beach Resort
(3, 50, 25, 15, 10);

GO

-- Display summary
SELECT 
    'Hotels' as TableName, 
    COUNT(*) as RecordCount 
FROM Hotels
UNION ALL
SELECT 'HotelMetrics', COUNT(*) FROM HotelMetrics
UNION ALL
SELECT 'HotelCategoryScores', COUNT(*) FROM HotelCategoryScores
UNION ALL
SELECT 'HotelTrendData', COUNT(*) FROM HotelTrendData
UNION ALL
SELECT 'HotelSentimentDistribution', COUNT(*) FROM HotelSentimentDistribution;

GO
