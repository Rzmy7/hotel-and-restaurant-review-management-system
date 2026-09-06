"""Admin routes for managing FAQs and retrieving active platforms."""

import pyodbc
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.db_utils import get_connection_string
from app.modules.admin.services.faq_service import (
    get_admin_faqs,
    create_faq,
    update_faq,
    delete_faq,
    get_active_platforms,
    format_platform_list,
)

router = APIRouter(prefix="/faqs", tags=["Admin - FAQs"])


class FaqCreatePayload(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)
    answer: str = Field(..., min_length=1)
    sort_order: int = Field(default=0, ge=0)
    is_active: bool = Field(default=True)
    is_platform_question: bool = Field(default=False)


class FaqUpdatePayload(BaseModel):
    question: Optional[str] = Field(default=None, max_length=500)
    answer: Optional[str] = None
    sort_order: Optional[int] = Field(default=None, ge=0)
    is_active: Optional[bool] = None
    is_platform_question: Optional[bool] = None


@router.get("")
def list_admin_faqs():
    """List all FAQs (active and inactive) for admin management."""
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            return get_admin_faqs(cursor)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch FAQs: {exc}")


@router.post("", status_code=201)
def add_faq(payload: FaqCreatePayload):
    """Create a new FAQ."""
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            faq = create_faq(
                cursor=cursor,
                question=payload.question,
                answer=payload.answer,
                sort_order=payload.sort_order,
                is_active=payload.is_active,
                is_platform_question=payload.is_platform_question,
            )
            conn.commit()
            return faq
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to create FAQ: {exc}")


@router.put("/{faq_id}")
def edit_faq(faq_id: int, payload: FaqUpdatePayload):
    """Update an existing FAQ."""
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            faq = update_faq(
                cursor=cursor,
                faq_id=faq_id,
                question=payload.question,
                answer=payload.answer,
                sort_order=payload.sort_order,
                is_active=payload.is_active,
                is_platform_question=payload.is_platform_question,
            )
            conn.commit()
            return faq
    except ValueError as val_err:
        raise HTTPException(status_code=404, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to update FAQ: {exc}")


@router.delete("/{faq_id}")
def remove_faq(faq_id: int):
    """Delete an FAQ entry."""
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            deleted = delete_faq(cursor, faq_id)
            if not deleted:
                raise HTTPException(status_code=404, detail="FAQ not found")
            conn.commit()
            return {"message": "FAQ deleted successfully", "id": faq_id}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete FAQ: {exc}")


@router.get("/active-platforms")
def active_platforms():
    """Retrieve active platforms and auto-generated answer snippet for supported platforms question."""
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            platforms = get_active_platforms(cursor)
            formatted_text = format_platform_list(platforms)
            return {
                "platforms": platforms,
                "formatted_list": formatted_text,
                "suggested_answer": f"We support all major review platforms including {formatted_text}.",
            }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve active platforms: {exc}")
