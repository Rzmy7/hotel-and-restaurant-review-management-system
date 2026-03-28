"""Reply generation service using configurable providers and embedding context."""

from __future__ import annotations

import os
from typing import Any

import pyodbc
import requests
from google import genai
try:
    from anthropic import Anthropic
except Exception:
    Anthropic = None

from app.modules.admin_backend.db_utils import get_connection_string
from app.modules.admin_backend.services.system_settings_service import (
    DEFAULT_REPLY_CLAUDE_MODEL,
    DEFAULT_REPLY_GOOGLE_MODEL,
    DEFAULT_REPLY_SELECTED_MODEL,
    ensure_system_settings_table,
    increment_setting_counter,
    get_setting,
    get_similar_reviews_count,
)
from app.modules.reviews.schemas import ReplyGenerationRequest

EMBEDDING_SERVICE_URL = os.getenv("EMBEDDING_SERVICE_URL", "http://localhost:8001").rstrip("/")
CLAUDE_MODEL_ALIASES: dict[str, str] = {
    "claude-3-5-sonnet-latest": "claude-sonnet-4-6",
    "claude-3-5-sonnet-20241022": "claude-sonnet-4-6",
    "claude-3-5-haiku-latest": "claude-haiku-4-5-20251001",
    "claude-3-5-haiku-20241022": "claude-haiku-4-5-20251001",
    "claude-3-opus-latest": "claude-opus-4-6",
    "claude-3-opus-20240229": "claude-opus-4-6",
}


def _infer_provider_from_model(model: str) -> str:
    normalized = model.strip().lower()
    if normalized.startswith("claude"):
        return "claude"
    return "google"


def _load_reply_generation_settings() -> dict[str, Any]:
    with pyodbc.connect(get_connection_string()) as connection:
        cursor = connection.cursor()
        ensure_system_settings_table(cursor)

        google_api_key = (get_setting(cursor, "reply_google_api_key") or "").strip()
        claude_api_key = (get_setting(cursor, "reply_claude_api_key") or "").strip()
        selected_model = (get_setting(cursor, "reply_selected_model") or DEFAULT_REPLY_SELECTED_MODEL).strip() or DEFAULT_REPLY_SELECTED_MODEL
        similar_reviews_count = get_similar_reviews_count(cursor)

    provider = _infer_provider_from_model(selected_model)
    google_model = selected_model if provider == "google" else DEFAULT_REPLY_GOOGLE_MODEL
    claude_model = selected_model if provider == "claude" else DEFAULT_REPLY_CLAUDE_MODEL

    return {
        "provider": provider,
        "google_api_key": google_api_key,
        "claude_api_key": claude_api_key,
        "selected_model": selected_model,
        "google_model": google_model,
        "claude_model": claude_model,
        "similar_reviews_count": similar_reviews_count,
    }


