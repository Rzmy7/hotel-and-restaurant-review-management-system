"""
Rules & Regulations Service.

Handles file parsing (.txt, .docx, .pdf), LLM-based rule extraction,
database persistence, and embedding dispatch.
"""

from __future__ import annotations

import io
import json
import logging
import os
import re
import uuid
from typing import Any

import pyodbc
import requests
from fastapi import UploadFile
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.db_utils import get_connection_string
from app.services.llm_gateway import call as gateway_call
from app.modules.admin.services.system_settings_service import (
    ensure_system_settings_table,
    get_setting,
)

logger = logging.getLogger(__name__)

from app.core.config import EMBEDDING_SERVICE_URL

# ── Internal API Key (shared secret for service-to-service auth) ─────────────
from app.core.config import EMBEDDING_API_KEY
_AUTH_HEADERS = {"X-Internal-API-Key": EMBEDDING_API_KEY}

ALLOWED_EXTENSIONS = {".txt", ".docx", ".pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


# ── File Parsing ────────────────────────────────────────────────────

def _extract_text_from_txt(file_bytes: bytes) -> str:
    return file_bytes.decode("utf-8", errors="replace")


def _extract_text_from_docx(file_bytes: bytes) -> str:
    try:
        from docx import Document
    except ImportError:
        raise RuntimeError(
            "python-docx is not installed. Install it with: pip install python-docx"
        )

    doc = Document(io.BytesIO(file_bytes))
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paragraphs)


def _extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        from PyPDF2 import PdfReader
    except ImportError:
        raise RuntimeError(
            "PyPDF2 is not installed. Install it with: pip install PyPDF2"
        )

    reader = PdfReader(io.BytesIO(file_bytes))
    pages_text = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            pages_text.append(page_text.strip())
    return "\n".join(pages_text)


