"""
LLM Gateway — routes AI calls to the admin-assigned OpenAI-compatible model.

Usage:
    from app.services.llm_gateway import call as gateway_call
    text = gateway_call("review_processing", prompt)

Purposes:
    "review_processing"  — batch review analysis (runs via scheduler)
    "reply_generation"   — on-demand reply button

The gateway reads the assigned model from dbo.system_settings, loads its config
from dbo.llm_model, decrypts the API key, and calls via the OpenAI-compatible SDK.
"""

import logging
from typing import Literal

import pyodbc
from openai import OpenAI

from app.core.crypto import decrypt_value
from app.core.db_utils import get_connection_string

logger = logging.getLogger(__name__)

Purpose = Literal[
    "review_processing",
    "reply_generation",
    "insights",
    "rule_extraction",
    "competitor_analysis",
]

_PURPOSE_SETTING: dict[str, str] = {
    "review_processing":   "llm_review_processing_model_id",
    "reply_generation":    "llm_reply_generation_model_id",
    "insights":            "llm_review_processing_model_id",
    "rule_extraction":     "llm_reply_generation_model_id",
    "competitor_analysis": "llm_review_processing_model_id",
}


def _ensure_table(cursor) -> None:
    cursor.execute("""
        IF NOT EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'llm_model'
        )
        BEGIN
            CREATE TABLE dbo.llm_model (
                id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
                name        NVARCHAR(100)    NOT NULL,
                endpoint    NVARCHAR(500)    NOT NULL,
                model_name  NVARCHAR(200)    NOT NULL,
                api_key_enc NVARCHAR(MAX)    NOT NULL,
                max_tokens  INT              NOT NULL DEFAULT 4096,
                is_active   BIT              NOT NULL DEFAULT 1,
                created_at  DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
                updated_at  DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME()
            )
        END
    """)


def load_model_by_id(model_id: str) -> dict:
    """Load and decrypt a model config from DB. Raises ValueError if not found/inactive."""
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        _ensure_table(cursor)
        row = cursor.execute(
            "SELECT id, name, endpoint, model_name, api_key_enc, max_tokens "
            "FROM dbo.llm_model WHERE id = ? AND is_active = 1",
            (model_id,),
        ).fetchone()
    if not row:
        raise ValueError(f"LLM model '{model_id}' not found or inactive.")
    return {
        "id":         str(row[0]),
        "name":       row[1],
        "endpoint":   row[2],
        "model_name": row[3],
        "api_key":    decrypt_value(row[4]),
        "max_tokens": row[5],
    }


def get_candidate_models(
    purpose: Purpose = "review_processing",
    primary_model_id: str | None = None,
) -> list[dict]:
    """
    Return an ordered, deduplicated list of decrypted active models to check for *purpose*.

    Priority order:
    1. Explicit primary_model_id (if provided and active)
    2. Primary model assigned to *purpose* in dbo.system_settings
    3. Model assigned to alternate purpose (e.g. review_processing / reply_generation)
    4. All remaining active models from dbo.llm_model (ordered by created_at DESC)
    """
    # Lazy import to avoid circular dependency (admin package loads routes which load gateway)
    from app.modules.admin.services.system_settings_service import (
        ensure_system_settings_table,
        get_setting,
    )
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        _ensure_table(cursor)
        ensure_system_settings_table(cursor)

        rows = cursor.execute(
            "SELECT id, name, endpoint, model_name, api_key_enc, max_tokens "
            "FROM dbo.llm_model WHERE is_active = 1 ORDER BY created_at DESC"
        ).fetchall()

        if not rows:
            raise ValueError(
                f"No active LLM models available. "
                "Go to Admin → LLM Models and configure an OpenAI-compatible model."
            )

        active_models_map: dict[str, dict] = {}
        for r in rows:
            mid = str(r[0])
            active_models_map[mid] = {
                "id":         mid,
                "name":       r[1],
                "endpoint":   r[2],
                "model_name": r[3],
                "api_key":    decrypt_value(r[4]),
                "max_tokens": r[5],
            }

        setting_key = _PURPOSE_SETTING.get(purpose, "llm_review_processing_model_id")
        purpose_assigned = (get_setting(cursor, setting_key) or "").strip()
        review_proc_assigned = (get_setting(cursor, "llm_review_processing_model_id") or "").strip()
        reply_gen_assigned = (get_setting(cursor, "llm_reply_generation_model_id") or "").strip()

    ordered_ids: list[str] = []

    def _add_if_active(mid: str | None) -> None:
        if mid and mid in active_models_map and mid not in ordered_ids:
            ordered_ids.append(mid)

    # 1. Explicit primary if specified
    _add_if_active(primary_model_id)

    # 2. Setting for requested purpose
    _add_if_active(purpose_assigned)

    # 3. Alternative primary settings
    _add_if_active(review_proc_assigned)
    _add_if_active(reply_gen_assigned)

    # 4. All other active models
    for mid in active_models_map:
        _add_if_active(mid)

    candidates = [active_models_map[mid] for mid in ordered_ids]
    if not candidates:
        raise ValueError(
            f"No LLM model assigned or available for '{purpose}'. "
            "Go to Admin → LLM Models and configure an OpenAI-compatible model."
        )
    return candidates


