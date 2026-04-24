"""
Competitor service — organization-based CRUD business logic.

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


# ── Helpers ──────────────────────────────────────────────────────────

def _row_to_competitor(r) -> Dict:
    return {
        "id": str(r.id),
        "name": r.name,
        "location": r.location or "",
        "source_url": r.source_url or "",
        "platform_id": r.platform_id,
        "organization_id": str(r.organization_id) if r.organization_id else None,
        "avgRating": round(r.avgRating or 0, 2),
        "sentimentScore": round(r.sentimentScore or 0, 1),
        "reviewCount": r.reviewCount or 0,
        "isTracked": bool(r.isTracked),
        "status": r.status or "Pending",
        "createdAt": r.createdAt.isoformat() if r.createdAt else None,
    }


# ── Core read operations ─────────────────────────────────────────────

def get_all_competitors() -> List[Dict]:
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        rows = cursor.execute("""
            SELECT id, name, location, source_url, platform_id, organization_id,
                   avgRating, sentimentScore, reviewCount, isTracked, status, createdAt
            FROM dbo.Competitors
            ORDER BY isTracked DESC, name ASC
        """).fetchall()
    return [_row_to_competitor(r) for r in rows]


def get_tracked_competitors() -> List[Dict]:
    return [c for c in get_all_competitors() if c["isTracked"]]


def get_available_competitors() -> List[Dict]:
    return [c for c in get_all_competitors() if not c["isTracked"]]


def get_competitor_by_id(competitor_id: str) -> Optional[Dict]:
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        row = cursor.execute("""
            SELECT id, name, location, source_url, platform_id, organization_id,
                   avgRating, sentimentScore, reviewCount, isTracked, status, createdAt
            FROM dbo.Competitors WHERE id = ?
        """, competitor_id).fetchone()
    return _row_to_competitor(row) if row else None


# ── Smart competitor registration ────────────────────────────────────

def register_competitor_from_organization(organization_id: str) -> Optional[Dict]:
    """Create a tracked Competitors row pointing at an already-existing organization.

    Used when the user adds a competitor from the suggestions list — the org
    (and its sources/reviews) already exist, so we just need to track it.
    """
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()

        org = cursor.execute(
            """
            SELECT organization_id, organization_name, city, country, organization_type_id
            FROM dbo.organization
            WHERE organization_id = ?
            """,
            organization_id,
        ).fetchone()
        if not org:
            return None

        existing = cursor.execute(
            "SELECT id FROM dbo.Competitors WHERE organization_id = ?", org.organization_id
        ).fetchone()

        if existing:
            cursor.execute("UPDATE dbo.Competitors SET isTracked = 1 WHERE id = ?", existing.id)
            conn.commit()
            return get_competitor_by_id(str(existing.id))

        # Pick a primary source row for display fields (source_url + platform_id).
        source = cursor.execute(
            """
            SELECT TOP 1 source_url, platform_id
            FROM dbo.source
            WHERE organization_id = ?
            ORDER BY created_at ASC
            """,
            org.organization_id,
        ).fetchone()
        primary_url = source.source_url if source else ""
        primary_platform = source.platform_id if source else 2

        location_display = ", ".join(p for p in [org.city, org.country] if p)

        new_id = uuid.uuid4()
        cursor.execute(
            """
            INSERT INTO dbo.Competitors
                (id, name, location, source_url, platform_id, organization_id,
                 avgRating, sentimentScore, reviewCount, isTracked, status, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, 0.0, 0.0, 0, 1, 'Active', GETDATE())
            """,
            new_id, org.organization_name, location_display,
            primary_url, primary_platform, org.organization_id,
        )
        conn.commit()

    return get_competitor_by_id(str(new_id))


def register_competitor(
    name: str,
    organization_type_id: int,
    city: str,
    country: str,
    sources: List[Dict],
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
    city = (city or "").strip()
    country = (country or "").strip()
    cleaned = [
        {"platform_id": int(s["platform_id"]), "source_url": s["source_url"].strip().rstrip("/")}
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
                s["source_url"], s["platform_id"],
            ).fetchone()
            if row:
                org_id = row.organization_id
                print(f"[Competitor] Reusing existing org {org_id} (matched {s['platform_id']} URL)")
                break

        if org_id is None:
            org_id = uuid.uuid4()
            cursor.execute(
                """
                INSERT INTO dbo.organization
                    (organization_id, organization_name, tenant_id, organization_type_id,
                     city, country, created_at, updated_at)
                VALUES (?, ?, NULL, ?, ?, ?, GETDATE(), GETDATE())
                """,
                org_id, name, organization_type_id, city, country,
            )
            print(f"[Competitor] Created ownerless org {org_id} ({city}, {country})")
        else:
            # Backfill location/type on existing ownerless competitor orgs if missing
            cursor.execute(
                """
                UPDATE dbo.organization
                SET organization_name = COALESCE(NULLIF(organization_name, ''), ?),
                    organization_type_id = COALESCE(organization_type_id, ?),
                    city = COALESCE(NULLIF(city, ''), ?),
                    country = COALESCE(NULLIF(country, ''), ?),
                    updated_at = GETDATE()
                WHERE organization_id = ? AND tenant_id IS NULL
                """,
                name, organization_type_id, city, country, org_id,
            )

        # Add any missing (platform_id, source_url) rows for this org.
        for s in cleaned:
            exists = cursor.execute(
                "SELECT 1 FROM dbo.source WHERE organization_id = ? AND platform_id = ?",
                org_id, s["platform_id"],
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
                uuid.uuid4(), org_id, s["platform_id"], s["source_url"],
            )

        # Ensure a Competitors row exists for this org and is tracked.
        existing = cursor.execute(
            "SELECT id FROM dbo.Competitors WHERE organization_id = ?", org_id
        ).fetchone()

        if existing:
            cursor.execute("UPDATE dbo.Competitors SET isTracked = 1 WHERE id = ?", existing.id)
            conn.commit()
            return get_competitor_by_id(str(existing.id))

        new_id = uuid.uuid4()
        primary = cleaned[0]
        location_display = f"{city}, {country}" if city and country else (city or country or "")
        cursor.execute(
            """
            INSERT INTO dbo.Competitors
                (id, name, location, source_url, platform_id, organization_id,
                 avgRating, sentimentScore, reviewCount, isTracked, status, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, 0.0, 0.0, 0, 1, 'Pending', GETDATE())
            """,
            new_id, name, location_display, primary["source_url"], primary["platform_id"], org_id,
        )
        conn.commit()

    return get_competitor_by_id(str(new_id))


# ── Update / Delete ──────────────────────────────────────────────────

def track_competitor(competitor_id: str, user_id: str | None = None) -> Optional[Dict]:
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE dbo.Competitors SET isTracked = 1 WHERE id = ?", competitor_id)
        conn.commit()
    return get_competitor_by_id(competitor_id)


def untrack_competitor(competitor_id: str) -> bool:
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE dbo.Competitors SET isTracked = 0 WHERE id = ?", competitor_id)
        conn.commit()
    return True


def delete_competitor(competitor_id: str) -> bool:
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM dbo.Competitors WHERE id = ?", competitor_id)
        conn.commit()
    return True


def get_competitor_reviews(competitor_id: str) -> List[Dict]:
    """Get processed reviews for a competitor via their organization_id."""
    competitor = get_competitor_by_id(competitor_id)
    if not competitor or not competitor.get("organization_id"):
        return []

    org_id = competitor["organization_id"]
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        rows = cursor.execute("""
            SELECT pr.id, s.organization_id, pr.rating, pr.reviewerName, pr.text,
                   pr.summary, pr.sentiment, pr.categories, pr.keyPhrases, pr.language, pr.reviewDate
            FROM dbo.processed_review pr
            JOIN dbo.source s ON s.source_id = pr.source_id
            WHERE s.organization_id = ?
            ORDER BY pr.reviewDate DESC
        """, org_id).fetchall()

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

        results.append({
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
        })
    return results