def _parse_uploaded_file(file_bytes: bytes, filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    if ext == ".txt":
        return _extract_text_from_txt(file_bytes)
    elif ext == ".docx":
        return _extract_text_from_docx(file_bytes)
    elif ext == ".pdf":
        return _extract_text_from_pdf(file_bytes)
    else:
        raise ValueError(f"Unsupported file type: {ext}. Allowed: .txt, .docx, .pdf")


# ── LLM Rule Extraction ─────────────────────────────────────────────

RULES_EXTRACTION_PROMPT = """You are a document analyst. Your task is to extract individual rules and regulations from the following document text.

Instructions:
1. Read the entire document carefully.
2. Split the content into separate, individual rules or regulations.
3. Each rule should be a self-contained statement that can stand on its own.
4. Remove any numbering, bullet points, or formatting prefixes from the rules.
5. Do NOT add any rules that are not in the original document.
6. Do NOT merge multiple rules into one.
7. Output MUST be ONLY a valid JSON array of strings, where each string is one rule.
8. Do not include markdown fences, labels, or explanation.

Document Text:
{document_text}
"""


def _extract_rules_with_llm(document_text: str) -> list[str]:
    """Send document text to the LLM Gateway and get back a list of individual rules."""
    prompt = RULES_EXTRACTION_PROMPT.format(document_text=document_text)

    try:
        raw_text = gateway_call("rule_extraction", prompt)
        # Clean markdown fences
        raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
        raw_text = re.sub(r"\s*```$", "", raw_text)

        rules = json.loads(raw_text)
        if not isinstance(rules, list):
            raise ValueError("LLM returned non-list output for rules extraction.")

        # Ensure all items are strings and non-empty
        cleaned = [str(r).strip() for r in rules if str(r).strip()]
        return cleaned

    except Exception as exc:
        logger.error(f"Rule extraction failed: {exc}")
        raise ValueError(f"Rule extraction failed: {exc}") from exc


# ── Database Operations ─────────────────────────────────────────────

def _delete_existing_rules(db: Session, organization_id: str) -> int:
    """Delete all existing rules for an organization. Returns count deleted."""
    result = db.execute(
        text("DELETE FROM dbo.organization_rule WHERE organization_id = :org_id"),
        {"org_id": organization_id},
    )
    return result.rowcount


def _insert_rules(db: Session, organization_id: str, rules: list[str], filename: str) -> list[dict[str, Any]]:
    """Insert extracted rules into the database. Returns list of inserted rule records."""
    inserted = []
    for idx, rule_text in enumerate(rules):
        rule_id = uuid.uuid4()
        db.execute(
            text("""
                INSERT INTO dbo.organization_rule
                (rule_id, organization_id, rule_text, rule_order, is_embedded, source_filename, created_at)
                VALUES (:rule_id, :org_id, :rule_text, :rule_order, 0, :filename, GETDATE())
            """),
            {
                "rule_id": rule_id,
                "org_id": organization_id,
                "rule_text": rule_text,
                "rule_order": idx + 1,
                "filename": filename,
            },
        )
        inserted.append({
            "rule_id": str(rule_id).upper(),  # Uppercase for ChromaDB consistency
            "rule_text": rule_text,
            "rule_order": idx + 1,
        })
    return inserted


def _get_source_id_for_org(db: Session, organization_id: str) -> str | None:
    """Get the first source_id for an organization (used for embedding namespace)."""
    row = db.execute(
        text("SELECT TOP 1 source_id FROM dbo.source WHERE organization_id = :org_id"),
        {"org_id": organization_id},
    ).fetchone()
    return str(row[0]).upper() if row else None  # Uppercase for ChromaDB consistency


# ── Embedding Dispatch ──────────────────────────────────────────────

def _send_rules_to_embedding(rules: list[dict[str, Any]], source_id: str) -> dict[str, Any]:
    """Send extracted rules to the embedding service for vectorization."""
    if not rules or not source_id:
        return {"embedded_count": 0, "skipped": True}

    payload = {
        "source_id": source_id.upper(),  # Uppercase for ChromaDB consistency
        "rules": [
            {"rule_id": r["rule_id"], "text": r["rule_text"]}
            for r in rules
        ],
    }

    try:
        response = requests.post(
            f"{EMBEDDING_SERVICE_URL}/embed/rule",
            json=payload,
            headers=_AUTH_HEADERS,
            timeout=60,
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"Failed to embed rules: {e}")
        return {"embedded_count": 0, "error": str(e)}


def _mark_rules_as_embedded(db: Session, rule_ids: list[str]) -> None:
    """Mark rules as embedded in the database."""
    if not rule_ids:
        return
    for rule_id in rule_ids:
        db.execute(
            text("UPDATE dbo.organization_rule SET is_embedded = 1 WHERE rule_id = :rule_id"),
            {"rule_id": rule_id},
        )


# ── Main Service Function ──────────────────────────────────────────

async def process_rules_upload(
    db: Session,
    organization_id: str,
    file: UploadFile,
) -> dict[str, Any]:
    """
    Full pipeline: validate file → parse text → LLM extraction →
    store in DB → send to embedding.
    """
    # 1. Validate file
    filename = file.filename or "unknown"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file type: {ext}. Allowed: .txt, .docx, .pdf")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise ValueError(f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB.")

    if len(file_bytes) == 0:
        raise ValueError("Uploaded file is empty.")

    # 2. Extract text from file
    document_text = _parse_uploaded_file(file_bytes, filename)
    if not document_text.strip():
        raise ValueError("Could not extract any text from the uploaded file.")

    # 3. Send to LLM Gateway for rule extraction
    rules = _extract_rules_with_llm(document_text)
    if not rules:
        raise ValueError("Could not extract any rules from the document.")

    # 4. Delete old rules for this organization
    deleted_count = _delete_existing_rules(db, organization_id)

    # 5. Insert new rules
    inserted_rules = _insert_rules(db, organization_id, rules, filename)
    db.commit()

    # 6. Send to embedding service
    source_id = _get_source_id_for_org(db, organization_id)
    embed_result = {"embedded_count": 0, "skipped": True, "reason": "no_source"}

    if source_id:
        # 6a. Delete old rule embeddings from ChromaDB before re-embedding
        try:
            requests.delete(
                f"{EMBEDDING_SERVICE_URL}/delete/source/{source_id}/rules",
                headers=_AUTH_HEADERS,
                timeout=30,
            )
            logger.info(f"Cleared old rule embeddings for source_id={source_id}")
        except Exception as e:
            logger.warning(f"Failed to clear old rule embeddings: {e}")

        # 6b. Embed new rules
        embed_result = _send_rules_to_embedding(inserted_rules, source_id)

        # 7. Mark successfully embedded rules
        embedded_ids = embed_result.get("embedded_ids", [])
        if embedded_ids:
            _mark_rules_as_embedded(db, embedded_ids)
            db.commit()

    return {
        "message": "Rules processed successfully",
        "filename": filename,
        "rules_extracted": len(rules),
        "rules_deleted": deleted_count,
        "embedding_result": embed_result,
        "rules": [{"rule_id": r["rule_id"], "text": r["rule_text"], "order": r["rule_order"]} for r in inserted_rules],
    }


