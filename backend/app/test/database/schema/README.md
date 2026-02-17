# Competitor Backend Setup Guide

## Overview
This backend system provides database-backed API endpoints for competitor tracking, comparison, and rankings.

## Database Setup

### Step 1: Create Database Tables

Run the schema creation script to create all necessary tables:

```sql
-- Execute this file in SQL Server Management Studio or Azure Data Studio
-- File: backend/app/test/database/schema/competitor_schema.sql
```

This creates 5 tables:
- `Hotels` - Stores all hotels (yours + competitors)
- `HotelMetrics` - Stores performance metrics
- `HotelCategoryScores` - Category ratings for radar charts
- `HotelTrendData` - Historical trend data for line charts
- `HotelSentimentDistribution` - Sentiment data for bar charts

### Step 2: Insert Mock Data

Run the mock data insertion script:

```sql
-- Execute this file in SQL Server Management Studio or Azure Data Studio
-- File: backend/app/test/database/schema/insert_mock_competitors.sql
```

This inserts:
- **1 Your Hotel** (Grand Plaza Hotel)
- **4 Tracked Competitors** (Luxury Grand, Royal Beach, Seaside Paradise, Mountain View)
- **4 Available Competitors** (Jetwin, Cinnamon, Turtle watch, Turkey Lodge)
- Complete metrics, category scores, trends, and sentiment data

## API Endpoints

### 1. Get Tracked Competitors
```
GET /competitors?domain=hotel
```
Returns list of competitors you're currently tracking.

**Response:**
```json
[
  {
    "id": 2,
    "name": "Luxury Grand Resort",
    "location": "Downtown",
    "avgRating": 4.7,
    "sentimentScore": 89,
    "reviewCount": 2847,
    "domain": "hotel"
  }
]
```

### 2. Get Available Competitors
```
GET /competitors/available?domain=hotel
```
Returns competitors you can add to tracking.

**Response:**
```json
[
  {
    "id": 6,
    "name": "Jetwin hotel",
    "location": "Downtown",
    "avgRating": 4.7,
    "domain": "hotel"
  }
]
```

### 3. Get Competitor Details
```
GET /competitors/{competitor_id}
```
Get detailed information about a specific competitor.

**Response:**
```json
{
  "id": 2,
  "name": "Luxury Grand Resort",
  "avgRating": 4.7,
  "sentimentScore": 89,
  "reviewCount": 2847,
  "positiveReviews": 2534,
  "negativeReviews": 169,
  "neutralReviews": 144,
  "responseRate": 92,
  "avgResponseTime": "2.3 days",
  "topCategories": [
    {"name": "Service", "score": 98},
    {"name": "Cleanliness", "score": 96}
  ],
  "recentTrend": "up"
}
```

### 4. Compare with Your Hotel
```
GET /competitors/{competitor_id}/compare
```
Compare competitor with your hotel and get insights.

**Response:**
```json
{
  "myHotel": { ... },
  "competitor": { ... },
  "insights": {
    "ratingComparison": {
      "difference": 0.2,
      "status": "higher",
      "message": "Higher rating by 0.2 stars"
    },
    "recommendations": [
      "Focus on improving service quality to boost sentiment"
    ]
  }
}
```

### 5. Get Chart Data for Comparison
```
GET /competitors/{competitor_id}/chart-data
```
Get data for comparison page charts.

**Response:**
```json
{
  "aspects": {
    "cleanliness": 4.8,
    "service": 4.9,
    "location": 4.5,
    "food": 4.6,
    "comfort": 4.7
  },
  "trendData": [4.5, 4.6, 4.6, 4.7, 4.7, 4.8, 4.7],
  "sentimentDistribution": {
    "positive": 55,
    "neutral": 20,
    "veryNegative": 5
  }
}
```

### 6. Get Rankings
```
GET /competitors/rankings/all?domain=hotel
```
Get rankings of all hotels including yours.

**Response:**
```json
[
  {
    "rank": 1,
    "id": 2,
    "name": "Luxury Grand Resort",
    "avgRating": 4.7,
    "sentimentScore": 89,
    "isMyHotel": false
  },
  {
    "rank": 2,
    "id": 1,
    "name": "Grand Plaza Hotel",
    "avgRating": 4.5,
    "sentimentScore": 86,
    "isMyHotel": true
  }
]
```

## Running the Backend

1. **Start the server:**
```bash
cd backend/app/test
python main.py
```

2. **Access API documentation:**
```
http://127.0.0.1:8000/docs
```

3. **Test endpoints:**
- Visit Swagger UI at `/docs`
- Try each endpoint
- Check responses

## Integration with Frontend

Update your frontend to fetch from these endpoints instead of using hardcoded data:

```typescript
// Example: Fetch competitors
const fetchCompetitors = async () => {
  const response = await fetch('http://127.0.0.1:8000/competitors?domain=hotel');
  const data = await response.json();
  setCompetitors(data);
};

// Example: Compare competitor
const compareCompetitor = async (competitorId: number) => {
  const response = await fetch(`http://127.0.0.1:8000/competitors/${competitorId}/compare`);
  const data = await response.json();
  console.log('Comparison:', data);
};
```

## Database Schema

**Hotels Table:**
- `hotel_id` - Primary key
- `name` - Hotel name
- `location` - Location
- `domain` - Type (hotel, restaurant, etc.)
- `is_my_hotel` - 1 for your hotel, 0 for others
- `is_tracked` - 1 if tracking, 0 if available to add

**HotelMetrics Table:**
- All performance metrics (rating, sentiment, reviews, etc.)

**HotelCategoryScores Table:**
- Category-wise ratings (used in radar chart)

**HotelTrendData Table:**
- Monthly trend data (used in line chart)

**HotelSentimentDistribution Table:**
- Sentiment breakdown (used in bar chart)

## Next Steps

1. ✅ Run schema creation SQL
2. ✅ Insert mock data SQL
3. ✅ Start backend server
4. ✅ Test endpoints in Swagger UI
5. ⏭️ Update frontend to use API
6. ⏭️ Replace mock data with real scraped data later

## Notes

- Currently uses mock data for testing
- Later you can populate with real scraped data
- Add `hotel_id` to your scraping process to link reviews to hotels
- Metrics can be calculated from actual reviews