def _fetch_embedding_context(review_text: str, hotel_id: int, top_k: int) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    try:
        response = requests.post(
            f"{EMBEDDING_SERVICE_URL}/search",
            json={"query": review_text, "hotel_id": hotel_id, "top_k": top_k},
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


def _generate_with_google(api_key: str, model: str, prompt: str) -> str:
    client = genai.Client(api_key=api_key, http_options={"api_version": "v1"})
    response = client.models.generate_content(model=model, contents=prompt)
    text = getattr(response, "text", None)
    return (text or "").strip()


def _generate_with_claude(api_key: str, model: str, prompt: str) -> str:
    def _get_available_models() -> set[str]:
        try:
            response = requests.get(
                "https://api.anthropic.com/v1/models",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                timeout=12,
            )
            response.raise_for_status()
            payload = response.json() if response.content else {}
            items = payload.get("data") if isinstance(payload, dict) else []
            return {
                str(item.get("id"))
                for item in items
                if isinstance(item, dict) and item.get("id")
            }
        except Exception:
            return set()

    def _call_http(selected_model: str, prompt_text: str) -> requests.Response:
        return requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": selected_model,
                "max_tokens": 450,
                "messages": [{"role": "user", "content": prompt_text}],
            },
            timeout=20,
        )

    def _call_sdk(selected_model: str, prompt_text: str) -> str:
        if Anthropic is None:
            return ""

        client = Anthropic(api_key=api_key)
        response = client.messages.create(
            model=selected_model,
            max_tokens=450,
            messages=[{"role": "user", "content": prompt_text}],
        )

        blocks = getattr(response, "content", None)
        if not isinstance(blocks, list):
            return ""

        text_parts = []
        for block in blocks:
            text_value = getattr(block, "text", None)
            if isinstance(text_value, str) and text_value.strip():
                text_parts.append(text_value.strip())

        return "\n".join(text_parts).strip()

    candidates = [
        model,
        CLAUDE_MODEL_ALIASES.get(model),
        DEFAULT_REPLY_CLAUDE_MODEL,
        CLAUDE_MODEL_ALIASES.get(DEFAULT_REPLY_CLAUDE_MODEL),
        "claude-sonnet-4-6",
        "claude-sonnet-4-5-20250929",
        "claude-haiku-4-5-20251001",
        "claude-opus-4-6",
    ]

    unique_candidates: list[str] = []
    for candidate in candidates:
        if candidate and candidate not in unique_candidates:
            unique_candidates.append(candidate)

    available_models = _get_available_models()
    if available_models:
        available_candidates = [candidate for candidate in unique_candidates if candidate in available_models]
        if available_candidates:
            unique_candidates = available_candidates

    compact_prompt = prompt[:12000] if len(prompt) > 12000 else prompt
    last_error = "unknown error"
    for candidate_model in unique_candidates:
        # Prefer SDK to avoid header/auth mismatches; fallback to HTTP when SDK isn't available.
        reply_text = ""
        if Anthropic is not None:
            try:
                reply_text = _call_sdk(candidate_model, prompt)
                if not reply_text:
                    reply_text = _call_sdk(candidate_model, compact_prompt)
            except Exception as sdk_exc:
                last_error = str(sdk_exc)

        if not reply_text:
            response = _call_http(candidate_model, prompt)
            if not response.ok and response.status_code == 400 and "too long" in (response.text or "").lower():
                # Retry once with a compact prompt when Claude rejects oversized inputs.
                response = _call_http(candidate_model, compact_prompt)

            if response.ok:
                payload = response.json()
                content = payload.get("content") if isinstance(payload, dict) else None
                if isinstance(content, list):
                    text_parts = [str(chunk.get("text", "")).strip() for chunk in content if isinstance(chunk, dict)]
                    reply_text = "\n".join(part for part in text_parts if part).strip()
                else:
                    last_error = "invalid content payload"
            else:
                last_error = f"{response.status_code}: {response.text}"

        if reply_text:
            return reply_text
        if not last_error:
            last_error = "empty text response"

    raise ValueError(f"Claude generation failed for all model candidates. Last error: {last_error}")


def _increment_provider_request_count(provider: str) -> None:
    setting_key = "reply_google_request_count" if provider == "google" else "reply_claude_request_count"
    with pyodbc.connect(get_connection_string()) as connection:
        cursor = connection.cursor()
        ensure_system_settings_table(cursor)
        increment_setting_counter(cursor, setting_key, delta=1)
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

        provider = str(settings["provider"])
        similar_reviews_count = int(settings["similar_reviews_count"])
        hotel_id = payload.hotelId or 1

        similar_reviews, rules = _fetch_embedding_context(
            payload.reviewText,
            hotel_id,
            similar_reviews_count,
        )
        prompt = _build_prompt(payload, similar_reviews, rules)

        reply = ""
        provider_output = provider
        try:
            if provider == "google":
                api_key = str(settings["google_api_key"])
                model = str(settings["google_model"])
                if not api_key:
                    raise ValueError("Google API key is not configured in reply generation settings.")
                reply = _generate_with_google(api_key, model, prompt)
                _increment_provider_request_count("google")
            elif provider == "claude":
                api_key = str(settings["claude_api_key"])
                model = str(settings["claude_model"])
                if not api_key:
                    raise ValueError("Claude API key is not configured in reply generation settings.")
                reply = _generate_with_claude(api_key, model, prompt)
                _increment_provider_request_count("claude")
        except Exception:
            # Avoid surfacing provider/transient failures as HTTP 500 to the UI.
            reply = _fallback_reply(payload)
            provider_output = f"{provider}-fallback"

        if not reply:
            reply = _fallback_reply(payload)

        return {
            "reply": reply,
            "provider": provider_output,
            "similarReviewsUsed": len(similar_reviews),
            "rulesUsed": len(rules),
        }
    except Exception:
        return {
            "reply": _fallback_reply(payload),
            "provider": "fallback",
            "similarReviewsUsed": 0,
            "rulesUsed": 0,
        }