def get_organization_rules(db: Session, organization_id: str) -> list[dict[str, Any]]:
    """Fetch all rules for an organization."""
    rows = db.execute(
        text("""
            SELECT rule_id, rule_text, rule_order, is_embedded, source_filename, created_at
            FROM dbo.organization_rule
            WHERE organization_id = :org_id
            ORDER BY rule_order ASC
        """),
        {"org_id": organization_id},
    ).fetchall()

    return [
        {
            "rule_id": str(row[0]),
            "rule_text": row[1],
            "rule_order": row[2],
            "is_embedded": bool(row[3]),
            "source_filename": row[4],
            "created_at": str(row[5]) if row[5] else None,
        }
        for row in rows
    ]


def delete_single_rule(db: Session, organization_id: str, rule_id: str) -> dict[str, Any]:
    """Delete a single rule from database and from embedding service."""
    # Check if the rule exists and belongs to this organization
    row = db.execute(
        text("SELECT rule_id FROM dbo.organization_rule WHERE rule_id = :rule_id AND organization_id = :org_id"),
        {"rule_id": rule_id, "org_id": organization_id},
    ).fetchone()
    
    if not row:
        raise ValueError("Rule not found for this organization.")

    # Call embedding service to delete the rule embedding
    try:
        response = requests.delete(
            f"{EMBEDDING_SERVICE_URL}/delete/rule/{str(rule_id).upper()}",
            headers=_AUTH_HEADERS,
            timeout=30,
        )
        response.raise_for_status()
    except Exception as e:
        logger.warning(f"Failed to delete rule embedding from ChromaDB: {e}")

    # Delete from database
    db.execute(
        text("DELETE FROM dbo.organization_rule WHERE rule_id = :rule_id AND organization_id = :org_id"),
        {"rule_id": rule_id, "org_id": organization_id},
    )
    db.commit()
    
    return {"message": "Rule deleted successfully", "rule_id": rule_id}


def add_single_rule(db: Session, organization_id: str, rule_text: str) -> dict[str, Any]:
    """Add a single rule manually, insert into DB and send to embedding service directly."""
    if not rule_text.strip():
        raise ValueError("Rule text cannot be empty.")
        
    rule_id = uuid.uuid4()
    
    # Get current max rule_order
    max_order_row = db.execute(
        text("SELECT MAX(rule_order) FROM dbo.organization_rule WHERE organization_id = :org_id"),
        {"org_id": organization_id},
    ).fetchone()
    
    next_order = (max_order_row[0] or 0) + 1 if max_order_row else 1
    
    # Insert rule
    db.execute(
        text("""
            INSERT INTO dbo.organization_rule
            (rule_id, organization_id, rule_text, rule_order, is_embedded, source_filename, created_at)
            VALUES (:rule_id, :org_id, :rule_text, :rule_order, 0, 'manual', GETDATE())
        """),
        {
            "rule_id": rule_id,
            "org_id": organization_id,
            "rule_text": rule_text.strip(),
            "rule_order": next_order,
        },
    )
    db.commit()
    
    # Send to embedding service
    source_id = _get_source_id_for_org(db, organization_id)
    is_embedded = False
    
    if source_id:
        inserted_rule = {
            "rule_id": str(rule_id).upper(),
            "rule_text": rule_text.strip(),
            "rule_order": next_order,
        }
        embed_result = _send_rules_to_embedding([inserted_rule], source_id)
        embedded_ids = embed_result.get("embedded_ids", [])
        if embedded_ids:
            _mark_rules_as_embedded(db, embedded_ids)
            db.commit()
            is_embedded = True
            
    return {
        "rule_id": str(rule_id).upper(),
        "rule_text": rule_text.strip(),
        "rule_order": next_order,
        "is_embedded": is_embedded,
        "source_filename": "manual",
        "created_at": None,
    }
