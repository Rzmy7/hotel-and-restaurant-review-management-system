"""
Competitor API - Database-backed endpoints for competitor tracking and comparison
"""
import pyodbc
import os
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from fastapi import HTTPException
from dotenv import load_dotenv

load_dotenv()

# Database connection string
DB_CONNECTION_STRING = (
    f"DRIVER={{{os.getenv('DB_DRIVER', 'ODBC Driver 17 for SQL Server')}}};"
    f"SERVER={os.getenv('DB_SERVER')};"
    f"DATABASE={os.getenv('DB_NAME')};"
    f"UID={os.getenv('DB_UID')};"
    f"PWD={os.getenv('DB_PWD')};"
    "TrustServerCertificate=yes;"
)

# ==========================================
# DATA MODELS
# ==========================================

class CompetitorModel(BaseModel):
    id: int
    name: str
    location: str
    avgRating: float
    sentimentScore: int
    reviewCount: int
    domain: str = "hotel"

class CompetitorDetailModel(BaseModel):
    id: int
    name: str
    location: str
    avgRating: float
    sentimentScore: int
    reviewCount: int
    domain: str
    positiveReviews: int
    negativeReviews: int
    neutralReviews: int
    positivePercent: int
    negativePercent: int
    responseRate: int
    avgResponseTime: str
    aspects: Dict[str, float]
    topCategories: List[Dict[str, Any]]
    recentTrend: str

class ComparisonDataModel(BaseModel):
    myHotel: CompetitorDetailModel
    competitor: CompetitorDetailModel
    insights: Dict[str, Any]
    
class RankingModel(BaseModel):
    rank: int
    id: int
    name: str
    location: str
    avgRating: float
    sentimentScore: int
    reviewCount: int
    isMyHotel: bool

# ==========================================
# DATABASE HELPER FUNCTIONS
# ==========================================

def get_db_connection():
    """Get database connection"""
    return pyodbc.connect(DB_CONNECTION_STRING)

