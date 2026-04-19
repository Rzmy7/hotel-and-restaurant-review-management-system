"""
Gemini AI Client — handles communication with the Google Generative AI API for review analysis.
"""

import json
import logging
import re
from typing import List, Dict, Any

from google import genai
from google.genai import errors
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

import app.core.config as app_config

logger = logging.getLogger(__name__)

# ------------------------------------------------------------------
# SYSTEM PROMPT
# ------------------------------------------------------------------
SYSTEM_PROMPT = """Role: You are an Advanced Reputation Analyst for a Hotel Management SaaS.

Task: Analyze a batch of raw guest reviews and transform them into structured, enriched JSON objects.

Input: A JSON array of reviews. Each review has [id, platformReviewId, rating, reviewerName, text, positive_text, negative_text, reviewDate].

Rules:
1. Output MUST be ONLY a valid JSON array. Do not include markdown (```json) or text.
2. For each review, provide:
   - "sentiment": "Positive", "Neutral", "Negative".
   - "sentiment_score": A float from 1.0 (Very Negative) to 5.0 (Very Positive).
   - "categories": List of 1-3 tags from [Cleanliness, Staff, Location, Facilities, Comfort, Value, Noise, Food, Privacy, WiFi, Room Size].
   - "language": Detected language (e.g., "English", "German").
   - "keyPhrases": List of 3-5 keywords or short phrases.
   - "summary": A one-sentence professional summary of the reviewer's experience.
   - "positive_text": DO NOT extract or refine. If input had a "positive_text", return it EXACTLY verbatim. If it was null, return null.
   - "negative_text": DO NOT extract or refine. If input had a "negative_text", return it EXACTLY verbatim. If it was null, return null.
   - "ai_reply": A draft professional response to the guest. Use a professional, grateful tone.

Batch Input Data:
{batch_json}
"""

def _resolve_api_key() -> str | None:
    """
    Resolve the Gemini API key with priority:
      1. DB-stored key from admin panel (dbo.system_settings)
      2. In-memory config (updated by admin save endpoint)
      3. GENAI_KEY env var (loaded at startup)
    """
    # Try DB-stored key first (survives restarts)
    try:
        import pyodbc
        from app.core.db_utils import get_connection_string
        from app.modules.admin.services.system_settings_service import (
            ensure_system_settings_table,
            get_setting,
        )
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            ensure_system_settings_table(cursor)
            db_key = (get_setting(cursor, "review_processing_gemini_api_key") or "").strip()
            if db_key:
                # Also sync in-memory so other parts of the app see it
                app_config.GENAI_KEY = db_key
                return db_key
    except Exception as e:
        logger.debug(f"Could not read Gemini key from DB, falling back to config: {e}")

    # Fall back to in-memory / env var
    return app_config.GENAI_KEY


def _get_client():
    api_key = _resolve_api_key()
    if not api_key:
        raise RuntimeError(
            "No Gemini API key configured. "
            "Set it via Admin Panel → Review Processing → Gemini API Key, "
            "or set the GENAI_KEY environment variable."
        )
    return genai.Client(api_key=api_key, http_options={"api_version": "v1"})


@retry(
    wait=wait_exponential(multiplier=2, min=2, max=20),
    stop=stop_after_attempt(5),
    retry=retry_if_exception_type((errors.ServerError, Exception)),
    before_sleep=lambda retry_state: logger.warning(f"Gemini API busy (503/Error). Retrying in {retry_state.next_action.sleep} seconds... (Attempt {retry_state.attempt_number})")
)
def analyze_reviews_batch(reviews: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Sends a batch of reviews to Gemini and returns the enriched data.
    """
    if not reviews:
        return []

    client = _get_client()
    batch_json = json.dumps(reviews, ensure_ascii=False)
    
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite", 
            contents=SYSTEM_PROMPT.format(batch_json=batch_json)
        )
        
        # Clean response text
        text = response.text
        # Remove markdown fences if present
        text = re.sub(r'^```(?:json)?\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        
        # Parse JSON
        results = json.loads(text)
        
        if not isinstance(results, list):
            raise ValueError("Gemini returned non-list output.")
            
        return results

    except Exception as e:
        logger.error(f"Gemini analysis failed: {e}")
        logger.debug(f"Raw response text: {getattr(response, 'text', 'N/A')}")
        raise e
