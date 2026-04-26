from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.modules.auth.utils.auth_utils import get_current_user
from app.database.session import get_db

router = APIRouter(prefix="/api", tags=["user"])

from pydantic import BaseModel


class UpdatePlanRequest(BaseModel):
    plan_id: str


@router.put("/tenant/plan")
def update_tenant_plan(
    payload: UpdatePlanRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.execute(
        text("""
        UPDATE dbo.[tenant]
        SET [plan] = :plan_id
        WHERE [tenant_id] = :user_id
    """),
        {"plan_id": payload.plan_id, "user_id": str(user.user_id)},
    )
    db.commit()

    # ── Send plan changed notification ──
    try:
        from app.services.notification_helpers import notify_plan_changed_by_user

        plan_row = db.execute(
            text("SELECT name FROM dbo.plans WHERE plan_id = :plan_id"),
            {"plan_id": payload.plan_id},
        ).fetchone()
        plan_name = str(plan_row[0]) if plan_row else f"Plan #{payload.plan_id}"
        notify_plan_changed_by_user(str(user.user_id), plan_name)
    except Exception:
        pass  # Best-effort

    return {"message": "Plan updated successfully", "plan_id": payload.plan_id}