def get_assigned_model(purpose: Purpose = "review_processing") -> dict:
    """Return the decrypted primary model config assigned to *purpose*. Raises ValueError if none."""
    candidates = get_candidate_models(purpose)
    return candidates[0]


def _format_error_message(model: dict, exc: Exception) -> str:
    """Format and extract a clean diagnostic message from an LLM exception."""
    msg = str(exc)
    try:
        import json
        if " - {" in msg:
            json_part = msg.split(" - ", 1)[1].replace("'", '"')
            data = json.loads(json_part)
            if "error" in data and "message" in data["error"]:
                msg = data["error"]["message"]
    except Exception:
        pass

    lower_msg = msg.lower()
    if "402" in msg or "insufficient_quota" in lower_msg or "credits" in lower_msg:
        if "max_tokens" in lower_msg:
            return f"Provider limit reached: {msg}. Try reducing Max Tokens or checking your credits."
        return f"Provider reported insufficient credits/quota: {msg}"

    if "error code:" in lower_msg:
        return f"LLM Provider Error ({model.get('model_name', 'unknown')} @ {model.get('endpoint', 'unknown')}): {msg}"

    return f"LLM Error ({model.get('model_name', 'unknown')}): {msg}"


def _execute_model_call(
    model: dict,
    messages: list[dict],
    max_tokens: int | None = None,
    json_mode: bool = False,
) -> str:
    """Execute a single chat completion against a specific model."""
    client = OpenAI(api_key=model["api_key"], base_url=model["endpoint"])
    completion_args = {
        "model": model["model_name"],
        "messages": messages,
        "max_tokens": max_tokens if max_tokens is not None else model.get("max_tokens", 4096),
    }
    if json_mode:
        completion_args["response_format"] = {"type": "json_object"}

    resp = client.chat.completions.create(**completion_args)
    return resp.choices[0].message.content or ""


def call(
    purpose: Purpose,
    prompt: str,
    system_prompt: str | None = None,
    *,
    model_id: str | None = None,
    api_key: str | None = None,
    endpoint: str | None = None,
    model_name: str | None = None,
    max_tokens: int | None = None,
    json_mode: bool = False,
    allow_fallback: bool = True,
) -> str:
    """
    Call an LLM and return the text response.

    If allow_fallback is True, automatically checks other available active models
    if the primary model fails, using the first working model found.
    """
    messages: list[dict] = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    # Ad-hoc test with explicit raw credentials (no fallback)
    if api_key and endpoint and model_name:
        model = {
            "name": model_name,
            "api_key": api_key,
            "endpoint": endpoint,
            "model_name": model_name,
            "max_tokens": max_tokens or 4096,
        }
        try:
            return _execute_model_call(model, messages, max_tokens=max_tokens, json_mode=json_mode)
        except Exception as exc:
            raise ValueError(_format_error_message(model, exc)) from exc

    # Single-model explicit execution without fallback (e.g. admin test of a saved model)
    if model_id and not allow_fallback:
        model = load_model_by_id(model_id)
        try:
            return _execute_model_call(model, messages, max_tokens=max_tokens, json_mode=json_mode)
        except Exception as exc:
            raise ValueError(_format_error_message(model, exc)) from exc

    # Determine candidate models to check in priority order
    candidates = get_candidate_models(purpose, primary_model_id=model_id)

    # If fallback is explicitly disabled, only attempt the primary candidate
    if not allow_fallback:
        candidates = [candidates[0]]

    errors: list[str] = []
    primary_model_name = candidates[0].get("name", "Primary Model")

    for i, candidate in enumerate(candidates):
        is_primary = (i == 0)
        try:
            text = _execute_model_call(candidate, messages, max_tokens=max_tokens, json_mode=json_mode)
            if not is_primary:
                logger.warning(
                    f"LLM Gateway Failover: Primary model '{primary_model_name}' failed. "
                    f"Successfully recovered using working model '{candidate['name']}' ({candidate['model_name']})."
                )
            return text
        except Exception as exc:
            formatted_err = _format_error_message(candidate, exc)
            errors.append(f"Model '{candidate['name']}' ({candidate['model_name']}): {formatted_err}")
            remaining = len(candidates) - (i + 1)
            if remaining > 0:
                logger.warning(
                    f"LLM Gateway: Model '{candidate['name']}' failed ({formatted_err}). "
                    f"Checking next available model ({remaining} candidate(s) remaining)..."
                )
            else:
                logger.error(
                    f"LLM Gateway: Model '{candidate['name']}' failed ({formatted_err}). "
                    "No more candidate models available."
                )

    if len(errors) == 1:
        raise ValueError(errors[0])

    error_summary = " | ".join(errors)
    raise ValueError(f"All available LLM models failed. Attempted {len(candidates)} model(s): {error_summary}")
