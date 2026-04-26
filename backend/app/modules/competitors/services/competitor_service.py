"""
Competitor service — organization-based CRUD business logic.

The dbo.Competitors table is a pure junction/linking table:
    id | tracking_organization_id | competitor_organization_id | isTracked | createdAt

All display data (name, location, sources, review stats) comes from
dbo.organization and dbo.processed_review via SQL JOINs.

When a competitor is added:
1. Look up dbo.source by source_url to find an existing organization.
2. If found   → link the competitor to that organization_id directly.
3. If not found → auto-create an ownerless organization + source row,
                  then trigger scraping via the normal org pipeline.
"""

from __future__ import annotations

import uuid
from typing import Dict, List, Optional

import pyodbc

from app.core.pyodbc_connection import get_connection_string
from app.core.geo_utils import parse_google_maps_url

# ── Helpers ──────────────────────────────────────────────────────────


def _row_to_competitor(r) -> Dict:
    return {
        "id": str(r.id),
        "name": r.name or "",
        "location_url": r.location_url or "",
        "latitude": r.latitude,
        "longitude": r.longitude,
        "organization_id": (
            str(r.competitor_organization_id) if r.competitor_organization_id else None
        ),
        "tracking_organization_id": (
            str(r.tracking_organization_id) if r.tracking_organization_id else None
        ),
        "avgRating": round(r.avgRating or 0, 2),
        "sentimentScore": round(r.sentimentScore or 0, 1),
        "reviewCount": r.reviewCount or 0,
        "isTracked": bool(r.isTracked),
        "createdAt": r.createdAt.isoformat() if r.createdAt else None,
    }


_BASE_SELECT = """
    SELECT c.id,
           o.organization_name as name,
           o.location_url,
           o.latitude,
           o.longitude,
           c.competitor_organization_id,
           c.tracking_organization_id,
           c.isTracked,
           c.createdAt,
           COUNT(pr.id) as reviewCount,
           AVG(CAST(pr.rating AS FLOAT)) as avgRating,
           AVG(CAST(
               CASE
                   WHEN LOWER(pr.sentiment) = 'positive' THEN 100.0
                   WHEN LOWER(pr.sentiment) = 'neutral' THEN 50.0
                   ELSE 0.0
               END AS FLOAT
           )) as sentimentScore
    FROM dbo.Competitors c
    JOIN dbo.organization o ON o.organization_id = c.competitor_organization_id
    LEFT JOIN dbo.source s ON s.organization_id = c.competitor_organization_id
    LEFT JOIN dbo.processed_review pr ON pr.source_id = s.source_id
"""

_BASE_GROUP_BY = """
    GROUP BY c.id, o.organization_name, o.location_url, o.latitude, o.longitude,
             c.competitor_organization_id, c.tracking_organization_id,
             c.isTracked, c.createdAt
"""


# ── Core read operations ─────────────────────────────────────────────


def get_all_competitors(tracking_organization_id: str) -> List[Dict]:
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        rows = cursor.execute(
            _BASE_SELECT
            + " WHERE c.tracking_organization_id = ? "
            + _BASE_GROUP_BY
            + " ORDER BY c.isTracked DESC, o.organization_name ASC",
            tracking_organization_id,
        ).fetchall()
    return [_row_to_competitor(r) for r in rows]


def get_tracked_competitors(tracking_organization_id: str) -> List[Dict]:
    return [c for c in get_all_competitors(tracking_organization_id) if c["isTracked"]]


def get_available_competitors(tracking_organization_id: str) -> List[Dict]:
    return [
        c for c in get_all_competitors(tracking_organization_id) if not c["isTracked"]
    ]


def get_competitor_by_id(competitor_id: str) -> Optional[Dict]:
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        row = cursor.execute(
            _BASE_SELECT + " WHERE c.id = ? " + _BASE_GROUP_BY,
            competitor_id,
        ).fetchone()
    return _row_to_competitor(row) if row else None


# ── Smart competitor registration ────────────────────────────────────


