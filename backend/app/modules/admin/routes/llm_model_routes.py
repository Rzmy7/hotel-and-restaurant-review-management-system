"""
LLM Model management routes.

Admins can register any OpenAI-compatible model, test it, and assign it
to one of two purposes: review_processing or reply_generation.

All API keys are stored AES-256-GCM encrypted in dbo.llm_model.
"""

import logging
from datetime import datetime

import pyodbc
from fastapi import APIRouter, HTTPException

from app.core.crypto import decrypt_value, encrypt_value
from app.core.db_utils import get_connection_string
from app.modules.admin.schemas import (
    LLMAssignmentsResponse,
    LLMAssignmentsUpdate,
    LLMModelCreate,
    LLMModelResponse,
    LLMModelTestPayload,
    LLMModelTestResponse,
    LLMModelUpdate,
)
from app.modules.admin.services.admin_activity_logger import log_admin_activity
from app.modules.admin.services.system_settings_service import (
    ensure_system_settings_table,
    get_setting,
    set_setting,
)
def ensure_llm_model_table(cursor) -> None:
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


def _mask_key(raw: str) -> str:
    if len(raw) <= 8:
        return "•" * len(raw)
    return raw[:4] + "•" * (len(raw) - 8) + raw[-4:]

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/llm-models", tags=["LLM Models"])

_PURPOSE_SETTINGS = {
    "review_processing": "llm_review_processing_model_id",
    "reply_generation":  "llm_reply_generation_model_id",
}


def _row_to_response(row) -> LLMModelResponse:
    return LLMModelResponse(
        id=str(row[0]),
        name=row[1],
        endpoint=row[2],
        model_name=row[3],
        api_key_masked=_mask_key(decrypt_value(row[4])),
        max_tokens=row[5],
        is_active=bool(row[6]),
        created_at=str(row[7]),
        updated_at=str(row[8]),
    )


@router.get("", response_model=list[LLMModelResponse])
def list_models():
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            ensure_llm_model_table(cursor)
            rows = cursor.execute(
                "SELECT id, name, endpoint, model_name, api_key_enc, max_tokens, is_active, created_at, updated_at "
                "FROM dbo.llm_model WHERE is_active = 1 ORDER BY created_at DESC"
            ).fetchall()
        return [_row_to_response(r) for r in rows]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to list models: {exc}") from exc


@router.post("", response_model=LLMModelResponse, status_code=201)
def create_model(payload: LLMModelCreate):
    try:
        encrypted = encrypt_value(payload.api_key.strip())
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            ensure_llm_model_table(cursor)
            cursor.execute(
                "INSERT INTO dbo.llm_model (name, endpoint, model_name, api_key_enc, max_tokens) "
                "OUTPUT inserted.id, inserted.name, inserted.endpoint, inserted.model_name, "
                "       inserted.api_key_enc, inserted.max_tokens, inserted.is_active, inserted.created_at, inserted.updated_at "
                "VALUES (?, ?, ?, ?, ?)",
                (payload.name.strip(), payload.endpoint.strip(), payload.model_name.strip(), encrypted, payload.max_tokens),
            )
            row = cursor.fetchone()
            conn.commit()

        log_admin_activity("ai_job", "LLM Model Added", f"Model '{payload.name}' registered")
        return _row_to_response(row)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to create model: {exc}") from exc