def get_competitor_list_from_db(domain: str = "hotel") -> List[Dict]:
    """Get list of tracked competitors from database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT 
                h.hotel_id as id,
                h.name,
                h.location,
                h.domain,
                m.avg_rating as avgRating,
                m.sentiment_score as sentimentScore,
                m.review_count as reviewCount
            FROM Hotels h
            JOIN HotelMetrics m ON h.hotel_id = m.hotel_id
            WHERE h.is_tracked = 1 
            AND h.is_my_hotel = 0 
            AND h.domain = ?
            ORDER BY m.sentiment_score DESC, m.avg_rating DESC
        """
        
        cursor.execute(query, domain)
        rows = cursor.fetchall()
        
        competitors = []
        for row in rows:
            competitors.append({
                "id": row.id,
                "name": row.name,
                "location": row.location,
                "domain": row.domain,
                "avgRating": float(row.avgRating) if row.avgRating else 0.0,
                "sentimentScore": row.sentimentScore or 0,
                "reviewCount": row.reviewCount or 0
            })
        
        conn.close()
        return competitors
    except Exception as e:
        print(f"Database Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def get_available_competitors_from_db(domain: str = "hotel") -> List[Dict]:
    """Get list of available competitors to add"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT 
                h.hotel_id as id,
                h.name,
                h.location,
                h.domain,
                m.avg_rating as avgRating
            FROM Hotels h
            LEFT JOIN HotelMetrics m ON h.hotel_id = m.hotel_id
            WHERE h.is_tracked = 0 
            AND h.is_my_hotel = 0 
            AND h.domain = ?
            ORDER BY m.avg_rating DESC
        """
        
        cursor.execute(query, domain)
        rows = cursor.fetchall()
        
        competitors = []
        for row in rows:
            competitors.append({
                "id": row.id,
                "name": row.name,
                "location": row.location,
                "domain": row.domain,
                "avgRating": float(row.avgRating) if row.avgRating else 0.0
            })
        
        conn.close()
        return competitors
    except Exception as e:
        print(f"Database Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def get_competitor_details_from_db(competitor_id: int) -> Dict:
    """Get detailed competitor information"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get basic info and metrics
        query = """
            SELECT 
                h.hotel_id as id,
                h.name,
                h.location,
                h.domain,
                m.avg_rating as avgRating,
                m.sentiment_score as sentimentScore,
                m.review_count as reviewCount,
                m.positive_reviews as positiveReviews,
                m.negative_reviews as negativeReviews,
                m.neutral_reviews as neutralReviews,
                m.response_rate as responseRate,
                m.avg_response_time_days as avgResponseTime,
                m.recent_trend as recentTrend
            FROM Hotels h
            JOIN HotelMetrics m ON h.hotel_id = m.hotel_id
            WHERE h.hotel_id = ?
        """
        
        cursor.execute(query, competitor_id)
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            raise HTTPException(status_code=404, detail="Competitor not found")
        
        # Get category scores for aspects
        category_query = """
            SELECT category_name, score
            FROM HotelCategoryScores
            WHERE hotel_id = ?
            ORDER BY 
                CASE category_name
                    WHEN 'Cleanliness' THEN 1
                    WHEN 'Service' THEN 2
                    WHEN 'Location' THEN 3
                    WHEN 'Food' THEN 4
                    WHEN 'Comfort' THEN 5
                    ELSE 6
                END
        """
        cursor.execute(category_query, competitor_id)
        categories = cursor.fetchall()
        
        # Build aspects object
        aspects = {}
        top_categories = []
        for cat in categories:
            aspects[cat.category_name.lower()] = float(cat.score)
            top_categories.append({
                "name": cat.category_name, 
                "score": int(float(cat.score) * 20)
            })
        
        # Calculate percentages
        total_reviews = (row.positiveReviews or 0) + (row.negativeReviews or 0) + (row.neutralReviews or 0)
        positive_percent = int((row.positiveReviews / total_reviews * 100)) if total_reviews > 0 else 0
        negative_percent = int((row.negativeReviews / total_reviews * 100)) if total_reviews > 0 else 0
        
        competitor = {
            "id": row.id,
            "name": row.name,
            "location": row.location,
            "domain": row.domain,
            "avgRating": float(row.avgRating) if row.avgRating else 0.0,
            "sentimentScore": row.sentimentScore or 0,
            "reviewCount": row.reviewCount or 0,
            "positiveReviews": row.positiveReviews or 0,
            "negativeReviews": row.negativeReviews or 0,
            "neutralReviews": row.neutralReviews or 0,
            "positivePercent": positive_percent,
            "negativePercent": negative_percent,
            "responseRate": row.responseRate or 0,
            "avgResponseTime": f"{float(row.avgResponseTime):.1f} days" if row.avgResponseTime else "N/A",
            "aspects": aspects,
            "topCategories": top_categories,
            "recentTrend": row.recentTrend or "stable"
        }
        
        conn.close()
        return competitor
    except HTTPException:
        raise
    except Exception as e:
        print(f"Database Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def compare_with_my_hotel_from_db(competitor_id: int) -> Dict:
    """Compare competitor with my hotel"""
    try:
        # Get my hotel (is_my_hotel = 1)
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = "SELECT hotel_id FROM Hotels WHERE is_my_hotel = 1"
        cursor.execute(query)
        my_hotel_row = cursor.fetchone()
        
        if not my_hotel_row:
            conn.close()
            raise HTTPException(status_code=404, detail="Your hotel not found in database")
        
        my_hotel_id = my_hotel_row.hotel_id
        conn.close()
        
        # Get details for both hotels
        my_hotel = get_competitor_details_from_db(my_hotel_id)
        competitor = get_competitor_details_from_db(competitor_id)
        
        # Calculate differences
        rating_diff = competitor["avgRating"] - my_hotel["avgRating"]
        sentiment_diff = competitor["sentimentScore"] - my_hotel["sentimentScore"]
        review_diff = competitor["reviewCount"] - my_hotel["reviewCount"]
        response_rate_diff = competitor["responseRate"] - my_hotel["responseRate"]
        
        # Generate insights
        insights = {
            "ratingComparison": {
                "difference": round(rating_diff, 2),
                "status": "higher" if rating_diff > 0 else "lower" if rating_diff < 0 else "equal",
                "message": f"{'Higher' if rating_diff > 0 else 'Lower' if rating_diff < 0 else 'Same'} rating by {abs(rating_diff):.1f} stars"
            },
            "sentimentComparison": {
                "difference": sentiment_diff,
                "status": "higher" if sentiment_diff > 0 else "lower" if sentiment_diff < 0 else "equal",
                "message": f"{'Better' if sentiment_diff > 0 else 'Worse' if sentiment_diff < 0 else 'Same'} sentiment by {abs(sentiment_diff)}%"
            },
            "reviewVolume": {
                "difference": review_diff,
                "status": "higher" if review_diff > 0 else "lower" if review_diff < 0 else "equal",
                "message": f"{'More' if review_diff > 0 else 'Fewer' if review_diff < 0 else 'Same'} reviews by {abs(review_diff)}"
            },
            "responseRate": {
                "difference": response_rate_diff,
                "status": "higher" if response_rate_diff > 0 else "lower" if response_rate_diff < 0 else "equal",
                "message": f"{'Better' if response_rate_diff > 0 else 'Worse' if response_rate_diff < 0 else 'Same'} response rate by {abs(response_rate_diff)}%"
            },
            "strengths": competitor["topCategories"][:2],
            "recommendations": generate_recommendations(my_hotel, competitor)
        }
        
        return {
            "myHotel": my_hotel,
            "competitor": competitor,
            "insights": insights
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Database Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def generate_recommendations(my_hotel: Dict, competitor: Dict) -> List[str]:
    """Generate smart recommendations based on comparison"""
    recommendations = []
    
    if competitor["sentimentScore"] > my_hotel["sentimentScore"]:
        recommendations.append("Focus on improving service quality to boost sentiment")
    else:
        recommendations.append("Maintain current service standards")
    
    if competitor["responseRate"] > my_hotel["responseRate"]:
        recommendations.append("Increase review response rate to match competitor")
    else:
        recommendations.append("Continue current engagement practices")
    
    if competitor["avgRating"] > my_hotel["avgRating"]:
        recommendations.append("Monitor competitor pricing and amenities strategy")
    else:
        recommendations.append("Leverage rating advantage in marketing campaigns")
    
    return recommendations

def get_rankings_from_db(domain: str = "hotel") -> List[Dict]:
    """Get rankings of all hotels including my hotel"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT 
                h.hotel_id as id,
                h.name,
                h.location,
                h.is_my_hotel as isMyHotel,
                m.avg_rating as avgRating,
                m.sentiment_score as sentimentScore,
                m.review_count as reviewCount
            FROM Hotels h
            JOIN HotelMetrics m ON h.hotel_id = m.hotel_id
            WHERE h.domain = ? 
            AND (h.is_tracked = 1 OR h.is_my_hotel = 1)
            ORDER BY m.sentiment_score DESC, m.avg_rating DESC
        """
        
        cursor.execute(query, domain)
        rows = cursor.fetchall()
        
        rankings = []
        for idx, row in enumerate(rows, 1):
            rankings.append({
                "rank": idx,
                "id": row.id,
                "name": row.name,
                "location": row.location,
                "avgRating": float(row.avgRating) if row.avgRating else 0.0,
                "sentimentScore": row.sentimentScore or 0,
                "reviewCount": row.reviewCount or 0,
                "isMyHotel": bool(row.isMyHotel)
            })
        
        conn.close()
        return rankings
    except Exception as e:
        print(f"Database Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def get_comparison_chart_data_from_db(hotel_id: int) -> Dict:
    """Get chart data for comparison page - returns data for both my hotel and competitor"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get my hotel ID
        cursor.execute("SELECT hotel_id FROM Hotels WHERE is_my_hotel = 1")
        my_hotel_row = cursor.fetchone()
        
        if not my_hotel_row:
            conn.close()
            raise HTTPException(status_code=404, detail="Your hotel not found in database")
        
        my_hotel_id = my_hotel_row.hotel_id
        
        # Get trend data months (labels) - from first hotel
        month_query = """
            SELECT month
            FROM HotelTrendData
            WHERE hotel_id = ?
            GROUP BY month
            ORDER BY 
                CASE month
                    WHEN 'January' THEN 1 WHEN 'February' THEN 2 WHEN 'March' THEN 3
                    WHEN 'April' THEN 4 WHEN 'May' THEN 5 WHEN 'June' THEN 6
                    WHEN 'July' THEN 7 WHEN 'August' THEN 8 WHEN 'September' THEN 9
                    WHEN 'October' THEN 10 WHEN 'November' THEN 11 WHEN 'December' THEN 12
                END
        """
        cursor.execute(month_query, my_hotel_id)
        months = cursor.fetchall()
        labels = [m.month for m in months]
        
        # Get my hotel trend data
        trend_query = """
            SELECT month, avg_rating
            FROM HotelTrendData
            WHERE hotel_id = ?
            ORDER BY trend_id
        """
        cursor.execute(trend_query, my_hotel_id)
        my_trends = cursor.fetchall()
        my_hotel_trend_data = [float(t.avg_rating) for t in my_trends]
        
        # Get competitor trend data
        cursor.execute(trend_query, hotel_id)
        competitor_trends = cursor.fetchall()
        competitor_trend_data = [float(t.avg_rating) for t in competitor_trends]
        
        # Get my hotel sentiment distribution
        sentiment_query = """
            SELECT positive_count, neutral_count, very_negative_count
            FROM HotelSentimentDistribution
            WHERE hotel_id = ?
        """
        cursor.execute(sentiment_query, my_hotel_id)
        my_sentiment_row = cursor.fetchone()
        
        # Get competitor sentiment distribution
        cursor.execute(sentiment_query, hotel_id)
        competitor_sentiment_row = cursor.fetchone()
        
        conn.close()
        
        return {
            "trendData": {
                "labels": labels,
                "myHotelData": my_hotel_trend_data,
                "competitorData": competitor_trend_data
            },
            "sentimentData": {
                "myHotelPositive": my_sentiment_row.positive_count if my_sentiment_row else 0,
                "myHotelNeutral": my_sentiment_row.neutral_count if my_sentiment_row else 0,
                "myHotelVeryNegative": my_sentiment_row.very_negative_count if my_sentiment_row else 0,
                "competitorPositive": competitor_sentiment_row.positive_count if competitor_sentiment_row else 0,
                "competitorNeutral": competitor_sentiment_row.neutral_count if competitor_sentiment_row else 0,
                "competitorVeryNegative": competitor_sentiment_row.very_negative_count if competitor_sentiment_row else 0
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Database Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
