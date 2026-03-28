from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.modules.auth.utils.auth_utils import get_current_user
from app.core.database import get_db
from app.modules.organization.schemas.source_schema import (
    SourceConnectRequest,
    CustomSourceConnectRequest,
    SourceDisconnectRequest,
)

router = APIRouter(prefix="/api", tags=["sources"])

DEFAULT_SETUP_SOURCES = [
    {"name": "Google Reviews", "icon": "G"},
    {"name": "Booking.com", "icon": "B"},
    {"name": "Trip Advisor", "icon": "T"},
]


def _ensure_sources_table(db: Session):
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
                    created_at DATETIME NOT NULL DEFAULT GETDATE(),
                    updated_at DATETIME NOT NULL DEFAULT GETDATE()
                )
            END
            """
        )
    )


def _resolve_org_id(db: Session, user_id, organization_id: str | None):
    if organization_id:
        membership = db.execute(
            text(
                """
                SELECT 1
                FROM dbo.user_organizations
                WHERE user_id = :user_id AND organization_id = :organization_id
                """
            ),
            {"user_id": user_id, "organization_id": organization_id},
        ).fetchone()

        if not membership:
            raise HTTPException(status_code=403, detail="You are not a member of this organization")

        return organization_id

    fallback_org = db.execute(
        text(
            """
            SELECT TOP 1 organization_id
            FROM dbo.user_organizations
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

    _ensure_sources_table(db)
    resolved_org_id = _resolve_org_id(db, user_id, organization_id)

    rows = db.execute(
        text(
            """
            SELECT source_id, source_name, source_url, is_active
            FROM dbo.organization_review_sources
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

    _ensure_sources_table(db)
    resolved_org_id = _resolve_org_id(db, user_id, payload.organization_id)

    existing = db.execute(
        text(
            """
            SELECT TOP 1 source_id, is_active
            FROM dbo.organization_review_sources
            WHERE organization_id = :organization_id
              AND LOWER(source_name) = LOWER(:source_name)
              AND LOWER(ISNULL(source_url, '')) = LOWER(ISNULL(:source_url, ''))
            """
        ),
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
        db.execute(
            text(
                """
                UPDATE dbo.organization_review_sources
                SET is_active = 1,
                    updated_at = GETDATE(),
                    source_url = :source_url
                WHERE source_id = :source_id
                """
            ),
            {"source_id": str(existing[0]), "source_url": payload.source_url},
        )
        db.commit()
        return {
            "message": "Source connected successfully",
            "source_id": str(existing[0]),
            "organization_id": resolved_org_id,
        }

    inserted = db.execute(
        text(
            """
            INSERT INTO dbo.organization_review_sources (
                source_id,
                organization_id,
                source_name,
                source_url,
                is_active,
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
                GETDATE(),
                GETDATE()
            )
            """
        ),
        {
            "organization_id": resolved_org_id,
            "source_name": payload.source_name.strip(),
            "source_url": payload.source_url,
        },
    ).fetchone()

    db.commit()

    return {
        "message": "Source connected successfully",
        "source_id": str(inserted[0]),
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
        ),
        db=db,
        user=user,
    )


@router.post("/setup/sources/disconnect")
def disconnect_setup_source(
    payload: SourceDisconnectRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    user_id = user.user_id

    _ensure_sources_table(db)
    resolved_org_id = _resolve_org_id(db, user_id, payload.organization_id)

    existing = db.execute(
        text(
            """
            SELECT TOP 1 source_id, is_active
            FROM dbo.organization_review_sources
            WHERE organization_id = :organization_id
              AND LOWER(source_name) = LOWER(:source_name)
              AND LOWER(ISNULL(source_url, '')) = LOWER(ISNULL(:source_url, ''))
            """
        ),
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

    db.execute(
        text(
            """
            UPDATE dbo.organization_review_sources
            SET is_active = 0,
                updated_at = GETDATE()
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