@router.get("/assignments", response_model=LLMAssignmentsResponse)
def get_assignments():
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            ensure_system_settings_table(cursor)
            ensure_llm_model_table(cursor)
            rp_id = (get_setting(cursor, "llm_review_processing_model_id") or "").strip() or None
            rg_id = (get_setting(cursor, "llm_reply_generation_model_id") or "").strip() or None

            def _name(mid: str | None) -> str | None:
                if not mid:
                    return None
                r = cursor.execute(
                    "SELECT name FROM dbo.llm_model WHERE id = ? AND is_active = 1", (mid,)
                ).fetchone()
                return r[0] if r else None

        return LLMAssignmentsResponse(
            review_processing_model_id=rp_id,
            reply_generation_model_id=rg_id,
            review_processing_model_name=_name(rp_id),
            reply_generation_model_name=_name(rg_id),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load assignments: {exc}") from exc


@router.patch("/assignments", response_model=LLMAssignmentsResponse)
def set_assignments(payload: LLMAssignmentsUpdate):
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            ensure_system_settings_table(cursor)
            ensure_llm_model_table(cursor)

            if payload.review_processing_model_id is not None:
                set_setting(cursor, "llm_review_processing_model_id", payload.review_processing_model_id)
            if payload.reply_generation_model_id is not None:
                set_setting(cursor, "llm_reply_generation_model_id", payload.reply_generation_model_id)
            conn.commit()

        log_admin_activity("settings_updated", "LLM Assignments Updated", "Model assignments saved")
        return get_assignments()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save assignments: {exc}") from exc


@router.get("/{model_id}", response_model=LLMModelResponse)
def get_model(model_id: str):
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            ensure_llm_model_table(cursor)
            row = cursor.execute(
                "SELECT id, name, endpoint, model_name, api_key_enc, max_tokens, is_active, created_at, updated_at "
                "FROM dbo.llm_model WHERE id = ? AND is_active = 1",
                (model_id,),
            ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Model not found.")
        return _row_to_response(row)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load model: {exc}") from exc


@router.patch("/{model_id}", response_model=LLMModelResponse)
def update_model(model_id: str, payload: LLMModelUpdate):
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            ensure_llm_model_table(cursor)

            row = cursor.execute(
                "SELECT id, name, endpoint, model_name, api_key_enc, max_tokens, is_active, created_at, updated_at "
                "FROM dbo.llm_model WHERE id = ? AND is_active = 1",
                (model_id,),
            ).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Model not found.")

            new_name       = payload.name.strip()       if payload.name       else row[1]
            new_endpoint   = payload.endpoint.strip()   if payload.endpoint   else row[2]
            new_model_name = payload.model_name.strip() if payload.model_name else row[3]
            new_enc        = encrypt_value(payload.api_key.strip()) if payload.api_key else row[4]
            new_max_tokens = payload.max_tokens if payload.max_tokens is not None else row[5]

            cursor.execute(
                "UPDATE dbo.llm_model "
                "SET name = ?, endpoint = ?, model_name = ?, api_key_enc = ?, max_tokens = ?, updated_at = SYSUTCDATETIME() "
                "WHERE id = ?",
                (new_name, new_endpoint, new_model_name, new_enc, new_max_tokens, model_id),
            )
            conn.commit()

            updated = cursor.execute(
                "SELECT id, name, endpoint, model_name, api_key_enc, max_tokens, is_active, created_at, updated_at "
                "FROM dbo.llm_model WHERE id = ?",
                (model_id,),
            ).fetchone()

        log_admin_activity("ai_job", "LLM Model Updated", f"Model '{new_name}' updated")
        return _row_to_response(updated)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to update model: {exc}") from exc


@router.delete("/{model_id}")
def delete_model(model_id: str):
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            ensure_llm_model_table(cursor)

            row = cursor.execute(
                "SELECT name FROM dbo.llm_model WHERE id = ? AND is_active = 1", (model_id,)
            ).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Model not found.")

            model_name = row[0]
            cursor.execute(
                "UPDATE dbo.llm_model SET is_active = 0, updated_at = SYSUTCDATETIME() WHERE id = ?",
                (model_id,),
            )

            # Clear any assignments that pointed to this model
            ensure_system_settings_table(cursor)
            for key in _PURPOSE_SETTINGS.values():
                assigned = (get_setting(cursor, key) or "").strip()
                if assigned == model_id:
                    set_setting(cursor, key, "")

            conn.commit()

        log_admin_activity("ai_job", "LLM Model Deleted", f"Model '{model_name}' removed")
        return {"status": "deleted", "id": model_id}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete model: {exc}") from exc


@router.post("/{model_id}/test", response_model=LLMModelTestResponse)
def test_model(model_id: str):
    try:
        from app.services.llm_gateway import call as gateway_call
        text = (gateway_call("review_processing", "Reply with exactly: ok", model_id=model_id) or "").strip()
        if text:
            return LLMModelTestResponse(success=True, message="Model is reachable and responded successfully.")
        return LLMModelTestResponse(success=False, message="Model responded but returned an empty response.")
    except Exception as exc:
        return LLMModelTestResponse(success=False, message=f"Test failed: {exc}")


@router.post("/test-connectivity", response_model=LLMModelTestResponse)
def test_connectivity(payload: LLMModelTestPayload):
    """Test LLM parameters before saving."""

    api_key = payload.api_key.strip() if payload.api_key else None
    
    # If no key provided but we have a model_id, load the existing key
    if not api_key and payload.model_id:
        try:
            with pyodbc.connect(get_connection_string()) as conn:
                cursor = conn.cursor()
                row = cursor.execute(
                    "SELECT api_key_enc FROM dbo.llm_model WHERE id = ? AND is_active = 1",
                    (payload.model_id,)
                ).fetchone()
                if row:
                    api_key = decrypt_value(row[0])
        except Exception as e:
            return LLMModelTestResponse(success=False, message=f"Failed to load existing credentials: {e}")

    if not api_key:
        return LLMModelTestResponse(success=False, message="API key is required.")

    try:
        from app.services.llm_gateway import call as gateway_call
        text = (gateway_call(
            "review_processing",
            "Reply with exactly: ok",
            api_key=api_key,
            endpoint=payload.endpoint.strip(),
            model_name=payload.model_name.strip(),
            max_tokens=payload.max_tokens,
        ) or "").strip()
        
        if text:
            return LLMModelTestResponse(success=True, message="Parameters are valid. Model responded successfully.")
        return LLMModelTestResponse(success=False, message="Model responded but returned an empty response.")
    except Exception as exc:
        return LLMModelTestResponse(success=False, message=str(exc))
