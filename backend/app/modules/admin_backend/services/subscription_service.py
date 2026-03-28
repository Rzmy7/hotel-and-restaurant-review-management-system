"""Subscription plan data service for admin management APIs."""

from decimal import Decimal

import pyodbc
from fastapi import HTTPException

from app.modules.admin_backend.schemas import (
    SubscriptionFeature,
    SubscriptionPlan,
    SubscriptionPlanFeatureState,
    SubscriptionPlanUpsertPayload,
)

DEFAULT_FEATURES: list[dict[str, object]] = [
    {
        "key": "organizations",
        "name": "Organizations",
        "description": "Maximum number of organizations allowed.",
        "supportsLimit": True,
        "sortOrder": 1,
    },
    {
        "key": "groups",
        "name": "Groups",
        "description": "Maximum number of groups allowed.",
        "supportsLimit": True,
        "sortOrder": 2,
    },
    {
        "key": "scraping_frequency",
        "name": "Scraping Frequency",
        "description": "How frequently scraping jobs can run.",
        "supportsLimit": True,
        "sortOrder": 3,
    },
    {
        "key": "reply_generations",
        "name": "Reply Generations",
        "description": "Maximum number of AI reply generations.",
        "supportsLimit": True,
        "sortOrder": 4,
    },
    {
        "key": "insights",
        "name": "Insights",
        "description": "Access to insights features.",
        "supportsLimit": False,
        "sortOrder": 5,
    },
    {
        "key": "review_count",
        "name": "Review Count",
        "description": "Maximum number of reviews that can be processed.",
        "supportsLimit": True,
        "sortOrder": 6,
    },
    {
        "key": "competitors",
        "name": "Competitors",
        "description": "Maximum number of competitors that can be tracked.",
        "supportsLimit": True,
        "sortOrder": 7,
    },
]


def _to_float(value: Decimal | float | int | None) -> float:
    if value is None:
        return 0.0
    return float(value)


def ensure_subscription_tables(cursor: pyodbc.Cursor) -> None:
    cursor.execute(
        """
        IF OBJECT_ID('dbo.plans', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.plans (
                plan_id INT IDENTITY(1,1) NOT NULL
                    CONSTRAINT PK_plans PRIMARY KEY,
                name NVARCHAR(100) NOT NULL,
                description NVARCHAR(255) NULL,
                monthly_price DECIMAL(10,2) NOT NULL
                    CONSTRAINT DF_plans_monthly_price DEFAULT 0,
                annual_price DECIMAL(10,2) NOT NULL
                    CONSTRAINT DF_plans_annual_price DEFAULT 0,
                currency NVARCHAR(16) NOT NULL
                    CONSTRAINT DF_plans_currency DEFAULT 'USD',
                is_popular BIT NOT NULL
                    CONSTRAINT DF_plans_is_popular DEFAULT 0,
                is_active BIT NOT NULL
                    CONSTRAINT DF_plans_is_active DEFAULT 1,
                color NVARCHAR(100) NOT NULL
                    CONSTRAINT DF_plans_color DEFAULT 'from-blue-500 to-blue-600',
                icon_name NVARCHAR(30) NOT NULL
                    CONSTRAINT DF_plans_icon_name DEFAULT 'star',
                created_at DATETIME2(7) NOT NULL
                    CONSTRAINT DF_plans_created_at DEFAULT SYSUTCDATETIME(),
                updated_at DATETIME2(7) NOT NULL
                    CONSTRAINT DF_plans_updated_at DEFAULT SYSUTCDATETIME(),
                CONSTRAINT UQ_plans_name UNIQUE (name)
            );
        END;

        IF OBJECT_ID('dbo.features', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.features (
                feature_id INT IDENTITY(1,1) NOT NULL
                    CONSTRAINT PK_features PRIMARY KEY,
                feature_key NVARCHAR(64) NOT NULL,
                display_name NVARCHAR(100) NOT NULL,
                description NVARCHAR(255) NULL,
                supports_limit BIT NOT NULL
                    CONSTRAINT DF_features_supports_limit DEFAULT 1,
                sort_order INT NOT NULL
                    CONSTRAINT DF_features_sort_order DEFAULT 0,
                created_at DATETIME2(7) NOT NULL
                    CONSTRAINT DF_features_created_at DEFAULT SYSUTCDATETIME(),
                CONSTRAINT UQ_features_feature_key UNIQUE (feature_key)
            );
        END;

        IF OBJECT_ID('dbo.plan_feature', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.plan_feature (
                plan_feature_id INT IDENTITY(1,1) NOT NULL
                    CONSTRAINT PK_plan_feature PRIMARY KEY,
                plan_id INT NOT NULL,
                feature_id INT NOT NULL,
                is_enabled BIT NOT NULL
                    CONSTRAINT DF_plan_feature_is_enabled DEFAULT 0,
                feature_limit INT NULL,
                created_at DATETIME2(7) NOT NULL
                    CONSTRAINT DF_plan_feature_created_at DEFAULT SYSUTCDATETIME(),
                updated_at DATETIME2(7) NOT NULL
                    CONSTRAINT DF_plan_feature_updated_at DEFAULT SYSUTCDATETIME(),
                CONSTRAINT FK_plan_feature_plan
                    FOREIGN KEY (plan_id) REFERENCES dbo.plans(plan_id) ON DELETE CASCADE,
                CONSTRAINT FK_plan_feature_feature
                    FOREIGN KEY (feature_id) REFERENCES dbo.features(feature_id) ON DELETE CASCADE,
                CONSTRAINT UQ_plan_feature_plan_feature UNIQUE (plan_id, feature_id)
            );
        END;

        IF OBJECT_ID('dbo.user_subscription', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.user_subscription (
                user_subscription_id INT IDENTITY(1,1) NOT NULL
                    CONSTRAINT PK_user_subscription PRIMARY KEY,
                user_id NVARCHAR(64) NOT NULL,
                plan_id INT NULL,
                status NVARCHAR(30) NOT NULL
                    CONSTRAINT DF_user_subscription_status DEFAULT 'active',
                starts_at DATETIME2(7) NOT NULL
                    CONSTRAINT DF_user_subscription_starts_at DEFAULT SYSUTCDATETIME(),
                ends_at DATETIME2(7) NULL,
                created_at DATETIME2(7) NOT NULL
                    CONSTRAINT DF_user_subscription_created_at DEFAULT SYSUTCDATETIME(),
                updated_at DATETIME2(7) NOT NULL
                    CONSTRAINT DF_user_subscription_updated_at DEFAULT SYSUTCDATETIME(),
                CONSTRAINT FK_user_subscription_plan
                    FOREIGN KEY (plan_id) REFERENCES dbo.plans(plan_id) ON DELETE SET NULL
            );
        END;
        """
    )


