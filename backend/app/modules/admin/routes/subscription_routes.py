"""Subscription plans routes for admin panel."""

from app.modules.admin.services.admin_activity_logger import log_admin_activity

import pyodbc
from fastapi import APIRouter, HTTPException

from app.core.db_utils import get_connection_string
from app.modules.admin.schemas import (
    DeleteSubscriptionPlanResponse,
    SubscriptionFeature,
    SubscriptionPlan,
    SubscriptionUsageSummary,
    SubscriptionPlanUpsertPayload,
)
from app.modules.admin.services.subscription_service import (
    create_subscription_plan,
    delete_subscription_plan,
    get_subscription_features,
    get_subscription_plans,
    get_user_subscription_usage,
    update_subscription_plan,
)

router = APIRouter(tags=["Admin Subscription Plans"])


@router.get("/subscription-features", response_model=list[SubscriptionFeature])
def list_subscription_features() -> list[SubscriptionFeature]:
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            return get_subscription_features(cursor)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to load subscription features: {exc}") from exc


@router.get("/subscription-plans", response_model=list[SubscriptionPlan])
def list_subscription_plans() -> list[SubscriptionPlan]:
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            return get_subscription_plans(cursor)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to load subscription plans: {exc}") from exc


@router.get("/subscription-usage/{user_id}", response_model=SubscriptionUsageSummary)
def get_subscription_usage(user_id: str) -> SubscriptionUsageSummary:
    try:
        normalized_user_id = user_id.strip()
        if not normalized_user_id:
            raise HTTPException(status_code=400, detail="user_id is required")

        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            return get_user_subscription_usage(cursor, normalized_user_id)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to load subscription usage: {exc}") from exc


@router.post("/subscription-plans", response_model=SubscriptionPlan)
def create_plan(payload: SubscriptionPlanUpsertPayload) -> SubscriptionPlan:
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            plan = create_subscription_plan(cursor, payload)
            conn.commit()
            log_admin_activity(
                "subscription_changed",
                "Subscription Plan Created",
                f"Plan '{payload.name}' (${payload.monthlyPrice}/mo)",
            )
            return plan
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to create subscription plan: {exc}") from exc


@router.patch("/subscription-plans/{plan_id}", response_model=SubscriptionPlan)
def update_plan(plan_id: str, payload: SubscriptionPlanUpsertPayload) -> SubscriptionPlan:
    try:
        plan_id_int = int(plan_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="plan_id must be numeric")

    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            plan = update_subscription_plan(cursor, plan_id_int, payload)
            conn.commit()
            log_admin_activity(
                "subscription_changed",
                "Subscription Plan Updated",
                f"Plan '{payload.name}' (ID: {plan_id})",
            )
            return plan
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to update subscription plan: {exc}") from exc


@router.delete("/subscription-plans/{plan_id}", response_model=DeleteSubscriptionPlanResponse)
def delete_plan(plan_id: str) -> DeleteSubscriptionPlanResponse:
    try:
        plan_id_int = int(plan_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="plan_id must be numeric")

    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            delete_subscription_plan(cursor, plan_id_int)
            conn.commit()
        log_admin_activity(
            "subscription_changed",
            "Subscription Plan Deleted",
            f"Plan ID: {plan_id}",
        )
        return DeleteSubscriptionPlanResponse(status="deleted", planId=str(plan_id_int))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to delete subscription plan: {exc}") from exc
