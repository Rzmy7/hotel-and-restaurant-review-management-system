"""Subscription plan data service for admin management APIs."""

from datetime import datetime
from decimal import Decimal

import pyodbc
from fastapi import HTTPException

from app.modules.admin.schemas import (
    SubscriptionFeature,
    SubscriptionFeatureUsage,
    SubscriptionPlan,
    SubscriptionPlanFeatureState,
    SubscriptionUsageSummary,
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
 
DEFAULT_PLANS: list[dict[str, object]] = [
    {
        "id": 1,
        "name": "Free",
        "description": "Free plan for new users to explore the platform with basic features.",
        "monthlyPrice": 0.0,
        "annualPrice": 0.0,
        "currency": "USD",
        "isPopular": False,
        "isActive": True,
        "color": "from-blue-500 to-blue-600",
        "iconName": "star",
        "limits": {
            "organizations": 2,
            "groups": 1,
            "scraping_frequency": 0,
            "reply_generations": 10,
            "review_count": 100,
            "competitors": 2,
        }
    }
]


def _to_float(value: Decimal | float | int | None) -> float:
    if value is None:
        return 0.0
    return float(value)


def get_user_plan_map(cursor: pyodbc.Cursor) -> dict[str, str]:
    """Returns a mapping of tenant_id to plan_name from the tenant table."""
    from app.core.db_utils import execute_query, table_exists
    
    if not table_exists(cursor, "tenant") or not table_exists(cursor, "plans"):
        return {}

    rows = execute_query(
        cursor,
        """
        SELECT
            CAST(t.tenant_id AS NVARCHAR(64)) AS tenant_id,
            p.name AS plan_name
        FROM dbo.tenant t
        INNER JOIN dbo.plans p ON p.plan_id = TRY_CAST(t.[plan] AS INT)
        WHERE t.[plan] IS NOT NULL
        """,
    ).fetchall()

    result: dict[str, str] = {}
    for row in rows:
        tenant_id = str(row[0] or "").strip()
        plan_name = str(row[1] or "").strip()
        if not tenant_id or not plan_name:
            continue
        result[tenant_id] = plan_name
    return result


def set_user_subscription_plan(cursor: pyodbc.Cursor, user_id: str, plan_name: str) -> None:
    """Sets or updates a user's subscription plan by name."""
    from app.core.db_utils import execute_query, table_exists
    
    normalized_plan_name = plan_name.strip()
    if normalized_plan_name.lower() == "basic":
        normalized_plan_name = "Free"

    if not normalized_plan_name:
        return
    if not table_exists(cursor, "tenant") or not table_exists(cursor, "plans"):
        return

    plan_row = execute_query(
        cursor,
        "SELECT TOP 1 plan_id FROM dbo.plans WHERE name = ?",
        (normalized_plan_name,),
    ).fetchone()
    if plan_row is None or plan_row[0] is None:
        return

    plan_id = int(plan_row[0])
    
    # Update the tenant table directly
    execute_query(
        cursor,
        "UPDATE dbo.tenant SET [plan] = ? WHERE tenant_id = ?",
        (plan_id, user_id),
    )

    # Initialize usage rows for all features if they don't exist
    initialize_user_usage(cursor, user_id)


def initialize_user_usage(cursor: pyodbc.Cursor, user_id: str) -> None:
    """Ensures usage rows exist in user_feature_usage for all defined features."""
    features = get_subscription_features(cursor)
    for feature in features:
        cursor.execute(
            """
            IF NOT EXISTS (SELECT 1 FROM dbo.user_feature_usage WHERE user_id = ? AND feature_id = ?)
            BEGIN
                INSERT INTO dbo.user_feature_usage (user_id, feature_id, used_quantity, updated_at)
                VALUES (?, ?, 0, SYSUTCDATETIME())
            END
            """,
            (user_id, int(feature.id), user_id, int(feature.id)),
        )


def increment_feature_usage(cursor: pyodbc.Cursor, user_id: str, feature_key: str, amount: int = 1) -> None:
    """Increments the used count for a specific feature for a user."""
    # Try updating existing row
    cursor.execute(
        """
        UPDATE ufu
        SET ufu.used_quantity = ufu.used_quantity + ?,
            ufu.updated_at = SYSUTCDATETIME()
        FROM dbo.user_feature_usage ufu
        INNER JOIN dbo.features f ON f.feature_id = ufu.feature_id
        WHERE ufu.user_id = ? AND f.feature_key = ?
        """,
        (amount, user_id, feature_key),
    )
    
    # If no rows updated, it might be the first usage or the row was missing
    if cursor.rowcount == 0:
        # Get feature ID
        feat_row = cursor.execute("SELECT feature_id FROM dbo.features WHERE feature_key = ?", (feature_key,)).fetchone()
        if feat_row:
            cursor.execute(
                """
                INSERT INTO dbo.user_feature_usage (user_id, feature_id, used_quantity, updated_at)
                VALUES (?, ?, ?, SYSUTCDATETIME())
                """,
                (user_id, int(feat_row[0]), amount),
            )


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

        IF OBJECT_ID('dbo.user_feature_usage', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.user_feature_usage (
                user_feature_usage_id INT IDENTITY(1,1) NOT NULL
                    CONSTRAINT PK_user_feature_usage PRIMARY KEY,
                user_id NVARCHAR(64) NOT NULL,
                feature_id INT NOT NULL,
                used_quantity INT NOT NULL
                    CONSTRAINT DF_user_feature_usage_used_quantity DEFAULT 0,
                period_start DATE NULL,
                period_end DATE NULL,
                created_at DATETIME2(7) NOT NULL
                    CONSTRAINT DF_user_feature_usage_created_at DEFAULT SYSUTCDATETIME(),
                updated_at DATETIME2(7) NOT NULL
                    CONSTRAINT DF_user_feature_usage_updated_at DEFAULT SYSUTCDATETIME(),
                CONSTRAINT FK_user_feature_usage_feature
                    FOREIGN KEY (feature_id) REFERENCES dbo.features(feature_id) ON DELETE CASCADE,
                CONSTRAINT UQ_user_feature_usage_user_feature UNIQUE (user_id, feature_id)
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
 
 
def seed_default_plans(cursor: pyodbc.Cursor) -> None:
    """Ensures at least the default 'Free' plan exists in the plans table."""
    seed_default_features(cursor)
    
    for plan in DEFAULT_PLANS:
        plan_id = int(plan["id"])
        
        # Check if plan exists
        row = cursor.execute("SELECT 1 FROM dbo.plans WHERE plan_id = ?", (plan_id,)).fetchone()
        if not row:
            # We use SET IDENTITY_INSERT if we want exactly ID 1
            cursor.execute("SET IDENTITY_INSERT dbo.plans ON")
            cursor.execute(
                """
                INSERT INTO dbo.plans (plan_id, name, description, monthly_price, annual_price, currency, is_popular, is_active, color, icon_name)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    plan_id,
                    plan["name"],
                    plan["description"],
                    plan["monthlyPrice"],
                    plan["annualPrice"],
                    plan["currency"],
                    1 if plan["isPopular"] else 0,
                    1 if plan["isActive"] else 0,
                    plan["color"],
                    plan["iconName"],
                )
            )
            cursor.execute("SET IDENTITY_INSERT dbo.plans OFF")
            
            # Link default features
            for feat_key, limit in plan["limits"].items():
                cursor.execute(
                    """
                    INSERT INTO dbo.plan_feature (plan_id, feature_id, is_enabled, feature_limit)
                    SELECT ?, feature_id, 1, ?
                    FROM dbo.features
                    WHERE feature_key = ?
                    """,
                    (plan_id, limit, feat_key)
                )
 
 
def seed_subscription_data() -> None:
    """Convenience function to seed plans and features on startup."""
    from app.core.db_utils import get_connection_string
    import pyodbc
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            seed_default_plans(cursor)
            conn.commit()
            print("Subscription data seeding complete.")
    except Exception as e:
        print(f"FAILED TO SEED SUBSCRIPTION DATA: {e}")


def get_subscription_features(cursor: pyodbc.Cursor) -> list[SubscriptionFeature]:
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


def get_user_subscription_usage(cursor: pyodbc.Cursor, user_id: str) -> SubscriptionUsageSummary:
    """Returns the usage summary for a user based on the tenant table's plan."""
    features = get_subscription_features(cursor)

    plan_row = cursor.execute(
        """
        SELECT TOP 1 p.plan_id, p.name
        FROM dbo.tenant t
        INNER JOIN dbo.plans p ON p.plan_id = TRY_CAST(t.[plan] AS INT)
        WHERE (t.tenant_id = ? OR CAST(t.tenant_id AS NVARCHAR(36)) = ?) AND t.[plan] IS NOT NULL
        """,
        (user_id, user_id),
    ).fetchone()

    if not plan_row:
        return SubscriptionUsageSummary(userId=user_id, features=[])

    plan_id = int(plan_row[0])
    plan_name = str(plan_row[1]) if plan_row[1] else None

    rows = cursor.execute(
        """
        SELECT
            f.feature_id,
            f.feature_key,
            f.display_name,
            COALESCE(pf.is_enabled, 0) AS is_enabled,
            pf.feature_limit,
            COALESCE(ufu.used_quantity, 0) AS used_quantity
        FROM dbo.features f
        LEFT JOIN dbo.plan_feature pf
            ON pf.feature_id = f.feature_id
           AND pf.plan_id = ?
        LEFT JOIN dbo.user_feature_usage ufu
            ON ufu.feature_id = f.feature_id
           AND ufu.user_id = ?
        ORDER BY f.sort_order, f.feature_id
        """,
        (plan_id, user_id),
    ).fetchall()

    feature_usages: list[SubscriptionFeatureUsage] = []
    for row in rows:
        feature_id = str(row[0])
        feature_key = str(row[1])
        feature_name = str(row[2])
        is_enabled = bool(row[3])
        feature_limit = int(row[4]) if row[4] is not None else None
        used_quantity = int(row[5]) if row[5] is not None else 0
        balance = None if feature_limit is None else max(feature_limit - used_quantity, 0)

        feature_usages.append(
            SubscriptionFeatureUsage(
                id=feature_id,
                key=feature_key,
                name=feature_name,
                enabled=is_enabled,
                used=used_quantity,
                limit=feature_limit,
                balance=balance,
            )
        )

    # Keep only enabled features for customer-facing usage/balance display.
    enabled_feature_usages = [feature for feature in feature_usages if feature.enabled]

    return SubscriptionUsageSummary(
        userId=user_id,
        planId=str(plan_id),
        planName=plan_name,
        features=enabled_feature_usages,
    )
