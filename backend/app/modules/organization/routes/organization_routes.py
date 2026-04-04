from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from zoneinfo import ZoneInfo

from app.core.database import get_db
from app.modules.auth.utils.auth_utils import get_current_user
from app.modules.organization.schemas.organization_schema import (
    OrganizationCreate,
    OrganizationGeneralSettingsPayload,
    OrganizationGeneralSettingsResponse,
    SetupSubscriptionFinalizeRequest,
    SetupSubscriptionFinalizeResponse,
)

router = APIRouter(prefix="/api", tags=["organization"])


UI_TO_IANA_TIMEZONE: dict[str, str] = {
    "EST (UTC-5)": "America/New_York",
    "CST (UTC-6)": "America/Chicago",
    "MST (UTC-7)": "America/Denver",
    "PST (UTC-8)": "America/Los_Angeles",
    "GMT (UTC+0)": "UTC",
}

ALLOWED_THEME_PREFERENCES = {"light", "dark", "system"}


def _is_sqlite(db: Session) -> bool:
    return db.bind is not None and db.bind.dialect.name == "sqlite"


def _now_sql(db: Session) -> str:
    return "CURRENT_TIMESTAMP" if _is_sqlite(db) else "SYSUTCDATETIME()"


def _tbl(db: Session, table_name: str) -> str:
    return table_name if _is_sqlite(db) else f"dbo.{table_name}"


def _normalize_timezone(value: str) -> str | None:
    normalized = value.strip()
    if not normalized:
        return None

    mapped = UI_TO_IANA_TIMEZONE.get(normalized)
    if mapped:
        return mapped

    if normalized.upper() in {"UTC", "GMT"}:
        return "UTC"

    if normalized in set(UI_TO_IANA_TIMEZONE.values()):
        return normalized

    try:
        ZoneInfo(normalized)
        return normalized
    except Exception:
        return None


def _ensure_org_general_settings_table(db: Session) -> None:
    settings_table = _tbl(db, "user_organization_general_settings")
    user_table = _tbl(db, "users")
    org_table = _tbl(db, "organizations_source")

    if _is_sqlite(db):
        db.execute(
            text(
                f"""
                CREATE TABLE IF NOT EXISTS {settings_table} (
                    user_id TEXT NOT NULL,
                    organization_id TEXT NOT NULL,
                    timezone TEXT NOT NULL,
                    theme_preference TEXT NOT NULL DEFAULT 'system',
                    language TEXT NOT NULL DEFAULT 'en',
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (user_id, organization_id),
                    FOREIGN KEY (user_id) REFERENCES {user_table}(user_id) ON DELETE CASCADE,
                    FOREIGN KEY (organization_id) REFERENCES {org_table}(organization_id) ON DELETE CASCADE
                )
                """
            )
        )
        pragma_rows = db.execute(text(f"PRAGMA table_info({settings_table})")).fetchall()
        existing_columns = {str(row[1]).lower() for row in pragma_rows}
        if "theme_preference" not in existing_columns:
            db.execute(text(f"ALTER TABLE {settings_table} ADD COLUMN theme_preference TEXT NOT NULL DEFAULT 'system'"))
        return

    db.execute(
        text(
            """
            IF OBJECT_ID('dbo.user_organization_general_settings', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.user_organization_general_settings (
                    user_id UNIQUEIDENTIFIER NOT NULL,
                    organization_id UNIQUEIDENTIFIER NOT NULL,
                    timezone NVARCHAR(100) NOT NULL,
                    theme_preference NVARCHAR(16) NOT NULL
                        CONSTRAINT DF_user_org_general_settings_theme DEFAULT 'system',
                    language NVARCHAR(32) NOT NULL
                        CONSTRAINT DF_user_org_general_settings_language DEFAULT 'en',
                    created_at DATETIME2(7) NOT NULL
                        CONSTRAINT DF_user_org_general_settings_created_at DEFAULT SYSUTCDATETIME(),
                    updated_at DATETIME2(7) NOT NULL
                        CONSTRAINT DF_user_org_general_settings_updated_at DEFAULT SYSUTCDATETIME(),
                    CONSTRAINT PK_user_org_general_settings
                        PRIMARY KEY (user_id, organization_id),
                    CONSTRAINT FK_user_org_general_settings_user
                        FOREIGN KEY (user_id)
                        REFERENCES dbo.users(user_id)
                        ON DELETE CASCADE,
                    CONSTRAINT FK_user_org_general_settings_org
                        FOREIGN KEY (organization_id)
                        REFERENCES dbo.organizations_source(organization_id)
                        ON DELETE CASCADE
                );
            END

            IF COL_LENGTH('dbo.user_organization_general_settings', 'theme_preference') IS NULL
            BEGIN
                ALTER TABLE dbo.user_organization_general_settings
                ADD theme_preference NVARCHAR(16) NOT NULL
                    CONSTRAINT DF_user_org_general_settings_theme DEFAULT 'system';
            END
            """
        )
    )


