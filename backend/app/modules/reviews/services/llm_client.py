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
   - "id": The exact ID of the review verbatim from the input (critical for mapping).
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
    4. Unclosed strings (if truncated mid-sentence).
    """
    text = text.strip()
    
    # 1. Handle unclosed strings (heuristic: odd number of non-escaped quotes)
    # This is a basic check. If the text ends while a string is open, close it.
    quotes = re.findall(r'(?<!\\)"', text)
    if len(quotes) % 2 != 0:
        # If it ends with a backslash, remove it to avoid escaping our new quote
        if text.endswith('\\'):
            text = text[:-1]
        text += '"'

    # 2. Trailing commas before closing brackets/braces
    text = re.sub(r',\s*([\]}])', r'\1', text)
    
    # 3. Balance brackets if truncated (basic approach)
    open_brackets = text.count('[')
    close_brackets = text.count(']')
    if open_brackets > close_brackets:
        text += ']' * (open_brackets - close_brackets)
        
    open_braces = text.count('{')
    close_braces = text.count('}')
    if open_braces > close_braces:
        text += '}' * (open_braces - close_braces)
        
    return text


def _is_billing_error(s: str) -> bool:
    """Return True if the error string indicates a billing / credit-limit problem."""
    lower = s.lower()
    billing_keywords = [
        "402",
        "429",
        "resource_exhausted",
        "insufficient_quota",
        "insufficient credits",
        "insufficient funds",
        "insufficient balance",
        "quota exceeded",
        "exceeded your current quota",
        "out of credits",
        "credits exhausted",
        "credit limit reached",
        "billing limit reached",
        "billing details",
        "payment required",
        "rate limit reached",
        "rate_limit_exceeded",
        "too many requests",
    ]
    if any(keyword in lower for keyword in billing_keywords):
        return True
    return ("credits" in lower and "max_tokens" in lower)


def _detect_fatal_error(e: Exception | str) -> tuple[bool, str]:
    """
    Determine if an exception/error represents an unrecoverable/fatal condition
    that should NOT be retried and SHOULD auto-pause review processing.
    Returns (is_fatal, reason_code).
    """
    s = str(e)
    s_lower = s.lower()

    if _is_billing_error(s):
        return True, "api_limit"
    if "llm_encryption_key" in s_lower or "encryption" in s_lower:
        return True, "encryption_key_error"
    if "no llm model assigned" in s_lower or "no active model" in s_lower:
        return True, "no_model_assigned"
    if any(k in s_lower for k in ("unauthorized", "forbidden", "invalid api key", "api key not valid", "permission_denied", "invalid_api_key", "401", "403")):
        return True, "auth_error"
    if any(k in s_lower for k in ("unsupported model", "model not found", "model does not exist", "invalid_request_error", "400", "404", "422")):
        return True, "model_error"
    if isinstance(e, (ValueError, RuntimeError, KeyError, TypeError, AttributeError)):
        return True, "configuration_error"
    return False, ""


def auto_pause_review_processing(
    reason: str = "api_error",
    error_message: str = "",
    model_name: str = "AI",
) -> None:
    """
    Auto-pause review processing in the database and APScheduler.
    Also sends notifications and logs alerts for admin visibility.
    """
    logger.warning(f"Auto-pausing review processing. Reason: {reason}. Detail: {error_message[:200]}")

    # 1. Update system settings in DB & reset processing reviews back to pending
    try:
        import pyodbc
        from app.core.db_utils import get_connection_string
        from app.modules.admin.services.system_settings_service import set_setting
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            set_setting(cursor, "review_processing_paused", "true")
            set_setting(cursor, "review_processing_pause_reason", reason)
            cursor.execute("UPDATE dbo.processed_review SET status = 'pending' WHERE status = 'processing'")
            conn.commit()
        logger.info("Review processing has been PAUSED. Resume from Admin → System Settings.")
    except Exception as pause_err:
        logger.error(f"Failed to pause review processing in DB: {pause_err}")

    # 2. Pause APScheduler job
    try:
        from app.modules.scheduler.services.scheduler_service import scheduler
        if scheduler.get_job('process_reviews_job'):
            scheduler.pause_job('process_reviews_job')
            logger.info("Auto-pause: Paused process_reviews_job in scheduler.")
    except Exception as sched_err:
        logger.error(f"Failed to pause scheduler job during auto-pause: {sched_err}")

    # 3. Log alerts and notify admin
    try:
        from app.modules.admin.services.system_alert_logger import (
            alert_llm_quota_exceeded,
            alert_llm_api_error,
            alert_llm_key_missing,
        )
        from app.services.notification_helpers import notify_admin_llm_quota_exceeded

        if reason == "api_limit":
            alert_llm_quota_exceeded(error_message[:200], model_name=model_name)
            notify_admin_llm_quota_exceeded(model_name=model_name)
        elif reason in ("no_model_assigned", "encryption_key_error"):
            alert_llm_key_missing(model_name=model_name)
            notify_admin_llm_quota_exceeded(model_name=f"{model_name} (Config Error)")
        else:
            alert_llm_api_error(error_message[:300], model_name=model_name)
            notify_admin_llm_quota_exceeded(model_name=f"{model_name} (API Error)")
    except Exception as alert_err:
        logger.debug(f"Failed to log system alert or notification: {alert_err}")


def is_retryable_exception(e: Exception) -> bool:
    """Provider-agnostic retry predicate. Non-transient errors (auth, config, quota, keys) are not retried."""
    try:
        from app.core.pyodbc_connection import get_raw_connection
        from app.modules.admin.services.system_settings_service import get_setting_bool
        with get_raw_connection() as conn:
            if get_setting_bool(conn.cursor(), "review_processing_paused", default=False):
                logger.warning("Retry check: Review processing is paused. Aborting retries.")
                return False
    except Exception as db_err:
        logger.debug(f"Failed to check paused setting in retry predicate: {db_err}")

    is_fatal, _ = _detect_fatal_error(e)
    if is_fatal:
        return False

    s = str(e)
    if "rate_limit" in s.lower():
        return False
    return True


@retry(
    wait=wait_exponential(multiplier=1, min=1, max=3),
    stop=stop_after_attempt(2),
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

        # Resolve active model name to make notification and system alert messages dynamic
        model_name = "AI"
        try:
            from app.services.llm_gateway import get_assigned_model
            model_info = get_assigned_model("review_processing")
            model_name = model_info.get("name") or model_info.get("model_name") or "AI"
        except Exception:
            # Fallback regex check from error string
            match = re.search(r"LLM (?:Provider )?Error \((.*?)(?: @|\))", err_str)
            if match:
                model_name = match.group(1)

        is_fatal, reason = _detect_fatal_error(e)
        if is_fatal:
            auto_pause_review_processing(
                reason=reason or "api_error",
                error_message=err_str,
                model_name=model_name,
            )
        else:
            try:
                from app.modules.admin.services.system_alert_logger import alert_llm_api_error
                alert_llm_api_error(err_str[:300], model_name=model_name)
            except Exception:
                pass

        raise e
