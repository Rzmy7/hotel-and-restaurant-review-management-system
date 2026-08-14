"""Admin insights service — dashboard stats + Gemini AI insights."""

import json
import re

import pyodbc
from app.core.pyodbc_connection import get_connection_string
from app.services.llm_gateway import call as gateway_call


def _table_exists(cursor, table_name: str) -> bool:
    cursor.execute("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = ?", table_name)
    return cursor.fetchone()[0] > 0


def get_dashboard_stats():
    try:
        conn = pyodbc.connect(get_connection_string())
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM dbo.[user]")
        total_users = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM dbo.[user] WHERE is_active = 1")
        active_users = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM dbo.processed_review")
        total_reviews = cursor.fetchone()[0]
        competitor_count = 0
        if _table_exists(cursor, "Competitors"):
            cursor.execute("SELECT COUNT(*) FROM dbo.Competitors")
            competitor_count = cursor.fetchone()[0]
        org_count = 0
        if _table_exists(cursor, "Organizations"):
            cursor.execute("SELECT COUNT(*) FROM dbo.Organizations")
            org_count = cursor.fetchone()[0]
        conn.close()
        return {"totalUsers": total_users, "activeUsers": active_users, "totalReviews": total_reviews, "totalCompetitors": competitor_count, "totalOrganizations": org_count}
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))


def generate_ai_insights():
    try:
        conn = pyodbc.connect(get_connection_string())
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM dbo.processed_review")
        total_reviews = cursor.fetchone()[0]
        cursor.execute("SELECT AVG(CAST(rating AS FLOAT)) FROM dbo.processed_review")
        avg_rating = cursor.fetchone()[0] or 0
        cursor.execute("SELECT sentiment, COUNT(*) as cnt FROM dbo.processed_review GROUP BY sentiment")
        sentiment_dist = {r.sentiment: r.cnt for r in cursor.fetchall()}
        cursor.execute("SELECT TOP 5 categories, COUNT(*) as cnt FROM dbo.processed_review WHERE categories IS NOT NULL GROUP BY categories ORDER BY cnt DESC")
        top_cats = [(r.categories, r.cnt) for r in cursor.fetchall()]
        conn.close()

        prompt = f"""You are an AI hospitality analyst. Given these stats, generate business insights.

Stats:
- Total reviews: {total_reviews}
- Average rating: {round(avg_rating, 2)}
- Sentiment: Positive={sentiment_dist.get('Positive', 0)}, Neutral={sentiment_dist.get('Neutral', 0)}, Negative={sentiment_dist.get('Negative', 0)}
- Top categories: {json.dumps(top_cats)}

Return JSON:
{{
  "summary": "one-paragraph executive summary",
  "strengths": ["list of 2-3 strengths"],
  "improvements": ["list of 2-3 improvement areas"],
  "recommendations": ["list of 2-3 actionable recommendations"]
}}

Return ONLY valid JSON. No markdown."""

        response_text = gateway_call("insights", prompt)
        pattern = r"^```(?:json)?\s*(.*?)\s*```$"
        match = re.search(pattern, response_text, re.DOTALL | re.MULTILINE)
        clean_text = match.group(1) if match else response_text
        return json.loads(clean_text)
    except Exception as e:
        return {"summary": "Unable to generate insights at this time.", "strengths": [], "improvements": [], "recommendations": [], "error": str(e)}
