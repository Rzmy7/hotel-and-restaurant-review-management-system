"""
Review analysis client — delegates to the LLM Gateway.

All retry logic and alerting remain here; only the raw API call is handled
by app.services.llm_gateway which routes to the admin-assigned model.
"""

import json
import logging
import re
from typing import List, Dict, Any

from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception

from app.services.llm_gateway import call as gateway_call

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Role: You are an Advanced Reputation Analyst for a Hotel Management SaaS.

Task: Analyze a batch of raw guest reviews and transform them into structured, enriched JSON objects.

Input: A JSON array of reviews. Each review has [id, platformReviewId, rating, reviewerName, text, positive_text, negative_text, reviewDate].

Rules:
1. Output MUST be ONLY a valid JSON object in the format: {{"reviews": [review1, review2, ...]}}.
2. IMPORTANT: All string values must be properly escaped for JSON. Specifically, double quotes inside a string MUST be escaped as \\".
3. For each review, provide:
   - "sentiment": "Positive", "Neutral", "Negative".
   - "sentiment_score": A float from 1.0 (Very Negative) to 5.0 (Very Positive).
   - "categories": List of 1-3 objects from [Cleanliness, Staff, Location, Facilities, Comfort, Value, Noise, Food, Privacy, WiFi, Room Size]. Each object MUST have "name" (tag) and "score" (a score from 1 to 100).
   - "language": Detected language (e.g., "English", "German").
   - "keyPhrases": List of 3-5 keywords or short phrases.
   - "summary": A one-sentence professional summary of the reviewer's experience.
   - "positive_text": DO NOT extract or refine. If input had a "positive_text", return it EXACTLY verbatim. If it was null, return null.
   - "negative_text": DO NOT extract or refine. If input had a "negative_text", return it EXACTLY verbatim. If it was null, return null.
   - "ai_reply": A draft professional response to the guest. Use a professional, grateful tone.

Batch Input Data:
{batch_json}
"""


def repair_json(text: str) -> str:
    """
    Attempts to repair common LLM JSON errors:
    1. Truncated arrays (missing closing brackets).
    2. Trailing commas.
    3. Unbalanced braces.
    """
    # 1. Trailing commas before closing brackets/braces
    text = re.sub(r',\s*([\]}])', r'\1', text)
    
    # 2. Balance brackets if truncated (basic approach)
    open_brackets = text.count('[')
    close_brackets = text.count(']')
    if open_brackets > close_brackets:
        text += ']' * (open_brackets - close_brackets)
        
    open_braces = text.count('{')
    close_braces = text.count('}')
    if open_braces > close_braces:
        text += '}' * (open_braces - close_braces)
        
    return text


def is_retryable_exception(e: Exception) -> bool:
    """Provider-agnostic retry predicate. Rate-limit and auth errors are not retried."""
    s = str(e)
    if "429" in s or "RESOURCE_EXHAUSTED" in s or "rate_limit" in s.lower():
        return False
    if any(code in s for code in ("400", "401", "403")):
        return False
    return True


@retry(
    wait=wait_exponential(multiplier=2, min=2, max=20),
    stop=stop_after_attempt(5),
    retry=retry_if_exception(is_retryable_exception),
    before_sleep=lambda rs: logger.warning(
        f"LLM API busy. Retrying in {rs.next_action.sleep}s (attempt {rs.attempt_number})"
    ),
)
def analyze_reviews_batch(reviews: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Send a batch of reviews to the assigned LLM and return enriched data."""
    if not reviews:
        return []

    batch_json = json.dumps(reviews, ensure_ascii=False)

    try:
        # Use .replace instead of .format to avoid KeyError with braces in review text
        prompt = SYSTEM_PROMPT.replace("{batch_json}", batch_json)
        
        text = gateway_call(
            "review_processing",
            prompt,
            json_mode=False, # Disabled: provider expects 'json_schema' which we haven't implemented yet
        )
        
        # Clean up response
        text = text.strip()
        # Remove markdown blocks
        text = re.sub(r'^```(?:json)?\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        
        # Attempt to find the first { and last } to isolate the object
        # We still ask for the object structure in the prompt as it's more stable
        start_idx = text.find('{')
        end_idx = text.rfind('}')
        if start_idx == -1:
            # Fallback to array if it didn't follow the "object" rule
            start_idx = text.find('[')
            end_idx = text.rfind(']')
            
        if start_idx != -1 and end_idx != -1:
            text = text[start_idx:end_idx+1]

        try:
            results = json.loads(text)
        except json.JSONDecodeError as jde:
            logger.warning(f"Initial JSON parse failed, attempting repair: {jde.msg}")
            repaired_text = repair_json(text)
            try:
                results = json.loads(repaired_text)
            except json.JSONDecodeError:
                # Still failing, log context and raise
                logger.error(f"JSON repair failed. Snippet: {text[:200]}...{text[-200:]}")
                raise

        # If it's a dict with "reviews" key, extract it (JSON Mode standard)
        if isinstance(results, dict) and "reviews" in results:
            results = results["reviews"]

        if not isinstance(results, list):
            # Fallback: if it's a dict but NOT with "reviews" key, maybe it's a single review or weird format
            if isinstance(results, dict):
                 results = [results]
            else:
                raise ValueError("LLM returned non-list/non-dict output.")
        
        return results

    except Exception as e:
        err_str = str(e)
        logger.error(f"Review analysis failed: {err_str}")

        try:
            from app.modules.admin.services.system_alert_logger import (
                alert_gemini_quota_exceeded,
                alert_gemini_api_error,
                alert_gemini_key_missing,
            )
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                alert_gemini_quota_exceeded(err_str[:200])
            elif "No LLM model assigned" in err_str:
                alert_gemini_key_missing()
            else:
                alert_gemini_api_error(err_str[:300])
        except Exception as alert_err:
            logger.debug(f"Failed to log system alert: {alert_err}")

        if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
            try:
                from app.services.notification_helpers import notify_admin_gemini_quota_exceeded
                notify_admin_gemini_quota_exceeded()
            except Exception:
                pass

            try:
                import pyodbc
                from app.core.db_utils import get_connection_string
                from app.modules.admin.services.system_settings_service import set_setting
                with pyodbc.connect(get_connection_string()) as conn:
                    cursor = conn.cursor()
                    set_setting(cursor, "review_processing_paused", "true")
                    conn.commit()
            except Exception as pause_err:
                logger.error(f"Failed to pause review processing: {pause_err}")

        raise e
