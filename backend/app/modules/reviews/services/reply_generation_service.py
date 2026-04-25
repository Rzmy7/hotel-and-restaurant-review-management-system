"""Reply generation service using Google Gemini and embedding context."""

from __future__ import annotations

import os
from typing import Any

import pyodbc
import requests
from google import genai

from app.core.db_utils import get_connection_string
from app.modules.admin.services.system_settings_service import (
    DEFAULT_REPLY_GOOGLE_MODEL,
    DEFAULT_REPLY_SELECTED_MODEL,
    DEFAULT_REPLY_USE_EMBEDDING_RULES,
    DEFAULT_REPLY_USE_SIMILAR_REVIEWS,
    ensure_system_settings_table,
    increment_setting_counter,
    get_setting_bool,
    get_setting,
    get_similar_reviews_count,
)
from app.modules.reviews.schemas import ReplyGenerationRequest

from app.core.config import EMBEDDING_SERVICE_URL


def _load_reply_generation_settings() -> dict[str, Any]:
    with pyodbc.connect(get_connection_string()) as connection:
        cursor = connection.cursor()
        ensure_system_settings_table(cursor)

        google_api_key = (get_setting(cursor, "reply_google_api_key") or "").strip()
        selected_model = (get_setting(cursor, "reply_selected_model") or DEFAULT_REPLY_SELECTED_MODEL).strip() or DEFAULT_REPLY_SELECTED_MODEL
        similar_reviews_count = get_similar_reviews_count(cursor)
        use_embedding_rules = get_setting_bool(
            cursor,
            "reply_use_embedding_rules",
            default=DEFAULT_REPLY_USE_EMBEDDING_RULES,
        )
        use_similar_reviews = get_setting_bool(
            cursor,
            "reply_use_similar_reviews",
            default=DEFAULT_REPLY_USE_SIMILAR_REVIEWS,
        )

    google_model = selected_model if selected_model else DEFAULT_REPLY_GOOGLE_MODEL

    return {
        "provider": "google",
        "google_api_key": google_api_key,
        "selected_model": selected_model,
        "google_model": google_model,
        "similar_reviews_count": similar_reviews_count,
        "use_embedding_rules": use_embedding_rules,
        "use_similar_reviews": use_similar_reviews,
    }


def _to_int(value: Any, default: int = 0) -> int:
    try:
        parsed = int(value)
        if parsed < 0:
            return 0
        return parsed
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


def _fetch_embedding_context(review_text: str, source_id: str, top_k: int) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
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

        safe_reviews = reviews if isinstance(reviews, list) else []
        safe_rules = rules if isinstance(rules, list) else []
        return safe_reviews[:top_k], safe_rules
    except Exception:
        return [], []


def _format_context_lines(title: str, items: list[dict[str, Any]], max_items: int) -> str:
    if not items:
        return f"{title}: None"

    lines: list[str] = [f"{title}:"]
    for index, item in enumerate(items[:max_items], start=1):
        text = str(item.get("text") or "").strip()
        distance = item.get("distance")
        if not text:
            continue

        if isinstance(distance, (int, float)):
            lines.append(f"{index}. {text} (distance={distance:.3f})")
        else:
            lines.append(f"{index}. {text}")

    if len(lines) == 1:
        return f"{title}: None"
    return "\n".join(lines)


def _build_prompt(payload: ReplyGenerationRequest, similar_reviews: list[dict[str, Any]], rules: list[dict[str, Any]]) -> str:
    tone = (payload.tone or "standard").strip().lower()
    length = (payload.length or "standard").strip().lower()

    length_instruction = "120 to 180 words"
    if length == "short":
        length_instruction = "40 to 90 words"

    tone_instruction = {
        "professional": "Use a professional and polished tone.",
        "casual": "Use a warm and conversational tone.",
    }.get(tone, "Use a balanced, courteous customer-support tone.")

    similar_reviews_section = _format_context_lines("Similar Reviews", similar_reviews, len(similar_reviews))
    rules_section = _format_context_lines("Relevant Rules", rules, len(rules))

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
        f"{rules_section}\n\n"
        f"{similar_reviews_section}\n\n"
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