def _upsert_org_general_settings(
    db: Session,
    user_id: str,
    organization_id: str,
    timezone_value: str,
    theme_preference: str,
    language: str,
) -> None:
    settings_table = _tbl(db, "user_organization_general_settings")
    now_sql = _now_sql(db)

    if _is_sqlite(db):
        db.execute(
            text(
                f"""
                INSERT INTO {settings_table} (user_id, organization_id, timezone, theme_preference, language, created_at, updated_at)
                VALUES (:user_id, :organization_id, :timezone, :theme_preference, :language, {now_sql}, {now_sql})
                ON CONFLICT(user_id, organization_id) DO UPDATE SET
                    timezone = excluded.timezone,
                    theme_preference = excluded.theme_preference,
                    language = excluded.language,
                    updated_at = {now_sql}
                """
            ),
            {
                "user_id": user_id,
                "organization_id": organization_id,
                "timezone": timezone_value,
                "theme_preference": theme_preference,
                "language": language,
            },
        )
        return

    db.execute(
        text(
            f"""
            IF EXISTS (SELECT 1 FROM {settings_table} WHERE user_id = :user_id AND organization_id = :organization_id)
            BEGIN
                UPDATE {settings_table}
                SET timezone = :timezone,
                    theme_preference = :theme_preference,
                    language = :language,
                    updated_at = {now_sql}
                WHERE user_id = :user_id AND organization_id = :organization_id
            END
            ELSE
            BEGIN
                INSERT INTO {settings_table} (user_id, organization_id, timezone, theme_preference, language, created_at, updated_at)
                VALUES (:user_id, :organization_id, :timezone, :theme_preference, :language, {now_sql}, {now_sql})
            END
            """
        ),
        {
            "user_id": user_id,
            "organization_id": organization_id,
            "timezone": timezone_value,
            "theme_preference": theme_preference,
            "language": language,
        },
    )


