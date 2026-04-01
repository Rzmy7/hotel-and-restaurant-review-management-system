from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
import uuid

from app.modules.auth.utils.auth_utils import get_current_user
from app.core.database import get_db
from app.modules.organization.schemas.source_schema import (
    SourceConnectRequest,
    CustomSourceConnectRequest,
    SourceDisconnectRequest,
    FinalizeSetupScheduleRequest,
)

router = APIRouter(prefix="/api", tags=["sources"])

DEFAULT_SETUP_SOURCES = [
    {"name": "Google Reviews", "icon": "G"},
    {"name": "Booking.com", "icon": "B"},
    {"name": "Trip Advisor", "icon": "T"},
]


def _is_sqlite(db: Session) -> bool:
    return db.bind is not None and db.bind.dialect.name == "sqlite"


def _now_sql(db: Session) -> str:
    return "CURRENT_TIMESTAMP" if _is_sqlite(db) else "GETDATE()"


def _tbl(db: Session, table_name: str) -> str:
    return table_name if _is_sqlite(db) else f"dbo.{table_name}"


def _ensure_sources_table(db: Session):
    if _is_sqlite(db):
        db.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS organization_review_sources (
                    source_id TEXT NOT NULL PRIMARY KEY,
                    organization_id TEXT NOT NULL,
                    source_name TEXT NOT NULL,
                    source_url TEXT NULL,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    fetching_frequency TEXT NOT NULL DEFAULT 'daily',
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )

        pragma_rows = db.execute(text("PRAGMA table_info(organization_review_sources)")).fetchall()
        existing_columns = {str(row[1]).lower() for row in pragma_rows}
        if "fetching_frequency" not in existing_columns:
            db.execute(
                text(
                    """
                    ALTER TABLE organization_review_sources
                    ADD COLUMN fetching_frequency TEXT NOT NULL DEFAULT 'daily'
                    """
                )
            )
        return

    db.execute(
        text(
            """
            IF OBJECT_ID('dbo.organization_review_sources', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.organization_review_sources (
                    source_id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
                    organization_id UNIQUEIDENTIFIER NOT NULL,
                    source_name NVARCHAR(100) NOT NULL,
                    source_url NVARCHAR(1000) NULL,
                    is_active BIT NOT NULL DEFAULT 1,
                    fetching_frequency NVARCHAR(20) NOT NULL DEFAULT 'daily',
                    created_at DATETIME NOT NULL DEFAULT GETDATE(),
                    updated_at DATETIME NOT NULL DEFAULT GETDATE()
                )
            END
            """
        )
    )

    db.execute(
        text(
            """
            IF COL_LENGTH('dbo.organization_review_sources', 'fetching_frequency') IS NULL
            BEGIN
                ALTER TABLE dbo.organization_review_sources
                ADD fetching_frequency NVARCHAR(20) NOT NULL
                    CONSTRAINT DF_org_review_sources_fetching_frequency DEFAULT 'daily'
            END
            """
        )
    )

    db.execute(
        text(
            """
            IF COL_LENGTH('dbo.organization_review_sources', 'fetching_frequency') IS NOT NULL
               AND NOT EXISTS (
                    SELECT 1
                    FROM sys.check_constraints
                    WHERE name = 'ck_org_review_sources_fetching_frequency'
                      AND parent_object_id = OBJECT_ID('dbo.organization_review_sources')
               )
            BEGIN
                ALTER TABLE dbo.organization_review_sources
                ADD CONSTRAINT ck_org_review_sources_fetching_frequency
                CHECK (fetching_frequency IN ('hourly', 'daily', 'weekly'))
            END
            """
        )
    )


def _resolve_org_id(db: Session, user_id, organization_id: str | None):
    user_org_table = _tbl(db, "user_organizations")

    if organization_id:
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

        return organization_id

    if _is_sqlite(db):
        fallback_org = db.execute(
            text(
                f"""
                SELECT organization_id
                FROM {user_org_table}
                WHERE user_id = :user_id
                LIMIT 1
                """
            ),
            {"user_id": user_id},
        ).fetchone()
    else:
        fallback_org = db.execute(
            text(
                f"""
                SELECT TOP 1 organization_id
                FROM {user_org_table}
                WHERE user_id = :user_id
                """
            ),
            {"user_id": user_id},
        ).fetchone()

    if not fallback_org:
        raise HTTPException(status_code=400, detail="No organization found for this user")

    return str(fallback_org[0])


