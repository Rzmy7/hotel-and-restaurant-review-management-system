import pyodbc
from typing import Dict, List, Any
import os
import json
import re
from collections import Counter
from google import genai
from app.core.pyodbc_connection import get_connection_string
from app.modules.admin.services.system_settings_service import get_setting, ensure_system_settings_table

def get_keywords(cursor: pyodbc.Cursor, org_id: str, period_days: int) -> Dict[str, List[Dict[str, Any]]]:
    sql = """
        SELECT r.positive_text, r.negative_text
        FROM dbo.processed_review r
        JOIN dbo.source s ON r.source_id = s.source_id
        WHERE s.organization_id = ?
    """
    params = [org_id]
    if period_days > 0:
        sql += " AND r.reviewDate >= DATEADD(day, -?, GETUTCDATE())"
        params.append(period_days)
        
    cursor.execute(sql, params)
    rows = cursor.fetchall()
    
    positive_counter = Counter()
    negative_counter = Counter()
    
    stopwords = {"the", "and", "a", "to", "was", "is", "of", "in", "it", "for", "with", "were", "my", "on", "very", "room", "hotel", "at", "but", "we", "had", "not", "that", "they", "this", "our", "are", "you", "as", "be", "so", "have", "from", "there", "all", "would", "staff", "good", "great", "nice"}
    
    for row in rows:
        pos_text = str(row[0] or "").lower()
        neg_text = str(row[1] or "").lower()
        
        if pos_text:
            words = re.findall(r'\b[a-z]{4,}\b', pos_text)
            for w in words:
                if w not in stopwords:
                    positive_counter[w] += 1
                    
        if neg_text:
            words = re.findall(r'\b[a-z]{4,}\b', neg_text)
            for w in words:
                if w not in stopwords:
                    negative_counter[w] += 1
                    
    pos = [{"word": word.capitalize(), "count": count} for word, count in positive_counter.most_common(10)]
    neg = [{"word": word.capitalize(), "count": count} for word, count in negative_counter.most_common(10)]
    
    return {
        "positiveKeywords": pos or [{"word": "Cleanliness", "count": 1}],
        "negativeKeywords": neg or [{"word": "Maintenance", "count": 1}]
    }

def generate_ai_actions(metrics: dict, category_performance: list, source_comparison: list, keywords: dict) -> List[Dict[str, str]]:
    with pyodbc.connect(get_connection_string()) as connection:
        cursor = connection.cursor()
        ensure_system_settings_table(cursor)
        google_api_key = (get_setting(cursor, "reply_google_api_key") or os.getenv("GENAI_KEY", "")).strip()

    if not google_api_key:
        return [
            {"severity": "info", "title": "AI Configuration Missing", "body": "Please configure your Google Gemini API key to enable dynamic AI insights."}
        ]
        
    try:
        client = genai.Client(api_key=google_api_key)
        
        prompt = f"""
        You are an expert hotel management AI consultant. Analyze the following hotel performance data and generate 3 to 5 actionable insights.
        Return ONLY a JSON array of objects. Do not wrap it in markdown. Each object must have:
        - "severity": one of "critical", "warning", or "info". Use "critical" for severe issues, "warning" for moderate issues, and "info" for positive trends or general advice.
        - "title": A short, punchy title (max 6 words).
        - "body": A concise, actionable explanation (1-2 sentences).
        
        Data:
        Metrics: {json.dumps(metrics)}
        Categories: {json.dumps(category_performance)}
        Keywords: {json.dumps(keywords)}
        """
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
            
        actions = json.loads(text.strip())
        return actions
    except Exception as e:
        print(f"Error generating AI actions: {e}")
        return [
            {"severity": "warning", "title": "AI Generation Temporarily Unavailable", "body": "We could not generate dynamic insights at this time. Please try again later."}
        ]