def _ensure_user_org_subscription_columns(db: Session) -> None:
    if _is_sqlite(db):
        pragma_rows = db.execute(text("PRAGMA table_info(user_organizations)")).fetchall()
        existing_columns = {str(row[1]).lower() for row in pragma_rows}

        if "plan_id" not in existing_columns:
            db.execute(text("ALTER TABLE user_organizations ADD COLUMN plan_id INTEGER NULL"))
        if "plan_status" not in existing_columns:
            db.execute(text("ALTER TABLE user_organizations ADD COLUMN plan_status TEXT NOT NULL DEFAULT 'active'"))
        if "plan_assigned_at" not in existing_columns:
            db.execute(text("ALTER TABLE user_organizations ADD COLUMN plan_assigned_at TEXT NULL"))
        if "plan_updated_at" not in existing_columns:
            db.execute(text("ALTER TABLE user_organizations ADD COLUMN plan_updated_at TEXT NULL"))
        return

    db.execute(
        text(
            """
            IF COL_LENGTH('dbo.user_organizations', 'plan_id') IS NULL
            BEGIN
                ALTER TABLE dbo.user_organizations
                ADD plan_id INT NULL;
            END

            IF COL_LENGTH('dbo.user_organizations', 'plan_status') IS NULL
            BEGIN
                ALTER TABLE dbo.user_organizations
                ADD plan_status NVARCHAR(30) NOT NULL
                    CONSTRAINT DF_user_org_plan_status DEFAULT 'active';
            END

            IF COL_LENGTH('dbo.user_organizations', 'plan_assigned_at') IS NULL
            BEGIN
                ALTER TABLE dbo.user_organizations
                ADD plan_assigned_at DATETIME2(7) NULL;
            END

            IF COL_LENGTH('dbo.user_organizations', 'plan_updated_at') IS NULL
            BEGIN
                ALTER TABLE dbo.user_organizations
                ADD plan_updated_at DATETIME2(7) NULL;
            END

            IF NOT EXISTS (
                SELECT 1
                FROM sys.foreign_keys
                WHERE name = 'FK_user_org_plan'
                  AND parent_object_id = OBJECT_ID('dbo.user_organizations')
            )
            BEGIN
                ALTER TABLE dbo.user_organizations
                ADD CONSTRAINT FK_user_org_plan
                FOREIGN KEY (plan_id) REFERENCES dbo.plans(plan_id) ON DELETE NO ACTION;
            END
            """
        )
    )


def _resolve_org_membership(db: Session, user_id: str, organization_id: str) -> None:
    user_org_table = _tbl(db, "user_organizations")
    membership = db.execute(
        text(
            f"""
            SELECT 1
            FROM {user_org_table}
            WHERE user_id = :user_id AND organization_id = :organization_id
            """
        ),
        {"user_id": user_id, "organization_id": organization_id},
    ).fetchone()

    if not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this organization")


