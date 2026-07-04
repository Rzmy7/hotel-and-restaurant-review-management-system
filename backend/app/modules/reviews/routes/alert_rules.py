"""
Alert Rules API routes — CRUD for configurable alert rules.

Endpoints:
- List/create rules for an organization
- Get/update/delete a specific rule
- Trigger immediate evaluation
"""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.auth.utils.auth_utils import get_current_user
from app.core.tenant_context import resolve_tenant_scope
from app.modules.reviews.services.alert_rules_service import (
    get_rules_for_org,
    get_rule_by_id,
    create_rule,
    update_rule,
    delete_rule,
    evaluate_and_notify,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/reviews/alert-rules", tags=["Alert Rules"])


@router.get("/{org_id}", summary="List alert rules for an organization")
def list_rules(
    org_id: str,
    enabled_only: bool = False,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get all alert rules for an organization."""
    try:
        resolve_tenant_scope(current_user, db, org_id)
        rules = get_rules_for_org(org_id, enabled_only=enabled_only)
        return {"rules": rules, "total": len(rules)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list rules for org {org_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve alert rules.")


@router.post("/{org_id}", summary="Create a new alert rule")
def create_alert_rule(
    org_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Create a configurable alert rule.

    Body: {
        "name": "Low Rating Alert",
        "description": "Alert on ratings <= 2 stars",
        "condition_type": "low_rating",        // low_rating | negative_sentiment_spike | response_overdue
        "threshold": 2,                         // max rating for low_rating, min count for spike, max hours for overdue
        "lookback_hours": 24,                   // evaluation window
        "action_type": "notification"           // notification | email (future)
    }
    """
    try:
        resolve_tenant_scope(current_user, db, org_id)

        # Validate required fields
        name = (payload.get("name") or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="name is required")

        condition = payload.get("condition_type", "low_rating")
        valid_conditions = {"low_rating", "negative_sentiment_spike", "response_overdue"}
        if condition not in valid_conditions:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid condition_type. Must be one of: {', '.join(sorted(valid_conditions))}",
            )

        rule = create_rule(org_id, payload)
        return {"rule": rule}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create rule for org {org_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to create alert rule.")


@router.get("/{org_id}/{rule_id}", summary="Get a specific alert rule")
def get_rule(
    org_id: str,
    rule_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get a single alert rule by ID."""
    try:
        resolve_tenant_scope(current_user, db, org_id)
        rule = get_rule_by_id(rule_id)
        if not rule or rule.get("organization_id") != org_id:
            raise HTTPException(status_code=404, detail="Rule not found.")
        return {"rule": rule}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get rule {rule_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve alert rule.")


@router.put("/{org_id}/{rule_id}", summary="Update an alert rule")
def update_alert_rule(
    org_id: str,
    rule_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update an existing alert rule."""
    try:
        resolve_tenant_scope(current_user, db, org_id)

        existing = get_rule_by_id(rule_id)
        if not existing or existing.get("organization_id") != org_id:
            raise HTTPException(status_code=404, detail="Rule not found.")

        rule = update_rule(rule_id, payload)
        return {"rule": rule}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update rule {rule_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update alert rule.")


@router.delete("/{org_id}/{rule_id}", summary="Delete an alert rule")
def delete_alert_rule(
    org_id: str,
    rule_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Delete an alert rule."""
    try:
        resolve_tenant_scope(current_user, db, org_id)

        existing = get_rule_by_id(rule_id)
        if not existing or existing.get("organization_id") != org_id:
            raise HTTPException(status_code=404, detail="Rule not found.")

        success = delete_rule(rule_id)
        return {"message": "Rule deleted successfully" if success else "Rule not found"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete rule {rule_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete alert rule.")


@router.post("/{org_id}/evaluate", summary="Trigger rule evaluation now")
def trigger_evaluation(
    org_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Manually trigger evaluation of all enabled rules for an organization.
    Returns any alerts that were triggered.
    """
    try:
        resolve_tenant_scope(current_user, db, org_id)
        triggered = evaluate_and_notify(org_id)
        return {
            "message": f"Evaluation complete. {len(triggered)} rule(s) triggered.",
            "triggered": triggered,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to evaluate rules for org {org_id}: {e}")
        raise HTTPException(status_code=500, detail="Rule evaluation failed.")
