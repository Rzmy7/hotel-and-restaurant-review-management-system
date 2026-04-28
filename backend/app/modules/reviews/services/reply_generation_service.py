"""Reply generation service — uses the LLM Gateway for AI calls."""

from __future__ import annotations

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


def _fetch_embedding_context(
    review_text: str, source_id: str, top_k: int
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    try:
        response = requests.post(
            f"{EMBEDDING_SERVICE_URL}/search",
            json={"query": review_text, "source_ids": [source_id], "top_k": top_k},
            timeout=12,
        )
        response.raise_for_status()
        payload = response.json()
        reviews = payload.get("reviews") if isinstance(payload, dict) else []
        rules = payload.get("rules") if isinstance(payload, dict) else []
        return (reviews if isinstance(reviews, list) else [])[:top_k], (
            rules if isinstance(rules, list) else []
        )
    except Exception:
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
        if settings["use_embedding_rules"] or settings["use_similar_reviews"]:
            similar_reviews, rules = _fetch_embedding_context(
                payload.reviewText,
                payload.sourceId or "",
                int(settings["similar_reviews_count"]),
            )
        if not settings["use_similar_reviews"]:
            similar_reviews = []
        if not settings["use_embedding_rules"]:
            rules = []

        prompt = _build_prompt(payload, similar_reviews, rules)

        reply = ""
        provider_error: str | None = None
        try:
            reply = gateway_call("reply_generation", prompt)
            _increment_usage()
        except Exception as exc:
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
    except Exception:
        return {
            "reply": _fallback_reply(payload),
            "provider": "fallback",
            "similarReviewsUsed": 0,
            "rulesUsed": 0,
        }
