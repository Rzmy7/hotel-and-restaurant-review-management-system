"""
LLM Model management routes.

Admins can register any OpenAI-compatible model, test it, and assign it to a
purpose: review_processing, reply_generation, insights, competitor_analysis or
rule_extraction.

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
# Health columns were added after the table shipped, so existing installs get them
# via _ensure_health_columns below rather than the CREATE TABLE above.
_HEALTH_COLUMNS = [
    ("last_test_status",  "NVARCHAR(30) NULL"),
    ("last_test_message", "NVARCHAR(500) NULL"),
    ("last_tested_at",    "DATETIME2(7) NULL"),
]

# Every SELECT reads the same column list so _row_to_response indices stay aligned.
_MODEL_COLUMNS = (
    "id, name, endpoint, model_name, api_key_enc, max_tokens, is_active, "
    "created_at, updated_at, last_test_status, last_test_message, last_tested_at"
)


def _ensure_health_columns(cursor) -> None:
    for col_name, col_def in _HEALTH_COLUMNS:
        cursor.execute(
            "IF NOT EXISTS ("
            "  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS"
            "  WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'llm_model' AND COLUMN_NAME = ?"
            f") ALTER TABLE dbo.llm_model ADD {col_name} {col_def}",
            (col_name,),
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
                updated_at  DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
                last_test_status  NVARCHAR(30)  NULL,
                last_test_message NVARCHAR(500) NULL,
                last_tested_at    DATETIME2(7)  NULL
            )
        END
    """)
    _ensure_health_columns(cursor)


def _mask_key(raw: str) -> str:
    if len(raw) <= 8:
        return "•" * len(raw)
    return raw[:4] + "•" * (len(raw) - 8) + raw[-4:]

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/llm-models", tags=["Admin - LLM Models"])

# Keep in sync with _PURPOSE_SETTING in app.services.llm_gateway.
_PURPOSE_SETTINGS = {
    "review_processing":   "llm_review_processing_model_id",
    "reply_generation":    "llm_reply_generation_model_id",
    "insights":            "llm_insights_model_id",
    "competitor_analysis": "llm_competitor_analysis_model_id",
    "rule_extraction":     "llm_rule_extraction_model_id",
}


def _classify_test_failure(message: str) -> str:
    """Map a provider error into a coarse status the admin UI can badge."""
    m = (message or "").lower()
    if any(k in m for k in ("unauthorized", "invalid api key", "invalid_api_key", "authenticate", "401", "403")):
        return "auth_error"
    if any(k in m for k in ("insufficient", "quota", "credits", "billing", "402", "429")):
        return "quota_error"
    if any(k in m for k in ("model not found", "unsupported model", "does not exist", "404")):
        return "model_error"
    if any(k in m for k in ("connection", "timed out", "timeout", "unreachable", "name resolution", "getaddrinfo")):
        return "unreachable"
    return "error"


def _record_test_result(model_id: str, status: str, message: str) -> None:
    """Persist the outcome of a connectivity test so the list can show real health."""
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            ensure_llm_model_table(cursor)
            cursor.execute(
                "UPDATE dbo.llm_model "
                "SET last_test_status = ?, last_test_message = ?, last_tested_at = SYSUTCDATETIME() "
                "WHERE id = ?",
                (status, (message or "")[:500], model_id),
            )
            conn.commit()
    except Exception as exc:
        # Never fail the test request just because we could not store its outcome.
        logger.warning("Could not record test result for model %s: %s", model_id, exc)


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
        last_test_status=row[9] or "untested",
        last_test_message=row[10],
        last_tested_at=str(row[11]) if row[11] else None,
    )


@router.get("", response_model=list[LLMModelResponse])
def list_models():
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            ensure_llm_model_table(cursor)
            rows = cursor.execute(
                f"SELECT {_MODEL_COLUMNS} "
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
                "OUTPUT " + ", ".join(f"inserted.{c.strip()}" for c in _MODEL_COLUMNS.split(",")) + " "
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
        fields: dict[str, str | None] = {}
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            ensure_system_settings_table(cursor)
            ensure_llm_model_table(cursor)

            def _name(mid: str | None) -> str | None:
                if not mid:
                    return None
                r = cursor.execute(
                    "SELECT name FROM dbo.llm_model WHERE id = ? AND is_active = 1", (mid,)
                ).fetchone()
                return r[0] if r else None

            for purpose, key in _PURPOSE_SETTINGS.items():
                model_id = (get_setting(cursor, key) or "").strip() or None
                fields[f"{purpose}_model_id"] = model_id
                fields[f"{purpose}_model_name"] = _name(model_id)

        return LLMAssignmentsResponse(**fields)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load assignments: {exc}") from exc


@router.patch("/assignments", response_model=LLMAssignmentsResponse)
def set_assignments(payload: LLMAssignmentsUpdate):
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            ensure_system_settings_table(cursor)
            ensure_llm_model_table(cursor)

            for purpose, key in _PURPOSE_SETTINGS.items():
                value = getattr(payload, f"{purpose}_model_id")
                if value is not None:
                    set_setting(cursor, key, value)
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
                f"SELECT {_MODEL_COLUMNS} "
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
                f"SELECT {_MODEL_COLUMNS} "
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

            # Changing what we connect with invalidates the previous test result.
            credentials_changed = (
                new_endpoint != row[2] or new_model_name != row[3] or bool(payload.api_key)
            )
            reset_health = (
                ", last_test_status = NULL, last_test_message = NULL, last_tested_at = NULL"
                if credentials_changed else ""
            )

            cursor.execute(
                "UPDATE dbo.llm_model "
                "SET name = ?, endpoint = ?, model_name = ?, api_key_enc = ?, max_tokens = ?, "
                f"updated_at = SYSUTCDATETIME(){reset_health} "
                "WHERE id = ?",
                (new_name, new_endpoint, new_model_name, new_enc, new_max_tokens, model_id),
            )
            conn.commit()

            updated = cursor.execute(
                f"SELECT {_MODEL_COLUMNS} "
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
        text = (gateway_call("review_processing", "Reply with exactly: ok", model_id=model_id, allow_fallback=False) or "").strip()
        if text:
            result = LLMModelTestResponse(
                success=True, status="ok",
                message="Model is reachable and responded successfully.",
            )
        else:
            result = LLMModelTestResponse(
                success=False, status="error",
                message="Model responded but returned an empty response.",
            )
    except Exception as exc:
        result = LLMModelTestResponse(
            success=False, status=_classify_test_failure(str(exc)),
            message=f"Test failed: {exc}",
        )

    _record_test_result(model_id, result.status, result.message)
    return result


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
            result = LLMModelTestResponse(
                success=True, status="ok",
                message="Parameters are valid. Model responded successfully.",
            )
        else:
            result = LLMModelTestResponse(
                success=False, status="error",
                message="Model responded but returned an empty response.",
            )
    except Exception as exc:
        result = LLMModelTestResponse(
            success=False, status=_classify_test_failure(str(exc)), message=str(exc),
        )

    # Only record against a saved model — this endpoint also tests unsaved drafts.
    if payload.model_id:
        _record_test_result(payload.model_id, result.status, result.message)
    return result
