-- Competitor Database Schema
-- This schema supports competitor tracking and comparison features

-- Table 1: Hotels (Your hotel + Competitors)
CREATE TABLE Hotels (
    hotel_id INT PRIMARY KEY IDENTITY(1,1),
    name NVARCHAR(255) NOT NULL,
    location NVARCHAR(255),
    domain NVARCHAR(50) DEFAULT 'hotel',
    is_my_hotel BIT DEFAULT 0,  -- 1 for your hotel, 0 for competitors
    is_tracked BIT DEFAULT 0,   -- 1 if currently tracking, 0 if available to add
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);

-- Table 2: Hotel Metrics (Calculated/Mock metrics)
CREATE TABLE HotelMetrics (
    metric_id INT PRIMARY KEY IDENTITY(1,1),
    hotel_id INT NOT NULL,
    avg_rating DECIMAL(3,2),
    sentiment_score INT,
    review_count INT,
    positive_reviews INT,
    negative_reviews INT,
    neutral_reviews INT,
    response_rate INT,
    avg_response_time_days DECIMAL(5,2),
    recent_trend NVARCHAR(20), -- 'up', 'down', 'stable'
    last_updated DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (hotel_id) REFERENCES Hotels(hotel_id) ON DELETE CASCADE
);

-- Table 3: Hotel Category Scores (for radar chart comparison)
CREATE TABLE HotelCategoryScores (
    score_id INT PRIMARY KEY IDENTITY(1,1),
    hotel_id INT NOT NULL,
    category_name NVARCHAR(100),
    score DECIMAL(3,2),
    review_count INT DEFAULT 0,
    FOREIGN KEY (hotel_id) REFERENCES Hotels(hotel_id) ON DELETE CASCADE
);

-- Table 4: Hotel Trend Data (for line charts)
CREATE TABLE HotelTrendData (
    trend_id INT PRIMARY KEY IDENTITY(1,1),
    hotel_id INT NOT NULL,
    month NVARCHAR(20),
    avg_rating DECIMAL(3,2),
    review_count INT DEFAULT 0,
    FOREIGN KEY (hotel_id) REFERENCES Hotels(hotel_id) ON DELETE CASCADE
);

-- Table 5: Hotel Sentiment Distribution (for bar charts)
CREATE TABLE HotelSentimentDistribution (
    sentiment_id INT PRIMARY KEY IDENTITY(1,1),
    hotel_id INT NOT NULL,
    positive_count INT DEFAULT 0,
    neutral_count INT DEFAULT 0,
    negative_count INT DEFAULT 0,
    very_negative_count INT DEFAULT 0,
    FOREIGN KEY (hotel_id) REFERENCES Hotels(hotel_id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX idx_hotels_domain ON Hotels(domain);
CREATE INDEX idx_hotels_tracked ON Hotels(is_tracked);
CREATE INDEX idx_hotel_metrics_hotel_id ON HotelMetrics(hotel_id);
CREATE INDEX idx_category_scores_hotel_id ON HotelCategoryScores(hotel_id);
CREATE INDEX idx_trend_data_hotel_id ON HotelTrendData(hotel_id);
CREATE INDEX idx_sentiment_hotel_id ON HotelSentimentDistribution(hotel_id);
