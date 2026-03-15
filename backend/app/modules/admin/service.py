"""
Admin service — database operations and AI insights for the admin panel.

Extracted from routers/admin.py.
"""

import json
import re

import pyodbc
from fastapi import HTTPException
from google import genai

from app.core.pyodbc_connection import get_connection_string
from app.core.config import GENAI_KEY
from app.modules.admin.schemas import AdminUserCreatePayload, AdminUserUpdatePayload

# AI client (lazy — only initialized when first needed)
_genai_client = None


def _get_genai_client():
    global _genai_client
    if _genai_client is None:
        _genai_client = genai.Client(api_key=GENAI_KEY, http_options={"api_version": "v1"})
    return _genai_client


def _table_exists(cursor, table_name: str) -> bool:
    cursor.execute(
        "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = ?",
        table_name,
    )
    return cursor.fetchone()[0] > 0


# ── Organizations ───────────────────────────────────────────────────

def get_organizations():
    """List all organizations."""
    try:
        conn = pyodbc.connect(get_connection_string())
        cursor = conn.cursor()

        if not _table_exists(cursor, "Organizations"):
            conn.close()
            return []

        cursor.execute("""
            SELECT id, name, plan, memberCount, status, createdAt
            FROM dbo.Organizations
            ORDER BY name
        """)
        rows = cursor.fetchall()
        conn.close()

        return [
            {
                "id": r.id,
                "name": r.name,
                "plan": r.plan,
                "memberCount": r.memberCount,
                "status": r.status,
                "createdAt": r.createdAt.isoformat() if r.createdAt else None,
            }
            for r in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Users CRUD ──────────────────────────────────────────────────────

def get_admin_users():
    """List all users for admin management."""
    try:
        conn = pyodbc.connect(get_connection_string())
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                u.user_id, u.full_name, u.email, u.is_active,
                u.last_login_at, u.created_at,
                STRING_AGG(r.role_name, ', ') as roles
            FROM dbo.users u
            LEFT JOIN dbo.user_roles ur ON u.user_id = ur.user_id
            LEFT JOIN dbo.roles r ON ur.role_id = r.role_id
            GROUP BY u.user_id, u.full_name, u.email, u.is_active,
                     u.last_login_at, u.created_at
            ORDER BY u.created_at DESC
        """)

        rows = cursor.fetchall()
        conn.close()

        return [
            {
                "id": str(r.user_id),
                "name": r.full_name or "Unknown",
                "email": r.email,
                "role": r.roles or "No Role",
                "status": "Active" if r.is_active else "Inactive",
                "lastActive": r.last_login_at.isoformat() if r.last_login_at else None,
                "joinedAt": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def create_admin_user(payload: AdminUserCreatePayload):
    """Create a new user (admin action)."""
    try:
        conn = pyodbc.connect(get_connection_string())
        cursor = conn.cursor()

        cursor.execute(
            "SELECT COUNT(*) FROM dbo.users WHERE email = ?", payload.email
        )
        if cursor.fetchone()[0] > 0:
            conn.close()
            raise HTTPException(status_code=400, detail="Email already exists")

        cursor.execute("""
            INSERT INTO dbo.users (email, full_name, is_active, created_at, updated_at)
            OUTPUT INSERTED.user_id
            VALUES (?, ?, 1, GETUTCDATE(), GETUTCDATE())
        """, payload.email, payload.name)

        new_id = cursor.fetchone()[0]
        conn.commit()
        conn.close()

        return {
            "message": "User created",
            "user": {"id": str(new_id), "name": payload.name, "email": payload.email},
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def update_admin_user(user_id: str, payload: AdminUserUpdatePayload):
    """Update a user's details (admin action)."""
    try:
        conn = pyodbc.connect(get_connection_string())
        cursor = conn.cursor()

        sets = []
        params = []

        if payload.name is not None:
            sets.append("full_name = ?")
            params.append(payload.name)
        if payload.email is not None:
            sets.append("email = ?")
            params.append(payload.email)
        if payload.status is not None:
            sets.append("is_active = ?")
            params.append(1 if payload.status == "Active" else 0)

        if not sets:
            conn.close()
            return {"message": "No changes"}

        sets.append("updated_at = GETUTCDATE()")
        params.append(user_id)

        sql = f"UPDATE dbo.users SET {', '.join(sets)} WHERE user_id = ?"
        cursor.execute(sql, *params)
        conn.commit()
        conn.close()

        return {"message": "User updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def delete_admin_user(user_id: str):
    """Delete a user (admin action)."""
    try:
        conn = pyodbc.connect(get_connection_string())
        cursor = conn.cursor()

        cursor.execute("DELETE FROM dbo.users WHERE user_id = ?", user_id)
        conn.commit()
        conn.close()

        return {"message": "User deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Admin Dashboard ─────────────────────────────────────────────────

def get_dashboard_stats():
    """Admin overview stats."""
    try:
        conn = pyodbc.connect(get_connection_string())
        cursor = conn.cursor()

        # Total users
        cursor.execute("SELECT COUNT(*) FROM dbo.users")
        total_users = cursor.fetchone()[0]

        # Active users
        cursor.execute("SELECT COUNT(*) FROM dbo.users WHERE is_active = 1")
        active_users = cursor.fetchone()[0]

        # Total reviews
        cursor.execute("SELECT COUNT(*) FROM dbo.ProcessedReviews")
        total_reviews = cursor.fetchone()[0]

        # Competitors
        competitor_count = 0
        if _table_exists(cursor, "Competitors"):
            cursor.execute("SELECT COUNT(*) FROM dbo.Competitors")
            competitor_count = cursor.fetchone()[0]

        # Organizations
        org_count = 0
        if _table_exists(cursor, "Organizations"):
            cursor.execute("SELECT COUNT(*) FROM dbo.Organizations")
            org_count = cursor.fetchone()[0]

        conn.close()

        return {
            "totalUsers": total_users,
            "activeUsers": active_users,
            "totalReviews": total_reviews,
            "totalCompetitors": competitor_count,
            "totalOrganizations": org_count,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Admin AI Insights ───────────────────────────────────────────────

def generate_ai_insights():
    """Generate AI-powered insights for the admin dashboard."""
    try:
        conn = pyodbc.connect(get_connection_string())
        cursor = conn.cursor()

        # Gather data for AI
        cursor.execute("SELECT COUNT(*) FROM dbo.ProcessedReviews")
        total_reviews = cursor.fetchone()[0]

        cursor.execute("SELECT AVG(CAST(rating AS FLOAT)) FROM dbo.ProcessedReviews")
        avg_rating = cursor.fetchone()[0] or 0

        cursor.execute("""
            SELECT sentiment, COUNT(*) as cnt
            FROM dbo.ProcessedReviews
            GROUP BY sentiment
        """)
        sentiment_dist = {r.sentiment: r.cnt for r in cursor.fetchall()}

        cursor.execute("""
            SELECT TOP 5 categories, COUNT(*) as cnt
            FROM dbo.ProcessedReviews
            WHERE categories IS NOT NULL
            GROUP BY categories
            ORDER BY cnt DESC
        """)
        top_cats = [(r.categories, r.cnt) for r in cursor.fetchall()]

        conn.close()

        prompt = f"""You are an AI hospitality analyst. Given these stats, generate business insights.

Stats:
- Total reviews: {total_reviews}
- Average rating: {round(avg_rating, 2)}
- Sentiment: Positive={sentiment_dist.get('Positive', 0)}, Neutral={sentiment_dist.get('Neutral', 0)}, Negative={sentiment_dist.get('Negative', 0)}
- Top categories: {json.dumps(top_cats)}

Return JSON:
{{
  "summary": "one-paragraph executive summary",
  "strengths": ["list of 2-3 strengths"],
  "improvements": ["list of 2-3 improvement areas"],
  "recommendations": ["list of 2-3 actionable recommendations"]
}}

Return ONLY valid JSON. No markdown."""

        response = _get_genai_client().models.generate_content(
            model="gemini-2.5-flash-lite", contents=prompt
        )

        pattern = r"^```(?:json)?\s*(.*?)\s*```$"
        match = re.search(pattern, response.text, re.DOTALL | re.MULTILINE)
        clean_text = match.group(1) if match else response.text

        return json.loads(clean_text)

    except Exception as e:
        return {
            "summary": "Unable to generate insights at this time.",
            "strengths": [],
            "improvements": [],
            "recommendations": [],
            "error": str(e),
        }