def seed_default_features(cursor: pyodbc.Cursor) -> None:
    ensure_subscription_tables(cursor)
    for feature in DEFAULT_FEATURES:
        cursor.execute(
            """
            IF EXISTS (SELECT 1 FROM dbo.features WHERE feature_key = ?)
            BEGIN
                UPDATE dbo.features
                SET display_name = ?,
                    description = ?,
                    supports_limit = ?,
                    sort_order = ?
                WHERE feature_key = ?
            END
            ELSE
            BEGIN
                INSERT INTO dbo.features (feature_key, display_name, description, supports_limit, sort_order)
                VALUES (?, ?, ?, ?, ?)
            END
            """,
            (
                feature["key"],
                feature["name"],
                feature["description"],
                1 if bool(feature["supportsLimit"]) else 0,
                int(feature["sortOrder"]),
                feature["key"],
                feature["key"],
                feature["name"],
                feature["description"],
                1 if bool(feature["supportsLimit"]) else 0,
                int(feature["sortOrder"]),
            ),
        )


def get_subscription_features(cursor: pyodbc.Cursor) -> list[SubscriptionFeature]:
    seed_default_features(cursor)
    rows = cursor.execute(
        """
        SELECT feature_id, feature_key, display_name, description, supports_limit
        FROM dbo.features
        ORDER BY sort_order, feature_id
        """
    ).fetchall()

    return [
        SubscriptionFeature(
            id=str(row[0]),
            key=str(row[1]),
            name=str(row[2]),
            description=str(row[3]) if row[3] else None,
            supportsLimit=bool(row[4]),
        )
        for row in rows
    ]


def _upsert_plan_feature_rows(
    cursor: pyodbc.Cursor,
    plan_id: int,
    payload: SubscriptionPlanUpsertPayload,
    features: list[SubscriptionFeature],
) -> None:
    payload_by_feature_id: dict[str, tuple[bool, int | None]] = {}
    for feature_payload in payload.features:
        payload_by_feature_id[feature_payload.featureId] = (
            bool(feature_payload.enabled),
            feature_payload.limit,
        )

    for feature in features:
        enabled, limit = payload_by_feature_id.get(feature.id, (False, None))
        if not feature.supportsLimit:
            limit = None

        cursor.execute(
            """
            IF EXISTS (
                SELECT 1
                FROM dbo.plan_feature
                WHERE plan_id = ? AND feature_id = ?
            )
            BEGIN
                UPDATE dbo.plan_feature
                SET is_enabled = ?,
                    feature_limit = ?,
                    updated_at = SYSUTCDATETIME()
                WHERE plan_id = ? AND feature_id = ?
            END
            ELSE
            BEGIN
                INSERT INTO dbo.plan_feature (plan_id, feature_id, is_enabled, feature_limit)
                VALUES (?, ?, ?, ?)
            END
            """,
            (
                plan_id,
                int(feature.id),
                1 if enabled else 0,
                limit,
                plan_id,
                int(feature.id),
                plan_id,
                int(feature.id),
                1 if enabled else 0,
                limit,
            ),
        )