def _generate_with_google(api_key: str, model: str, prompt: str) -> tuple[str, int]:
    last_error: Exception | None = None

    # Some Gemini aliases are only reachable on v1beta; try both.
    for api_version in ("v1", "v1beta"):
        try:
            client = genai.Client(api_key=api_key, http_options={"api_version": api_version})
            response = client.models.generate_content(model=model, contents=prompt)
            text = getattr(response, "text", None)
            usage = _extract_token_usage(getattr(response, "usage_metadata", None))
            return (text or "").strip(), usage
        except Exception as exc:
            last_error = exc

    if last_error is not None:
        raise last_error
    raise ValueError("Google generation failed for an unknown reason.")


def _increment_provider_usage(tokens_used: int = 0) -> None:
    with pyodbc.connect(get_connection_string()) as connection:
        cursor = connection.cursor()
        ensure_system_settings_table(cursor)
        increment_setting_counter(cursor, "reply_google_request_count", delta=1)
        safe_tokens_used = max(0, _to_int(tokens_used, default=0))
        if safe_tokens_used > 0:
            increment_setting_counter(cursor, "reply_google_token_usage", delta=safe_tokens_used)
        connection.commit()


def _fallback_reply(payload: ReplyGenerationRequest) -> str:
    user_name = (payload.userName or "Guest").strip() or "Guest"
    sentiment = (payload.sentiment or "Neutral").strip().lower()

    if sentiment == "negative":
        return (
            f"Dear {user_name},\n\n"
            "Thank you for sharing your feedback. We are truly sorry that your experience did not meet expectations. "
            "Your comments have been shared with our team, and we are taking immediate steps to improve. "
            "We value your input and hope to provide you with a much better experience next time."
        )

    if sentiment == "positive":
        return (
            f"Dear {user_name},\n\n"
            "Thank you for your wonderful review. We are delighted to hear about your positive experience. "
            "Your feedback means a lot to our team, and we look forward to welcoming you again soon."
        )

    return (
        f"Dear {user_name},\n\n"
        "Thank you for taking the time to share your feedback. We appreciate your comments and continuously use guest insights "
        "to improve our service. We hope to welcome you again soon."
    )


def generate_review_reply(payload: ReplyGenerationRequest) -> dict[str, Any]:
    try:
        settings = _load_reply_generation_settings()

        similar_reviews_count = int(settings["similar_reviews_count"])
        use_embedding_rules = bool(settings["use_embedding_rules"])
        use_similar_reviews = bool(settings["use_similar_reviews"])
        source_id = payload.sourceId or ""

        similar_reviews: list[dict[str, Any]] = []
        rules: list[dict[str, Any]] = []
        if use_embedding_rules or use_similar_reviews:
            similar_reviews, rules = _fetch_embedding_context(
                payload.reviewText,
                source_id,
                similar_reviews_count,
            )

        if not use_similar_reviews:
            similar_reviews = []
        if not use_embedding_rules:
            rules = []

        prompt = _build_prompt(payload, similar_reviews, rules)

        reply = ""
        tokens_used = 0
        provider_output = "google"
        provider_error: str | None = None
        try:
            api_key = str(settings["google_api_key"])
            model = str(settings["google_model"])
            if not api_key:
                raise ValueError("Google API key is not configured in reply generation settings.")
            reply, tokens_used = _generate_with_google(api_key, model, prompt)
            _increment_provider_usage(tokens_used=tokens_used)
        except Exception as provider_exc:
            # Avoid surfacing provider/transient failures as HTTP 500 to the UI.
            reply = _fallback_reply(payload)
            provider_output = "google-fallback"
            provider_error = str(provider_exc)

        if not reply:
            reply = _fallback_reply(payload)

        return {
            "reply": reply,
            "provider": provider_output,
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
