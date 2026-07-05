"""
Review Replies route module — dedicated endpoints for AI reply management.

Handles: reply history, save/edit, delete, and retrieval.
"""

import uuid
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.modules.auth.utils.auth_utils import get_current_user
from app.core.tenant_context import resolve_tenant_scope

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/reviews", tags=["Review Replies"])


def _verify_review_ownership(db: Session, review_id: uuid.UUID, current_user):
    """Verify a review exists and belongs to the user's organization."""
    row = db.execute(
        text("""
            SELECT s.organization_id
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE r.id = :review_id
        """),
        {"review_id": str(review_id)},
    ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Review not found.")

    resolve_tenant_scope(current_user, db, str(row[0]))
    return str(row[0])


@router.get("/{review_id}/replies", summary="Get reply history for a review")
def get_reply_history(
    review_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Returns all reply versions for a review, ordered by most recent first.
    """
    try:
        _verify_review_ownership(db, review_id, current_user)

        rows = db.execute(
            text("""
                SELECT
                    CAST(id AS VARCHAR(36)) AS id,
                    reply_text,
                    tone,
                    created_at,
                    updated_at,
                    is_edited
                FROM dbo.review_reply
                WHERE review_id = :review_id
                ORDER BY created_at DESC
            """),
            {"review_id": str(review_id)},
        ).fetchall()

        return {
            "review_id": str(review_id),
            "replies": [
                {
                    "id": row.id,
                    "replyText": row.reply_text,
                    "tone": row.tone,
                    "createdAt": row.created_at.isoformat() if row.created_at else None,
                    "updatedAt": row.updated_at.isoformat() if row.updated_at else None,
                    "isEdited": bool(row.is_edited),
                }
                for row in rows
            ],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch replies for review {review_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch replies.")


@router.get("/{review_id}/replies/latest", summary="Get the latest reply for a review")
def get_latest_reply(
    review_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Returns the most recent reply for a review.
    """
    try:
        _verify_review_ownership(db, review_id, current_user)

        row = db.execute(
            text("""
                SELECT TOP 1
                    CAST(id AS VARCHAR(36)) AS id,
                    reply_text,
                    tone,
                    created_at,
                    updated_at,
                    is_edited
                FROM dbo.review_reply
                WHERE review_id = :review_id
                ORDER BY created_at DESC
            """),
            {"review_id": str(review_id)},
        ).fetchone()

        if not row:
            # Fall back to ai_reply column on processed_review for legacy data
            legacy = db.execute(
                text("""
                    SELECT ai_reply FROM dbo.processed_review WHERE id = :review_id
                """),
                {"review_id": str(review_id)},
            ).fetchone()

            if legacy and legacy.ai_reply:
                return {
                    "review_id": str(review_id),
                    "reply": {
                        "id": None,
                        "replyText": legacy.ai_reply,
                        "tone": None,
                        "createdAt": None,
                        "isEdited": False,
                    },
                }

            return {"review_id": str(review_id), "reply": None}

        return {
            "review_id": str(review_id),
            "reply": {
                "id": row.id,
                "replyText": row.reply_text,
                "tone": row.tone,
                "createdAt": row.created_at.isoformat() if row.created_at else None,
                "updatedAt": row.updated_at.isoformat() if row.updated_at else None,
                "isEdited": bool(row.is_edited),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch latest reply for review {review_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch latest reply.")


@router.post("/{review_id}/reply", summary="Save a reply for a review")
def save_reply(
    review_id: uuid.UUID,
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Save an AI-generated or manually written reply for a review.
    Creates a new entry in the review_reply table for history tracking.
    Also updates the ai_reply column on processed_review for backward compatibility.

    Body: { "replyText": "...", "tone": "professional" (optional) }
    """
    try:
        _verify_review_ownership(db, review_id, current_user)

        reply_text = (payload.get("replyText") or "").strip()
        if not reply_text:
            raise HTTPException(status_code=400, detail="replyText is required")

        tone = payload.get("tone", None)

        # Get current user ID for created_by tracking
        user_id = (
            str(current_user.user_id)
            if hasattr(current_user, "user_id")
            else str(current_user.get("user_id") or current_user.get("id"))
            if isinstance(current_user, dict)
            else None
        )

        now = datetime.utcnow()

        # Insert into review_reply table
        reply_id = uuid.uuid4()
        db.execute(
            text("""
                INSERT INTO dbo.review_reply
                    (id, review_id, reply_text, tone, created_at, created_by)
                VALUES
                    (:id, :review_id, :reply_text, :tone, :created_at, :created_by)
            """),
            {
                "id": str(reply_id),
                "review_id": str(review_id),
                "reply_text": reply_text,
                "tone": tone,
                "created_at": now,
                "created_by": user_id,
            },
        )

        # Update processed_review for backward compatibility
        db.execute(
            text("""
                UPDATE dbo.processed_review
                SET ai_reply = :reply_text
                WHERE id = :review_id
            """),
            {"reply_text": reply_text, "review_id": str(review_id)},
        )

        db.commit()

        return {
            "message": "Reply saved successfully",
            "reply_id": str(reply_id),
            "review_id": str(review_id),
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to save reply for review {review_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to save reply.")


@router.put("/{review_id}/reply/{reply_id}", summary="Edit an existing reply")
def edit_reply(
    review_id: uuid.UUID,
    reply_id: uuid.UUID,
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Edit an existing reply, marking it as edited and recording the update time.

    Body: { "replyText": "..." }
    """
    try:
        _verify_review_ownership(db, review_id, current_user)

        reply_text = (payload.get("replyText") or "").strip()
        if not reply_text:
            raise HTTPException(status_code=400, detail="replyText is required")

        # Verify the reply belongs to this review
        exists = db.execute(
            text("""
                SELECT id FROM dbo.review_reply
                WHERE id = :reply_id AND review_id = :review_id
            """),
            {"reply_id": str(reply_id), "review_id": str(review_id)},
        ).fetchone()

        if not exists:
            raise HTTPException(status_code=404, detail="Reply not found for this review.")

        now = datetime.utcnow()

        # Update the reply
        db.execute(
            text("""
                UPDATE dbo.review_reply
                SET reply_text = :reply_text,
                    updated_at = :updated_at,
                    is_edited = 1
                WHERE id = :reply_id
            """),
            {
                "reply_text": reply_text,
                "updated_at": now,
                "reply_id": str(reply_id),
            },
        )

        # Also update the ai_reply on processed_review
        db.execute(
            text("""
                UPDATE dbo.processed_review
                SET ai_reply = :reply_text
                WHERE id = :review_id
            """),
            {"reply_text": reply_text, "review_id": str(review_id)},
        )

        db.commit()

        return {
            "message": "Reply updated successfully",
            "reply_id": str(reply_id),
            "review_id": str(review_id),
            "updated_at": now.isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to edit reply {reply_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to edit reply.")


@router.delete("/{review_id}/reply/{reply_id}", summary="Delete a reply")
def delete_reply(
    review_id: uuid.UUID,
    reply_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Delete a specific reply from the history.
    Also clears the ai_reply on processed_review if it was the latest.
    """
    try:
        _verify_review_ownership(db, review_id, current_user)

        result = db.execute(
            text("""
                DELETE FROM dbo.review_reply
                WHERE id = :reply_id AND review_id = :review_id
            """),
            {"reply_id": str(reply_id), "review_id": str(review_id)},
        )

        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Reply not found for this review.")

        # Check if there are any remaining replies
        remaining = db.execute(
            text("""
                SELECT TOP 1 reply_text FROM dbo.review_reply
                WHERE review_id = :review_id
                ORDER BY created_at DESC
            """),
            {"review_id": str(review_id)},
        ).fetchone()

        if remaining:
            # Update ai_reply to the latest remaining reply
            db.execute(
                text("""
                    UPDATE dbo.processed_review
                    SET ai_reply = :reply_text
                    WHERE id = :review_id
                """),
                {"reply_text": remaining.reply_text, "review_id": str(review_id)},
            )
        else:
            # Clear ai_reply and reset status
            db.execute(
                text("""
                    UPDATE dbo.processed_review
                    SET ai_reply = NULL
                    WHERE id = :review_id
                """),
                {"review_id": str(review_id)},
            )

        db.commit()

        return {
            "message": "Reply deleted successfully",
            "reply_id": str(reply_id),
            "review_id": str(review_id),
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete reply {reply_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete reply.")
