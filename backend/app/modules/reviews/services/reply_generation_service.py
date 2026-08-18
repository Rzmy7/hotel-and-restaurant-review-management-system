"""Reply generation service — uses the LLM Gateway for AI calls."""

from __future__ import annotations

import os
from typing import Any

import pyodbc
import requests

from app.core.db_utils import get_connection_string
from app.modules.admin.services.system_settings_service import (
    DEFAULT_REPLY_USE_EMBEDDING_RULES,
    DEFAULT_REPLY_USE_SIMILAR_REVIEWS,
    ensure_system_settings_table,
    increment_setting_counter,
    get_setting_bool,
    get_similar_reviews_count,
)
from app.modules.reviews.schemas import ReplyGenerationRequest
from app.core.config import EMBEDDING_SERVICE_URL
from app.services.llm_gateway import call as gateway_call


def _load_context_settings() -> dict[str, Any]:
    with pyodbc.connect(get_connection_string()) as connection:
        cursor = connection.cursor()
        ensure_system_settings_table(cursor)
        similar_reviews_count = get_similar_reviews_count(cursor)
        use_embedding_rules = get_setting_bool(
            cursor, "reply_use_embedding_rules", default=DEFAULT_REPLY_USE_EMBEDDING_RULES
        )
        use_similar_reviews = get_setting_bool(
            cursor, "reply_use_similar_reviews", default=DEFAULT_REPLY_USE_SIMILAR_REVIEWS
        )
    return {
        "similar_reviews_count": similar_reviews_count,
        "use_embedding_rules": use_embedding_rules,
        "use_similar_reviews": use_similar_reviews,
    }


def _to_int(value: Any, default: int = 0) -> int:
    try:
        parsed = int(value)
        return max(0, parsed)
    except Exception:
        return default


def _extract_token_usage(value: Any) -> int:
    if value is None:
        return 0

    if isinstance(value, dict):
        total = value.get("total_token_count") or value.get("total_tokens")
        if total is not None:
            return _to_int(total, default=0)

        prompt = value.get("prompt_token_count") or value.get("input_tokens") or 0
        completion = value.get("candidates_token_count") or value.get("output_tokens") or 0
        return _to_int(prompt, default=0) + _to_int(completion, default=0)

    total_attr = getattr(value, "total_token_count", None)
    if total_attr is not None:
        return _to_int(total_attr, default=0)

    prompt_attr = getattr(value, "prompt_token_count", None)
    completion_attr = getattr(value, "candidates_token_count", None)
    if prompt_attr is not None or completion_attr is not None:
        return _to_int(prompt_attr, default=0) + _to_int(completion_attr, default=0)

    return 0


import logging

logger = logging.getLogger(__name__)


def _get_org_source_ids(identifier: str) -> list[str]:
    """
    Fetch all source IDs + organization ID that belong to the same organization.
    Handles identifier being either a source_id or an organization_id.
    """
    if not identifier:
        return []
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            clean_id = str(identifier).strip()

            # Case 1: Check if identifier is a source_id
            rows = cursor.execute(
                """
                SELECT CAST(s2.source_id AS NVARCHAR(36)), CAST(s1.organization_id AS NVARCHAR(36))
                FROM dbo.source s1 
                JOIN dbo.source s2 ON s1.organization_id = s2.organization_id 
                WHERE CAST(s1.source_id AS NVARCHAR(36)) = ?
                """,
                (clean_id,),
            ).fetchall()

            if rows:
                source_ids = {row[0].upper() for row in rows if row[0]}
                org_id = rows[0][1]
                if org_id:
                    source_ids.add(str(org_id).upper())
                return list(source_ids)

            # Case 2: Check if identifier is an organization_id
            rows_by_org = cursor.execute(
                """
                SELECT CAST(source_id AS NVARCHAR(36))
                FROM dbo.source
                WHERE CAST(organization_id AS NVARCHAR(36)) = ?
                """,
                (clean_id,),
            ).fetchall()

            if rows_by_org:
                source_ids = {row[0].upper() for row in rows_by_org if row[0]}
                source_ids.add(clean_id.upper())
                return list(source_ids)

            return [clean_id.upper()]
    except Exception as e:
        logger.warning(f"Failed to resolve org sources for {identifier}, falling back to single identifier: {e}")
        return [str(identifier).upper()]


