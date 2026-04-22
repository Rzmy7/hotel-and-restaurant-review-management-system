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
from datetime import datetime
from typing import List, Optional, Dict

import pyodbc

from app.core.pyodbc_connection import connect_db


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
    with connect_db() as conn:
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
    with connect_db() as conn:
        cursor = conn.cursor()
        row = cursor.execute("""
            SELECT id, name, location, source_url, platform_id, organization_id,
                   avgRating, sentimentScore, reviewCount, isTracked, status, createdAt
            FROM dbo.Competitors WHERE id = ?
        """, competitor_id).fetchone()
    return _row_to_competitor(row) if row else None


# ── Smart competitor registration ────────────────────────────────────

def register_competitor(
    name: str,
    source_url: str,
    platform_id: int = 2,
    organization_type_id: int = 1,
) -> Dict:
    """
    Smart registration:
    - Checks if source_url already exists in dbo.source.
    - If YES  → use that org_id, status = 'Active' (reviews already exist).
    - If NO   → create ownerless org + source, status = 'Pending' (scrape needed).
    Returns the new competitor entry.
    """
    source_url_clean = source_url.strip().rstrip("/")

    with connect_db() as conn:
        cursor = conn.cursor()

        # 1. Check if this URL already maps to an existing org
        existing_source = cursor.execute("""
            SELECT s.source_id, s.organization_id, o.organization_name
            FROM dbo.source s
            JOIN dbo.organization o ON o.organization_id = s.organization_id
            WHERE LOWER(RTRIM(LTRIM(s.source_url))) = LOWER(?)
              AND s.platform_id = ?
        """, source_url_clean, platform_id).fetchone()

        if existing_source:
            org_id = existing_source.organization_id
            status = "Active"
            print(f"[Competitor] Found existing org {org_id} for URL {source_url_clean}")
        else:
            # 2. Create ownerless organization (tenant_id = NULL)
            org_id = uuid.uuid4()
            cursor.execute("""
                INSERT INTO dbo.organization
                    (organization_id, organization_name, tenant_id, organization_type_id, created_at, updated_at)
                VALUES (?, ?, NULL, ?, GETDATE(), GETDATE())
            """, org_id, name, organization_type_id)

            # 3. Register source URL for new org
            source_id = uuid.uuid4()
            cursor.execute("""
                INSERT INTO dbo.source
                    (source_id, organization_id, platform_id, source_url,
                     source_status, fetching_frequency, created_at, num_of_syncs,
                     success_sync_count, success_rate)
                VALUES (?, ?, ?, ?, 'queued', 1, GETDATE(), 0, 0, 0.0)
            """, source_id, org_id, platform_id, source_url_clean)

            status = "Pending"
            print(f"[Competitor] Created new ownerless org {org_id} for URL {source_url_clean}")

        # 4. Check this competitor isn't already in the list
        existing_competitor = cursor.execute("""
            SELECT id FROM dbo.Competitors WHERE organization_id = ?
        """, org_id).fetchone()

        if existing_competitor:
            # Ensure it's tracked (it may have been added previously without tracking)
            cursor.execute("UPDATE dbo.Competitors SET isTracked = 1 WHERE id = ?", existing_competitor.id)
            conn.commit()
            return get_competitor_by_id(str(existing_competitor.id))

        # 5. Insert into dbo.Competitors
        new_id = uuid.uuid4()
        cursor.execute("""
            INSERT INTO dbo.Competitors
                (id, name, location, source_url, platform_id, organization_id,
                 avgRating, sentimentScore, reviewCount, isTracked, status, createdAt)
            VALUES (?, ?, '', ?, ?, ?, 0.0, 0.0, 0, 1, ?, GETDATE())
        """, new_id, name, source_url_clean, platform_id, org_id, status)
        conn.commit()

    # If new org, trigger background scrape via normal org pipeline
    if status == "Pending":
        _trigger_org_scrape(str(org_id), str(source_id), source_url_clean, platform_id)

    return get_competitor_by_id(str(new_id))


