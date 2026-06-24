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

Purpose = Literal["review_processing", "reply_generation"]

_PURPOSE_SETTING: dict[str, str] = {
    "review_processing": "llm_review_processing_model_id",
    "reply_generation":  "llm_reply_generation_model_id",
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


def get_assigned_model(purpose: Purpose) -> dict:
    """Return the decrypted model config assigned to *purpose*. Raises ValueError if none."""
    # Lazy import to avoid circular dependency (admin package loads routes which load gateway)
    from app.modules.admin.services.system_settings_service import (
        ensure_system_settings_table,
        get_setting,
    )
    setting_key = _PURPOSE_SETTING[purpose]
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        ensure_system_settings_table(cursor)
        model_id = (get_setting(cursor, setting_key) or "").strip()
    if not model_id:
        raise ValueError(
            f"No LLM model assigned for '{purpose}'. "
            "Go to Admin → LLM Models and assign a model."
        )
    return load_model_by_id(model_id)


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
) -> str:
    """
    Call an LLM and return the text response.

    Resolution order:
    1. Explicit model_id  — load from DB by ID
    2. Explicit api_key + endpoint + model_name  — use directly (test scenarios)
    3. Assigned model for *purpose*  — normal production path
    """
    if model_id:
        model = load_model_by_id(model_id)
    elif api_key and endpoint and model_name:
        model = {
            "api_key": api_key,
            "endpoint": endpoint,
            "model_name": model_name,
            "max_tokens": max_tokens or 4096
        }
    else:
        model = get_assigned_model(purpose)
        if max_tokens is not None:
            model["max_tokens"] = max_tokens

    messages: list[dict] = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    try:
        client = OpenAI(api_key=model["api_key"], base_url=model["endpoint"])
        
        # Build completion args
        completion_args = {
            "model": model["model_name"],
            "messages": messages,
            "max_tokens": model["max_tokens"],
        }
        if json_mode:
            completion_args["response_format"] = {"type": "json_object"}

        resp = client.chat.completions.create(**completion_args)
        return resp.choices[0].message.content or ""
    except Exception as exc:
        msg = str(exc)
        
        # Try to extract the specific message if it's an OpenAI-style JSON error
        try:
            import json
            # OpenAI errors sometimes look like "Error code: 402 - {'error': {...}}"
            if " - {" in msg:
                json_part = msg.split(" - ", 1)[1].replace("'", '"')
                data = json.loads(json_part)
                if "error" in data and "message" in data["error"]:
                    msg = data["error"]["message"]
        except:
            pass

        # Handle OpenRouter/OpenAI specific credit/token errors
        lower_msg = msg.lower()
        if "402" in msg or "insufficient_quota" in lower_msg or "credits" in lower_msg:
            if "max_tokens" in lower_msg:
                raise ValueError(f"Provider limit reached: {msg}. Try reducing Max Tokens or checking your credits.")
            raise ValueError(f"Provider reported insufficient credits/quota: {msg}")
        
        if ("error code:" in msg.lower()):
             raise ValueError(f"LLM Provider Error ({model['model_name']} @ {model['endpoint']}): {msg}")
        
        raise ValueError(f"LLM Error ({model['model_name']}): {msg}")