def _fetch_embedding_context(review_text: str, source_id: str, top_k: int) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    from app.core.config import EMBEDDING_API_KEY
    _api_key = EMBEDDING_API_KEY
    try:
        # Get all source IDs belonging to the same organization
        org_source_ids = _get_org_source_ids(source_id) if source_id else []

        response = requests.post(
            f"{EMBEDDING_SERVICE_URL}/search",
            json={"query": review_text, "source_ids": org_source_ids, "top_k": top_k},
            headers={"X-Internal-API-Key": _api_key},
            timeout=12,
        )
        response.raise_for_status()
        payload = response.json()
        reviews = payload.get("reviews") if isinstance(payload, dict) else []
        rules = payload.get("rules") if isinstance(payload, dict) else []

        safe_reviews = reviews if isinstance(reviews, list) else []
        safe_rules = rules if isinstance(rules, list) else []
        return safe_reviews[:top_k], safe_rules
    except Exception as e:
        logger.error(f"Embedding context fetch failed: {e}")
        return [], []


def _format_context_lines(title: str, items: list[dict[str, Any]], max_items: int) -> str:
    if not items:
        return f"{title}: None"
    lines: list[str] = [f"{title}:"]
    for index, item in enumerate(items[:max_items], start=1):
        text = str(item.get("text") or "").strip()
        if not text:
            continue
        distance = item.get("distance")
        if isinstance(distance, (int, float)):
            lines.append(f"{index}. {text} (distance={distance:.3f})")
        else:
            lines.append(f"{index}. {text}")
    return "\n".join(lines) if len(lines) > 1 else f"{title}: None"


def _build_prompt(
    payload: ReplyGenerationRequest,
    similar_reviews: list[dict[str, Any]],
    rules: list[dict[str, Any]],
) -> str:
    tone = (payload.tone or "standard").strip().lower()
    length = (payload.length or "standard").strip().lower()

    length_instruction = "40 to 90 words" if length == "short" else "120 to 180 words"
    tone_instruction = {
        "professional": "Use a professional and polished tone.",
        "casual": "Use a warm and conversational tone.",
    }.get(tone, "Use a balanced, courteous customer-support tone.")

    language_hint = (payload.language or "").strip()
    language_hint_line = (
        f"Language Hint: {language_hint} (use only as a hint if it matches the review text)\\n"
        if language_hint
        else ""
    )

    return (
        "You are a customer support expert helping a hotel or restaurant reply to customer reviews. "
        "Write only the final reply text, with no markdown, labels, or explanation.\n\n"
        f"Reviewer Name: {payload.userName}\n"
        f"Sentiment: {payload.sentiment or 'Neutral'}\n"
        f"Source: {payload.source or 'Unknown'}\n"
        f"{language_hint_line}"
        f"Requested Length: {length_instruction}\n"
        f"Tone Requirement: {tone_instruction}\n\n"
        "Original Review:\n"
        f"{payload.reviewText.strip()}\n\n"
        f"{_format_context_lines('Relevant Rules', rules, len(rules))}\n\n"
        f"{_format_context_lines('Similar Reviews', similar_reviews, len(similar_reviews))}\n\n"
        "Reply requirements:\n"
        "- The reply language MUST match the language used in the Original Review text.\n"
        "- Do not translate to English unless the Original Review is in English.\n"
        "- If the review contains mixed languages, use the dominant language from the review text.\n"
        "- Thank the reviewer.\n"
        "- Address key points from the original review.\n"
        "- Follow all relevant rules exactly when they apply.\n"
        "- If the review is negative, acknowledge issues and mention concrete improvement intent.\n"
        "- Do not mention that you used AI, rules, or similar reviews.\n"
    )


def _increment_usage() -> None:
    try:
        with pyodbc.connect(get_connection_string()) as connection:
            cursor = connection.cursor()
            ensure_system_settings_table(cursor)
            increment_setting_counter(cursor, "reply_google_request_count", delta=1)
            connection.commit()
    except Exception:
        pass


def _fallback_reply(payload: ReplyGenerationRequest) -> str:
    user_name = (payload.userName or "Guest").strip() or "Guest"
    sentiment = (payload.sentiment or "Neutral").strip().lower()
    if sentiment == "negative":
        return (
            f"Dear {user_name},\n\n"
            "Thank you for sharing your feedback. We are truly sorry that your experience did not "
            "meet expectations. Your comments have been shared with our team, and we are taking "
            "immediate steps to improve. We value your input and hope to provide you with a much "
            "better experience next time."
        )
    if sentiment == "positive":
        return (
            f"Dear {user_name},\n\n"
            "Thank you for your wonderful review. We are delighted to hear about your positive "
            "experience. Your feedback means a lot to our team, and we look forward to welcoming "
            "you again soon."
        )
    return (
        f"Dear {user_name},\n\n"
        "Thank you for taking the time to share your feedback. We appreciate your comments and "
        "continuously use guest insights to improve our service. We hope to welcome you again soon."
    )