def _trigger_org_scrape(org_id: str, source_id: str, source_url: str, platform_id: int):
    """Trigger the normal org review-scraping pipeline in the background."""
    try:
        from app.modules.reviews.scraper import scrape_booking_for_competitor
        import threading

        def _scrape():
            try:
                from app.modules.reviews.processor import insert_processed_reviews
                import pyodbc as _pyodbc
                raw = scrape_booking_for_competitor(source_url, headless=True)
                if raw:
                    with _connect_db() as conn:
                        insert_processed_reviews(conn, _build_review_rows(raw, org_id))
                # Mark source as active & update competitor stats
                _finalize_org_competitor(org_id)
            except Exception as e:
                print(f"[Competitor Scrape] Error for org {org_id}: {e}")

        threading.Thread(target=_scrape, daemon=True).start()
        print(f"[Competitor Scrape] Started background scrape for org {org_id}")
    except ImportError as e:
        print(f"[Competitor Scrape] Scraper not available: {e}")


def _build_review_rows(raw_reviews, org_id: str) -> list:
    """Adapt raw scraped reviews for insert_processed_reviews with org_id context."""
    import json
    from google import genai
    from app.core.config import GENAI_KEY
    from app.modules.competitors.ai.prompts import COMPETITOR_PROMPT
    import re

    client = genai.Client(api_key=GENAI_KEY, http_options={"api_version": "v1"})
    from dataclasses import asdict
    hotel_data = json.dumps([asdict(r) for r in raw_reviews], ensure_ascii=False)
    prompt = COMPETITOR_PROMPT.format(hotel_data=hotel_data)
    response = client.models.generate_content(model="gemini-2.5-flash-lite", contents=prompt)

    def strip_fences(t):
        m = re.search(r"^```(?:json)?\s*(.*?)\s*```$", t, re.DOTALL | re.MULTILINE)
        return m.group(1) if m else t

    rows = json.loads(strip_fences(response.text))
    # Attach organization_id so insert_processed_reviews can store it
    for r in rows:
        r["organization_id"] = org_id
    return rows


def _finalize_org_competitor(org_id: str):
    """After scraping, update competitor status and stats from processed_review."""
    with connect_db() as conn:
        cursor = conn.cursor()
        row = cursor.execute("""
            SELECT COUNT(*) as cnt,
                   AVG(CAST(pr.rating AS FLOAT)) as avgRating,
                   SUM(CASE WHEN pr.sentiment = 'Positive' THEN 1 ELSE 0 END) * 100.0
                       / NULLIF(COUNT(*), 0) as sentimentScore
            FROM dbo.processed_review pr
            JOIN dbo.source s ON pr.source_id = s.source_id
            WHERE s.organization_id = ?
        """, org_id).fetchone()

        if row and (row.cnt or 0) > 0:
            cursor.execute("""
                UPDATE dbo.Competitors
                SET avgRating = ?, sentimentScore = ?, reviewCount = ?, status = 'Active'
                WHERE organization_id = ?
            """, round(row.avgRating or 0, 2),
                round(row.sentimentScore or 0, 1),
                row.cnt, org_id)
            conn.commit()


# ── Update / Delete ──────────────────────────────────────────────────

def track_competitor(competitor_id: str, user_id: str | None = None) -> Optional[Dict]:
    with connect_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE dbo.Competitors SET isTracked = 1 WHERE id = ?", competitor_id)
        conn.commit()
    return get_competitor_by_id(competitor_id)


def untrack_competitor(competitor_id: str) -> bool:
    with connect_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE dbo.Competitors SET isTracked = 0 WHERE id = ?", competitor_id)
        conn.commit()
    return True


def delete_competitor(competitor_id: str) -> bool:
    with connect_db() as conn:
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
    with connect_db() as conn:
        cursor = conn.cursor()
        rows = cursor.execute("""
            SELECT pr.id, s.organization_id, pr.rating, pr.reviewerName, pr.text,
                   pr.summary, pr.sentiment, pr.categories, pr.keyPhrases, pr.language, pr.reviewDate
            FROM dbo.processed_review pr
            JOIN dbo.source s ON pr.source_id = s.source_id
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