def register_competitor_from_organization(
    organization_id: str, tracking_organization_id: str
) -> Optional[Dict]:
    """Create a tracked Competitors row pointing at an already-existing organization.

    Used when the user adds a competitor from the suggestions list — the org
    (and its sources/reviews) already exist, so we just need to track it.
    """
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()

        org = cursor.execute(
            """
            SELECT organization_id, organization_name, location_url, latitude, longitude, organization_type_id
            FROM dbo.organization
            WHERE organization_id = ?
            """,
            organization_id,
        ).fetchone()
        if not org:
            return None

        existing = cursor.execute(
            "SELECT id FROM dbo.Competitors WHERE competitor_organization_id = ? AND tracking_organization_id = ?",
            org.organization_id,
            tracking_organization_id,
        ).fetchone()

        if existing:
            cursor.execute(
                "UPDATE dbo.Competitors SET isTracked = 1 WHERE id = ?", existing.id
            )
            conn.commit()
            return get_competitor_by_id(str(existing.id))

        new_id = uuid.uuid4()
        cursor.execute(
            """
            INSERT INTO dbo.Competitors
                (id, competitor_organization_id, tracking_organization_id, isTracked, createdAt)
            VALUES (?, ?, ?, 1, GETDATE())
            """,
            new_id,
            org.organization_id,
            tracking_organization_id,
        )
        conn.commit()

    return get_competitor_by_id(str(new_id))


def register_competitor(
    name: str,
    organization_type_id: int,
    location_url: str,
    sources: List[Dict],
    tracking_organization_id: str,
) -> Dict:
    """
    Register a competitor by creating (or reusing) an ownerless organization.

    If any provided source_url already exists in dbo.source, we reuse that
    org_id and add any additional URLs for platforms that org doesn't already
    have. Otherwise we create a new tenant_id=NULL organization with the
    supplied location + type + sources.

    Source rows are inserted as status='active' with next_synced_at=now so the
    normal scheduler picks them up on its next tick — same pipeline as owned
    organizations.
    """
    location_url = (location_url or "").strip()

    lat = None
    lng = None
    if location_url:
        coords = parse_google_maps_url(location_url)
        if coords:
            lat, lng = coords
    cleaned = [
        {
            "platform_id": int(s["platform_id"]),
            "source_url": s["source_url"].strip().rstrip("/"),
        }
        for s in sources
        if s.get("source_url") and s.get("source_url").strip()
    ]
    if not cleaned:
        raise ValueError("At least one source URL is required.")

    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()

        org_id = None
        for s in cleaned:
            row = cursor.execute(
                """
                SELECT TOP 1 organization_id
                FROM dbo.source
                WHERE LOWER(RTRIM(LTRIM(source_url))) = LOWER(?) AND platform_id = ?
                """,
                s["source_url"],
                s["platform_id"],
            ).fetchone()
            if row:
                org_id = row.organization_id
                print(
                    f"[Competitor] Reusing existing org {org_id} (matched {s['platform_id']} URL)"
                )
                break

        if org_id is None:
            org_id = uuid.uuid4()
            cursor.execute(
                """
                INSERT INTO dbo.organization
                    (organization_id, organization_name, tenant_id, organization_type_id,
                     location_url, latitude, longitude, created_at, updated_at)
                VALUES (?, ?, NULL, ?, ?, ?, ?, GETDATE(), GETDATE())
                """,
                org_id,
                name,
                organization_type_id,
                location_url,
                lat,
                lng,
            )
            print(f"[Competitor] Created ownerless org {org_id} ({location_url})")
        else:
            # Backfill location/type on existing ownerless competitor orgs if missing
            cursor.execute(
                """
                UPDATE dbo.organization
                SET organization_name = COALESCE(NULLIF(organization_name, ''), ?),
                    organization_type_id = COALESCE(organization_type_id, ?),
                    location_url = COALESCE(NULLIF(location_url, ''), ?),
                    latitude = COALESCE(latitude, ?),
                    longitude = COALESCE(longitude, ?),
                    updated_at = GETDATE()
                WHERE organization_id = ? AND tenant_id IS NULL
                """,
                name,
                organization_type_id,
                location_url,
                lat,
                lng,
                org_id,
            )

        # Add any missing (platform_id, source_url) rows for this org.
        for s in cleaned:
            exists = cursor.execute(
                "SELECT 1 FROM dbo.source WHERE organization_id = ? AND platform_id = ?",
                org_id,
                s["platform_id"],
            ).fetchone()
            if exists:
                continue
            cursor.execute(
                """
                INSERT INTO dbo.source
                    (source_id, organization_id, platform_id, source_url,
                     source_status, fetching_frequency, next_synced_at, created_at,
                     num_of_syncs, success_sync_count, success_rate)
                VALUES (?, ?, ?, ?, 'active', 1, GETDATE(), GETDATE(), 0, 0, 0.0)
                """,
                uuid.uuid4(),
                org_id,
                s["platform_id"],
                s["source_url"],
            )

        # Ensure a Competitors row exists for this org and is tracked.
        existing = cursor.execute(
            "SELECT id FROM dbo.Competitors WHERE competitor_organization_id = ? AND tracking_organization_id = ?",
            org_id,
            tracking_organization_id,
        ).fetchone()

        if existing:
            cursor.execute(
                "UPDATE dbo.Competitors SET isTracked = 1 WHERE id = ?", existing.id
            )
            conn.commit()
            return get_competitor_by_id(str(existing.id))

        new_id = uuid.uuid4()
        cursor.execute(
            """
            INSERT INTO dbo.Competitors
                (id, competitor_organization_id, tracking_organization_id, isTracked, createdAt)
            VALUES (?, ?, ?, 1, GETDATE())
            """,
            new_id,
            org_id,
            tracking_organization_id,
        )
        conn.commit()

    return get_competitor_by_id(str(new_id))