def generate_review_reply(payload: ReplyGenerationRequest) -> dict[str, Any]:
    try:
        settings = _load_context_settings()

        similar_reviews: list[dict[str, Any]] = []
        rules: list[dict[str, Any]] = []
        
        target_source_id = payload.sourceId or ""
        if settings["use_embedding_rules"] or settings["use_similar_reviews"]:
            similar_reviews, rules = _fetch_embedding_context(
                payload.reviewText,
                target_source_id,
                int(settings["similar_reviews_count"]),
            )
        if not settings["use_similar_reviews"]:
            similar_reviews = []
        if not settings["use_embedding_rules"]:
            rules = []

        # ── Backend Logging: Show which relevant rules and reviews are sent to LLM ──
        review_snippet = payload.reviewText.strip()
        if len(review_snippet) > 80:
            review_snippet = review_snippet[:77] + "..."

        rules_log_lines = []
        if rules:
            for idx, r in enumerate(rules, 1):
                dist = r.get("distance")
                dist_str = f"distance={dist:.4f}" if isinstance(dist, (int, float)) else "distance=N/A"
                rule_text = (r.get("text") or "").strip()
                rules_log_lines.append(f"  [{idx}] ({dist_str}) {rule_text}")
        else:
            rules_log_lines.append("  (None - no rules matched threshold or rules context disabled)")

        reviews_log_lines = []
        if similar_reviews:
            for idx, r in enumerate(similar_reviews, 1):
                dist = r.get("distance")
                dist_str = f"distance={dist:.4f}" if isinstance(dist, (int, float)) else "distance=N/A"
                rev_text = (r.get("text") or "").strip()
                if len(rev_text) > 100:
                    rev_text = rev_text[:97] + "..."
                reviews_log_lines.append(f"  [{idx}] ({dist_str}) \"{rev_text}\"")
        else:
            reviews_log_lines.append("  (None - no similar reviews matched threshold or similar reviews disabled)")

        context_banner = (
            f"\n==================== [AI REPLY GENERATION CONTEXT] ====================\n"
            f"Review ID: {payload.reviewId} | Author: {payload.userName} | Sentiment: {payload.sentiment}\n"
            f"Original Review: \"{review_snippet}\"\n"
            f"--------------------------------------------------------------------\n"
            f"Relevant Rules & Regulations Sent to LLM ({len(rules)}):\n" +
            "\n".join(rules_log_lines) + "\n"
            f"--------------------------------------------------------------------\n"
            f"Similar Past Reviews Sent to LLM ({len(similar_reviews)}):\n" +
            "\n".join(reviews_log_lines) + "\n"
            f"===================================================================="
        )
        logger.info(context_banner)
        print(context_banner, flush=True)

        prompt = _build_prompt(payload, similar_reviews, rules)

        reply = ""
        provider_error: str | None = None
        try:
            logger.info(f"Dispatching reply prompt to LLM Gateway for review ID '{payload.reviewId}'...")
            print(f"[AI-Reply] Dispatching prompt to LLM Gateway for review ID '{payload.reviewId}' (Rules: {len(rules)}, Reviews: {len(similar_reviews)})", flush=True)
            reply = gateway_call("reply_generation", prompt)
            _increment_usage()
            logger.info(f"Successfully generated reply for review ID '{payload.reviewId}' via LLM Gateway")
            print(f"[AI-Reply] Successfully generated reply for review ID '{payload.reviewId}'", flush=True)
        except Exception as exc:
            logger.error(f"LLM Gateway call failed for review ID '{payload.reviewId}': {exc}. Using fallback reply.")
            print(f"[AI-Reply] LLM Gateway error for review ID '{payload.reviewId}': {exc}. Using fallback reply.", flush=True)
            reply = _fallback_reply(payload)
            provider_error = str(exc)

        if not reply:
            reply = _fallback_reply(payload)

        return {
            "reply": reply,
            "provider": "llm-gateway",
            "similarReviewsUsed": len(similar_reviews),
            "rulesUsed": len(rules),
            "providerError": provider_error,
        }
    except Exception as e:
        logger.error(f"Failed in generate_review_reply: {e}", exc_info=True)
        return {
            "reply": _fallback_reply(payload),
            "provider": "fallback",
            "similarReviewsUsed": 0,
            "rulesUsed": 0,
        }