def _resolve_plan(db: Session, plan_id: str | None) -> tuple[int, str, bool]:
    plans_table = _tbl(db, "plans")

    if plan_id:
        try:
            normalized_plan_id = int(plan_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="plan_id must be numeric") from exc

        row = db.execute(
            text(
                f"""
                SELECT plan_id, name
                FROM {plans_table}
                WHERE plan_id = :plan_id AND is_active = 1
                """
            ),
            {"plan_id": normalized_plan_id},
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Subscription plan not found or inactive")

        return int(row[0]), str(row[1]), False

    if _is_sqlite(db):
        row = db.execute(
            text(
                f"""
                SELECT plan_id, name
                FROM {plans_table}
                WHERE is_active = 1 AND LOWER(name) = 'free'
                ORDER BY plan_id
                LIMIT 1
                """
            )
        ).fetchone()
    else:
        row = db.execute(
            text(
                f"""
                SELECT TOP 1 plan_id, name
                FROM {plans_table}
                WHERE is_active = 1 AND LOWER(name) = 'free'
                ORDER BY plan_id
                """
            ),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=500, detail="Active Free plan not found")

    return int(row[0]), str(row[1]), True


def _upsert_user_org_subscription(
    db: Session,
    user_id: str,
    organization_id: str,
    plan_id: int,
) -> None:
    table_name = _tbl(db, "user_organizations")
    now_sql = _now_sql(db)

    existing = db.execute(
        text(
            f"""
            SELECT 1
            FROM {table_name}
            WHERE user_id = :user_id AND organization_id = :organization_id
            """
        ),
        {"user_id": user_id, "organization_id": organization_id},
    ).fetchone()

    if not existing:
        raise HTTPException(status_code=404, detail="Organization membership not found")

    db.execute(
        text(
            f"""
            UPDATE {table_name}
            SET plan_id = :plan_id,
                plan_status = 'active',
                plan_assigned_at = {now_sql},
                plan_updated_at = {now_sql}
            WHERE user_id = :user_id AND organization_id = :organization_id
            """
        ),
        {
            "user_id": user_id,
            "organization_id": organization_id,
            "plan_id": plan_id,
        },
    )


@router.post("/setup/subscription/finalize", response_model=SetupSubscriptionFinalizeResponse)
def finalize_setup_subscription(
    payload: SetupSubscriptionFinalizeRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        _ensure_user_org_subscription_columns(db)

        resolved_org_id = payload.organization_id.strip()
        if not resolved_org_id:
            raise HTTPException(status_code=400, detail="organization_id is required")

        _resolve_org_membership(db, str(user.user_id), resolved_org_id)
        resolved_plan_id, resolved_plan_name, defaulted_to_free = _resolve_plan(db, payload.plan_id)

        _upsert_user_org_subscription(
            db=db,
            user_id=str(user.user_id),
            organization_id=resolved_org_id,
            plan_id=resolved_plan_id,
        )
        db.commit()

        return SetupSubscriptionFinalizeResponse(
            message="Setup subscription finalized successfully",
            user_id=str(user.user_id),
            organization_id=resolved_org_id,
            plan_id=str(resolved_plan_id),
            plan_name=resolved_plan_name,
            defaulted_to_free=defaulted_to_free,
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to finalize setup subscription: {exc}") from exc


@router.post("/organizations")
def create_organization(
    data: OrganizationCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    organization_name = data.organization_name

    # validate name
    if not organization_name or organization_name.strip() == "":
        raise HTTPException(status_code=400, detail="Organization name required")

    # get tenant_id from tenants table
    tenant_result = db.execute(
        text("""
            SELECT TOP 1 tenant_id
            FROM dbo.tenants_source
        """)
    ).fetchone()

    if not tenant_result:
        raise HTTPException(status_code=400, detail="No tenant found")

    tenant_id = tenant_result[0]

    # check if organization already exists
    existing_org = db.execute(
        text("""
            SELECT organization_id
            FROM dbo.organizations_source
            WHERE organization_name = :name
        """),
        {"name": organization_name}
    ).fetchone()

    if existing_org:
        org_id = existing_org[0]
        organization_created = False
    else:
        # insert organization
        result = db.execute(
            text("""
                INSERT INTO dbo.organizations_source 
                (organization_id, organization_name, tenant_id, created_at, updated_at)
                OUTPUT INSERTED.organization_id
                VALUES (NEWID(), :name, :tenant_id, GETDATE(), GETDATE())
            """),
            {
                "name": organization_name,
                "tenant_id": tenant_id
            }
        )

        org_id = result.fetchone()[0]
        organization_created = True

    # link user to organization
    existing_user_org = db.execute(
        text("""
            SELECT 1
            FROM dbo.user_organizations
            WHERE user_id = :user_id AND organization_id = :org_id
        """),
        {
            "user_id": user.user_id,
            "org_id": org_id
        }
    ).fetchone()

    if not existing_user_org:
        db.execute(
            text("""
                INSERT INTO dbo.user_organizations (user_id, organization_id)
                VALUES (:user_id, :org_id)
            """),
            {
                "user_id": user.user_id,
                "org_id": org_id
            }
        )
        membership_created = True
    else:
        membership_created = False

    db.commit()

    return {
        "message": "Organization created successfully",
        "organization_id": str(org_id),
        "organization_created": organization_created,
        "membership_created": membership_created,
    }

@router.delete("/organizations/{org_id}")
def delete_organization(
    org_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    # check if user is linked to org
    existing_link = db.execute(
        text("""
            SELECT 1 FROM dbo.user_organizations
            WHERE user_id = :user_id AND organization_id = :org_id
        """),
        {"user_id": user.user_id, "org_id": org_id}
    ).fetchone()

    if not existing_link:
        raise HTTPException(status_code=403, detail="Not authorized to delete this organization")

    # delete link
    db.execute(
        text("""
            DELETE FROM dbo.user_organizations
            WHERE user_id = :user_id AND organization_id = :org_id
        """),
        {"user_id": user.user_id, "org_id": org_id}
    )

    # delete sources mapping if any
    db.execute(
        text("""
            DELETE FROM dbo.sources_source
            WHERE organization_id = :org_id
        """),
        {"org_id": org_id}
    )

    # delete org
    db.execute(
        text("""
            DELETE FROM dbo.organizations_source
            WHERE organization_id = :org_id
        """),
        {"org_id": org_id}
    )

    db.commit()

    return {"message": "Organization deleted successfully"}


@router.delete("/setup/organizations/{org_id}/discard")
def discard_setup_organization(
    org_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    try:
        existing_link = db.execute(
            text(
                """
                SELECT 1
                FROM dbo.user_organizations
                WHERE user_id = :user_id AND organization_id = :org_id
                """
            ),
            {"user_id": user.user_id, "org_id": org_id}
        ).fetchone()

        if not existing_link:
            return {
                "message": "Organization membership already cleared",
                "organization_id": org_id,
                "discarded": False,
            }

        db.execute(
            text(
                """
                DELETE FROM dbo.user_organizations
                WHERE user_id = :user_id AND organization_id = :org_id
                """
            ),
            {"user_id": user.user_id, "org_id": org_id}
        )

        db.commit()

        return {
            "message": "Setup organization discarded",
            "organization_id": org_id,
            "discarded": True,
        }
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to discard setup organization")


@router.get("/organizations/{org_id}/settings/general", response_model=OrganizationGeneralSettingsResponse)
def get_organization_general_settings(
    org_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    _resolve_org_membership(db, str(user.user_id), org_id)
    _ensure_org_general_settings_table(db)

    org_table = _tbl(db, "organizations_source")
    settings_table = _tbl(db, "user_organization_general_settings")

    row = db.execute(
        text(
            f"""
            SELECT o.organization_name,
                   s.timezone,
                     s.theme_preference,
                   s.language
            FROM {org_table} o
            LEFT JOIN {settings_table} s
                ON s.organization_id = o.organization_id AND s.user_id = :user_id
            WHERE o.organization_id = :organization_id
            """
        ),
        {"organization_id": org_id, "user_id": str(user.user_id)},
    ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Organization not found")

    property_name = str(row[0] or "").strip() or "Unnamed Organization"
    timezone_value = str(row[1] or "UTC").strip() or "UTC"
    theme_preference = str(row[2] or "system").strip().lower() or "system"

    normalized_timezone = _normalize_timezone(timezone_value)
    if not normalized_timezone:
        normalized_timezone = "UTC"

    if theme_preference not in ALLOWED_THEME_PREFERENCES:
        theme_preference = "system"

    return OrganizationGeneralSettingsResponse(
        propertyName=property_name,
        timeZone=normalized_timezone,
        themePreference=theme_preference,
    )


@router.patch("/organizations/{org_id}/settings/general", response_model=OrganizationGeneralSettingsResponse)
def update_organization_general_settings(
    org_id: str,
    payload: OrganizationGeneralSettingsPayload,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    _resolve_org_membership(db, str(user.user_id), org_id)
    _ensure_org_general_settings_table(db)

    property_name = payload.propertyName.strip()
    normalized_timezone = _normalize_timezone(payload.timeZone)
    theme_preference = (payload.themePreference or "system").strip().lower() or "system"
    language = "en"

    if not normalized_timezone:
        raise HTTPException(status_code=400, detail="Invalid timezone. Use a valid IANA timezone (e.g. Asia/Colombo).")

    if theme_preference not in ALLOWED_THEME_PREFERENCES:
        raise HTTPException(status_code=400, detail="Invalid themePreference. Use one of: light, dark, system.")

    org_table = _tbl(db, "organizations_source")

    try:
        update_result = db.execute(
            text(
                f"""
                UPDATE {org_table}
                SET organization_name = :property_name
                WHERE organization_id = :organization_id
                """
            ),
            {
                "property_name": property_name,
                "organization_id": org_id,
            },
        )

        if update_result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Organization not found")

        _upsert_org_general_settings(
            db=db,
            user_id=str(user.user_id),
            organization_id=org_id,
            timezone_value=normalized_timezone,
            theme_preference=theme_preference,
            language=language,
        )

        db.commit()

        return OrganizationGeneralSettingsResponse(
            propertyName=property_name,
            timeZone=normalized_timezone,
            themePreference=theme_preference,
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update organization general settings: {exc}") from exc