def get_subscription_plans(cursor: pyodbc.Cursor) -> list[SubscriptionPlan]:
    features = get_subscription_features(cursor)

    rows = cursor.execute(
        """
        SELECT
            p.plan_id,
            p.name,
            p.description,
            p.monthly_price,
            p.annual_price,
            p.currency,
            p.is_popular,
            p.is_active,
            p.color,
            p.icon_name,
            f.feature_id,
            f.feature_key,
            f.display_name,
            f.description,
            f.supports_limit,
            COALESCE(pf.is_enabled, 0) AS is_enabled,
            pf.feature_limit
        FROM dbo.plans p
        CROSS JOIN dbo.features f
        LEFT JOIN dbo.plan_feature pf
            ON pf.plan_id = p.plan_id
           AND pf.feature_id = f.feature_id
        ORDER BY p.plan_id, f.sort_order, f.feature_id
        """
    ).fetchall()

    plan_map: dict[int, SubscriptionPlan] = {}
    for row in rows:
        plan_id = int(row[0])
        if plan_id not in plan_map:
            icon_name = str(row[9] or "star")
            if icon_name not in {"zap", "star", "crown", "building"}:
                icon_name = "star"

            plan_map[plan_id] = SubscriptionPlan(
                id=str(plan_id),
                name=str(row[1]),
                description=str(row[2] or ""),
                monthlyPrice=_to_float(row[3]),
                annualPrice=_to_float(row[4]),
                currency=str(row[5] or "USD"),
                isPopular=bool(row[6]),
                isActive=bool(row[7]),
                color=str(row[8] or "from-blue-500 to-blue-600"),
                iconName=icon_name,
                features=[],
            )

        plan_map[plan_id].features.append(
            SubscriptionPlanFeatureState(
                id=str(row[10]),
                key=str(row[11]),
                name=str(row[12]),
                description=str(row[13]) if row[13] else None,
                supportsLimit=bool(row[14]),
                enabled=bool(row[15]),
                limit=int(row[16]) if row[16] is not None else None,
            )
        )

    return list(plan_map.values())


def create_subscription_plan(cursor: pyodbc.Cursor, payload: SubscriptionPlanUpsertPayload) -> SubscriptionPlan:
    features = get_subscription_features(cursor)
    row = cursor.execute(
        """
        INSERT INTO dbo.plans (
            name,
            description,
            monthly_price,
            annual_price,
            currency,
            is_popular,
            is_active,
            color,
            icon_name,
            updated_at
        )
        OUTPUT INSERTED.plan_id
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, SYSUTCDATETIME())
        """,
        (
            payload.name.strip(),
            payload.description.strip(),
            payload.monthlyPrice,
            payload.annualPrice,
            payload.currency.strip(),
            1 if payload.isPopular else 0,
            1 if payload.isActive else 0,
            payload.color.strip(),
            payload.iconName,
        ),
    ).fetchone()
    if row is None or row[0] is None:
        raise HTTPException(status_code=500, detail="Failed to create plan.")

    plan_id = int(row[0])
    _upsert_plan_feature_rows(cursor, plan_id, payload, features)

    plans = get_subscription_plans(cursor)
    for plan in plans:
        if plan.id == str(plan_id):
            return plan

    raise HTTPException(status_code=500, detail="Plan created but could not be loaded.")


def update_subscription_plan(
    cursor: pyodbc.Cursor,
    plan_id: int,
    payload: SubscriptionPlanUpsertPayload,
) -> SubscriptionPlan:
    existing = cursor.execute(
        "SELECT 1 FROM dbo.plans WHERE plan_id = ?",
        (plan_id,),
    ).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Subscription plan not found.")

    features = get_subscription_features(cursor)
    cursor.execute(
        """
        UPDATE dbo.plans
        SET name = ?,
            description = ?,
            monthly_price = ?,
            annual_price = ?,
            currency = ?,
            is_popular = ?,
            is_active = ?,
            color = ?,
            icon_name = ?,
            updated_at = SYSUTCDATETIME()
        WHERE plan_id = ?
        """,
        (
            payload.name.strip(),
            payload.description.strip(),
            payload.monthlyPrice,
            payload.annualPrice,
            payload.currency.strip(),
            1 if payload.isPopular else 0,
            1 if payload.isActive else 0,
            payload.color.strip(),
            payload.iconName,
            plan_id,
        ),
    )

    _upsert_plan_feature_rows(cursor, plan_id, payload, features)

    plans = get_subscription_plans(cursor)
    for plan in plans:
        if plan.id == str(plan_id):
            return plan

    raise HTTPException(status_code=500, detail="Plan updated but could not be loaded.")


def delete_subscription_plan(cursor: pyodbc.Cursor, plan_id: int) -> None:
    existing = cursor.execute(
        "SELECT 1 FROM dbo.plans WHERE plan_id = ?",
        (plan_id,),
    ).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Subscription plan not found.")

    cursor.execute("DELETE FROM dbo.plans WHERE plan_id = ?", (plan_id,))