# ── Update / Delete ──────────────────────────────────────────────────


def track_competitor(
    competitor_id: str, tracking_organization_id: str, user_id: str | None = None
) -> Optional[Dict]:
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE dbo.Competitors SET isTracked = 1 WHERE id = ? AND tracking_organization_id = ?",
            competitor_id,
            tracking_organization_id,
        )
        conn.commit()
    return get_competitor_by_id(competitor_id)


def untrack_competitor(competitor_id: str, tracking_organization_id: str) -> bool:
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE dbo.Competitors SET isTracked = 0 WHERE id = ? AND tracking_organization_id = ?",
            competitor_id,
            tracking_organization_id,
        )
        conn.commit()
    return True


def delete_competitor(competitor_id: str, tracking_organization_id: str) -> bool:
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM dbo.Competitors WHERE id = ? AND tracking_organization_id = ?",
            competitor_id,
            tracking_organization_id,
        )
        conn.commit()
    return True


def edit_competitor(
    competitor_id: str, tracking_organization_id: str, name: str, location_url: str
) -> Optional[Dict]:
    """Edit a competitor's organization details (name, location)."""
    competitor = get_competitor_by_id(competitor_id)
    if (
        not competitor
        or competitor.get("tracking_organization_id") != tracking_organization_id
    ):
        return None

    org_id = competitor["organization_id"]
    lat = None
    lng = None
    if location_url:
        coords = parse_google_maps_url(location_url)
        if coords:
            lat, lng = coords

    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE dbo.organization
            SET organization_name = ?, location_url = ?, latitude = ?, longitude = ?, updated_at = GETDATE()
            WHERE organization_id = ?
            """,
            name,
            location_url,
            lat,
            lng,
            org_id,
        )
        conn.commit()
    return get_competitor_by_id(competitor_id)


def get_competitor_reviews(competitor_id: str) -> List[Dict]:
    """Get processed reviews for a competitor via their organization_id."""
    competitor = get_competitor_by_id(competitor_id)
    if not competitor or not competitor.get("organization_id"):
        return []

    org_id = competitor["organization_id"]
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        rows = cursor.execute(
            """
            SELECT pr.id, s.organization_id, pr.rating, pr.reviewerName, pr.text,
                   pr.summary, pr.sentiment, pr.categories, pr.keyPhrases, pr.language, pr.reviewDate
            FROM dbo.processed_review pr
            JOIN dbo.source s ON s.source_id = pr.source_id
            WHERE s.organization_id = ?
            ORDER BY pr.reviewDate DESC
        """,
            org_id,
        ).fetchall()

    import json as _json

    results = []
    for r in rows:
        try:
            cat_list = _json.loads(r.categories) if r.categories else []
        except Exception:
            cat_list = []
        try:
            phrase_list = _json.loads(r.keyPhrases) if r.keyPhrases else []
        except Exception:
            phrase_list = []

        results.append(
            {
                "id": str(r.id),
                "competitorId": competitor_id,
                "rating": r.rating or 0,
                "userName": r.reviewerName or "Anonymous",
                "reviewText": r.text or "",
                "summary": r.summary or "",
                "sentiment": r.sentiment or "Neutral",
                "categories": cat_list,
                "keyPhrases": phrase_list,
                "language": r.language or "English",
                "reviewDate": r.reviewDate.isoformat() if r.reviewDate else None,
                "source": "Booking.com",
            }
        )
    return results