@router.get("/setup/sources")
def get_setup_sources(
    organization_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    user_id = user.user_id
    sources_table = _tbl(db, "organization_review_sources")

    _ensure_sources_table(db)
    resolved_org_id = _resolve_org_id(db, user_id, organization_id)

    rows = db.execute(
        text(
            f"""
            SELECT source_id, source_name, source_url, is_active, fetching_frequency
            FROM {sources_table}
            WHERE organization_id = :organization_id
            """
        ),
        {"organization_id": resolved_org_id},
    ).fetchall()

    active_by_name = {str(row[1]).lower(): bool(row[3]) for row in rows if row[3]}

    setup_sources = [
        {
            "name": source["name"],
            "icon": source["icon"],
            "connected": active_by_name.get(source["name"].lower(), False),
        }
        for source in DEFAULT_SETUP_SOURCES
    ]

    connected_sources = [
        {
            "source_id": str(row[0]),
            "source_name": row[1],
            "source_url": row[2],
            "connected": bool(row[3]),
            "fetching_frequency": row[4],
        }
        for row in rows
        if row[3]
    ]

    return {
        "organization_id": resolved_org_id,
        "sources": setup_sources,
        "connected_sources": connected_sources,
    }


@router.post("/setup/sources/connect")
def connect_setup_source(
    payload: SourceConnectRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    user_id = user.user_id
    sources_table = _tbl(db, "organization_review_sources")

    _ensure_sources_table(db)
    resolved_org_id = _resolve_org_id(db, user_id, payload.organization_id)

    existing_query = (
        f"""
        SELECT source_id, is_active
        FROM {sources_table}
        WHERE organization_id = :organization_id
          AND LOWER(source_name) = LOWER(:source_name)
          AND LOWER(COALESCE(source_url, '')) = LOWER(COALESCE(:source_url, ''))
        LIMIT 1
        """
        if _is_sqlite(db)
        else f"""
        SELECT TOP 1 source_id, is_active
        FROM {sources_table}
        WHERE organization_id = :organization_id
          AND LOWER(source_name) = LOWER(:source_name)
          AND LOWER(COALESCE(source_url, '')) = LOWER(COALESCE(:source_url, ''))
        """
    )

    existing = db.execute(
        text(existing_query),
        {
            "organization_id": resolved_org_id,
            "source_name": payload.source_name.strip(),
            "source_url": payload.source_url,
        },
    ).fetchone()

    if existing and bool(existing[1]):
        return {
            "message": "Source already connected",
            "source_id": str(existing[0]),
            "organization_id": resolved_org_id,
        }

    if existing and not bool(existing[1]):
        now_sql = _now_sql(db)
        db.execute(
            text(
                f"""
                UPDATE {sources_table}
                SET is_active = 1,
                    updated_at = {now_sql},
                    source_url = :source_url,
                    fetching_frequency = :fetching_frequency
                WHERE source_id = :source_id
                """
            ),
            {
                "source_id": str(existing[0]),
                "source_url": payload.source_url,
                "fetching_frequency": payload.fetching_frequency.value,
            },
        )
        db.commit()
        return {
            "message": "Source connected successfully",
            "source_id": str(existing[0]),
            "organization_id": resolved_org_id,
        }

    if _is_sqlite(db):
        inserted_source_id = str(uuid.uuid4())
        db.execute(
            text(
                """
                INSERT INTO organization_review_sources (
                    source_id,
                    organization_id,
                    source_name,
                    source_url,
                    is_active,
                    fetching_frequency,
                    created_at,
                    updated_at
                )
                VALUES (
                    :source_id,
                    :organization_id,
                    :source_name,
                    :source_url,
                    1,
                    :fetching_frequency,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "source_id": inserted_source_id,
                "organization_id": resolved_org_id,
                "source_name": payload.source_name.strip(),
                "source_url": payload.source_url,
                "fetching_frequency": payload.fetching_frequency.value,
            },
        )
    else:
        inserted = db.execute(
            text(
                f"""
                INSERT INTO {sources_table} (
                    source_id,
                    organization_id,
                    source_name,
                    source_url,
                    is_active,
                    fetching_frequency,
                    created_at,
                    updated_at
                )
                OUTPUT INSERTED.source_id
                VALUES (
                    NEWID(),
                    :organization_id,
                    :source_name,
                    :source_url,
                    1,
                    :fetching_frequency,
                    GETDATE(),
                    GETDATE()
                )
                """
            ),
            {
                "organization_id": resolved_org_id,
                "source_name": payload.source_name.strip(),
                "source_url": payload.source_url,
                "fetching_frequency": payload.fetching_frequency.value,
            },
        ).fetchone()
        inserted_source_id = str(inserted[0])

    db.commit()

    return {
        "message": "Source connected successfully",
        "source_id": inserted_source_id,
        "organization_id": resolved_org_id,
    }


@router.post("/setup/sources/custom")
def connect_custom_source(
    payload: CustomSourceConnectRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return connect_setup_source(
        payload=SourceConnectRequest(
            source_name=payload.source_name or "Custom Source",
            organization_id=payload.organization_id,
            source_url=str(payload.source_url),
            fetching_frequency=payload.fetching_frequency,
        ),
        db=db,
        user=user,
    )


@router.post("/setup/schedule/finalize")
def finalize_setup_schedule(
    payload: FinalizeSetupScheduleRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    user_id = user.user_id
    sources_table = _tbl(db, "organization_review_sources")

    _ensure_sources_table(db)
    resolved_org_id = _resolve_org_id(db, user_id, payload.organization_id)

    active_count = db.execute(
        text(
            f"""
            SELECT COUNT(1)
            FROM {sources_table}
            WHERE organization_id = :organization_id AND is_active = 1
            """
        ),
        {"organization_id": resolved_org_id},
    ).scalar() or 0

    if active_count > 0:
        now_sql = _now_sql(db)
        db.execute(
            text(
                f"""
                UPDATE {sources_table}
                SET fetching_frequency = :fetching_frequency,
                    updated_at = {now_sql}
                WHERE organization_id = :organization_id
                  AND is_active = 1
                """
            ),
            {
                "organization_id": resolved_org_id,
                "fetching_frequency": payload.selected_schedule.value,
            },
        )

    db.commit()

    return {
        "message": "Setup schedule finalized successfully",
        "organization_id": resolved_org_id,
        "selected_schedule": payload.selected_schedule.value,
        "updated_count": int(active_count),
    }


@router.post("/setup/sources/disconnect")
def disconnect_setup_source(
    payload: SourceDisconnectRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    user_id = user.user_id
    sources_table = _tbl(db, "organization_review_sources")

    _ensure_sources_table(db)
    resolved_org_id = _resolve_org_id(db, user_id, payload.organization_id)

    existing_query = (
        f"""
        SELECT source_id, is_active
        FROM {sources_table}
        WHERE organization_id = :organization_id
          AND LOWER(source_name) = LOWER(:source_name)
          AND LOWER(COALESCE(source_url, '')) = LOWER(COALESCE(:source_url, ''))
        LIMIT 1
        """
        if _is_sqlite(db)
        else f"""
        SELECT TOP 1 source_id, is_active
        FROM {sources_table}
        WHERE organization_id = :organization_id
          AND LOWER(source_name) = LOWER(:source_name)
          AND LOWER(COALESCE(source_url, '')) = LOWER(COALESCE(:source_url, ''))
        """
    )

    existing = db.execute(
        text(existing_query),
        {
            "organization_id": resolved_org_id,
            "source_name": payload.source_name.strip(),
            "source_url": payload.source_url,
        },
    ).fetchone()

    if not existing:
        raise HTTPException(status_code=404, detail="Source not found")

    if not bool(existing[1]):
        return {
            "message": "Source already disconnected",
            "source_id": str(existing[0]),
            "organization_id": resolved_org_id,
        }

    now_sql = _now_sql(db)
    db.execute(
        text(
            f"""
            UPDATE {sources_table}
            SET is_active = 0,
                updated_at = {now_sql}
            WHERE source_id = :source_id
            """
        ),
        {"source_id": str(existing[0])},
    )
    db.commit()

    return {
        "message": "Source disconnected successfully",
        "source_id": str(existing[0]),
        "organization_id": resolved_org_id,
    }
