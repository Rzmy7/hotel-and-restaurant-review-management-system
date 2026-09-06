"""FAQ management service for Admin and Public Landing Page."""

import pyodbc
from typing import Any, Optional


DEFAULT_FAQS = [
    {
        "question": "Which platforms do you support?",
        "answer": "We support all major review platforms including {platforms}.",
        "sort_order": 1,
        "is_active": True,
        "is_platform_question": True,
    },
    {
        "question": "How does the AI response draft work?",
        "answer": "Our AI analyzes the content and sentiment of a review and suggests a personalized response based on your brand's voice. You can review, edit, and post it with one click.",
        "sort_order": 2,
        "is_active": True,
        "is_platform_question": False,
    },
    {
        "question": "Can I manage multiple locations?",
        "answer": "Absolutely! Our platform is designed specifically for businesses with multiple locations, allowing you to switch between them seamlessly or see aggregated data.",
        "sort_order": 3,
        "is_active": True,
        "is_platform_question": False,
    },
    {
        "question": "Is there a free trial?",
        "answer": "Yes, we offer a 14-day full-featured free trial. No credit card is required to start.",
        "sort_order": 4,
        "is_active": True,
        "is_platform_question": False,
    },
]


def ensure_faq_table(cursor: pyodbc.Cursor) -> None:
    """Ensures dbo.faqs table exists in the database."""
    cursor.execute(
        """
        IF OBJECT_ID('dbo.faqs', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.faqs (
                faq_id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_faqs PRIMARY KEY,
                question NVARCHAR(500) NOT NULL,
                answer NVARCHAR(MAX) NOT NULL,
                sort_order INT NOT NULL CONSTRAINT DF_faqs_sort_order DEFAULT 0,
                is_active BIT NOT NULL CONSTRAINT DF_faqs_is_active DEFAULT 1,
                is_platform_question BIT NOT NULL CONSTRAINT DF_faqs_is_platform DEFAULT 0,
                created_at DATETIME2(7) NOT NULL CONSTRAINT DF_faqs_created_at DEFAULT SYSUTCDATETIME(),
                updated_at DATETIME2(7) NOT NULL CONSTRAINT DF_faqs_updated_at DEFAULT SYSUTCDATETIME()
            );
        END;
        """
    )


def get_active_platforms(cursor: pyodbc.Cursor) -> list[str]:
    """Retrieves names of all active platforms from the database."""
    from app.core.db_utils import table_exists, execute_query

    active_names: list[str] = []

    # Priority 1: Check dbo.platform
    if table_exists(cursor, "platform"):
        try:
            rows = execute_query(
                cursor,
                "SELECT platform_name FROM dbo.platform WHERE LOWER(LTRIM(RTRIM(platform_status))) = 'active' ORDER BY platform_id",
            ).fetchall()
            active_names = [str(r[0]).strip() for r in rows if r[0]]
        except Exception:
            pass

    # Priority 2: Fallback to dbo.platforms_source
    if not active_names and table_exists(cursor, "platforms_source"):
        try:
            rows = execute_query(
                cursor,
                "SELECT platform_name FROM dbo.platforms_source WHERE LOWER(LTRIM(RTRIM(platform_status))) = 'active' ORDER BY platform_id",
            ).fetchall()
            active_names = [str(r[0]).strip() for r in rows if r[0]]
        except Exception:
            pass

    # Default fallback list if database has no active rows yet
    if not active_names:
        active_names = ["Google Reviews", "TripAdvisor", "Booking.com", "Airbnb", "Agoda"]

    return active_names


def format_platform_list(platforms: list[str]) -> str:
    """Formats a list of platform names into natural English: 'A, B, C, and D'."""
    if not platforms:
        return "major review channels"
    if len(platforms) == 1:
        return platforms[0]
    if len(platforms) == 2:
        return f"{platforms[0]} and {platforms[1]}"
    return f"{', '.join(platforms[:-1])}, and {platforms[-1]}"


def seed_default_faqs(cursor: pyodbc.Cursor) -> None:
    """Seeds default FAQs if table is empty."""
    ensure_faq_table(cursor)

    row = cursor.execute("SELECT COUNT(*) FROM dbo.faqs").fetchone()
    count = int(row[0]) if row and row[0] is not None else 0

    if count == 0:
        platforms = get_active_platforms(cursor)
        platform_text = format_platform_list(platforms)

        for item in DEFAULT_FAQS:
            # Replace placeholder if platform question
            answer = item["answer"]
            if "{platforms}" in answer:
                answer = answer.replace("{platforms}", platform_text)

            cursor.execute(
                """
                INSERT INTO dbo.faqs (question, answer, sort_order, is_active, is_platform_question, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, SYSUTCDATETIME(), SYSUTCDATETIME())
                """,
                (
                    item["question"],
                    answer,
                    item["sort_order"],
                    1 if item["is_active"] else 0,
                    1 if item["is_platform_question"] else 0,
                ),
            )


def get_public_faqs(cursor: pyodbc.Cursor) -> list[dict[str, Any]]:
    """Returns active FAQs formatted for the public landing page."""
    ensure_faq_table(cursor)
    seed_default_faqs(cursor)

    platforms = get_active_platforms(cursor)
    platform_text = format_platform_list(platforms)

    rows = cursor.execute(
        """
        SELECT faq_id, question, answer, sort_order, is_platform_question
        FROM dbo.faqs
        WHERE is_active = 1
        ORDER BY sort_order ASC, faq_id ASC
        """
    ).fetchall()

    faqs = []
    for row in rows:
        fid = int(row[0])
        question = str(row[1] or "")
        answer = str(row[2] or "")
        sort_order = int(row[3] or 0)
        is_platform = bool(row[4])

        # Dynamically replace {platforms} token if present
        if "{platforms}" in answer:
            answer = answer.replace("{platforms}", platform_text)

        faqs.append({
            "id": str(fid),
            "question": question,
            "answer": answer,
            "sort_order": sort_order,
            "is_platform_question": is_platform,
        })

    return faqs


def get_admin_faqs(cursor: pyodbc.Cursor) -> list[dict[str, Any]]:
    """Returns all FAQs (active and inactive) for admin management."""
    ensure_faq_table(cursor)
    seed_default_faqs(cursor)

    rows = cursor.execute(
        """
        SELECT faq_id, question, answer, sort_order, is_active, is_platform_question,
               CONVERT(VARCHAR(30), created_at, 126), CONVERT(VARCHAR(30), updated_at, 126)
        FROM dbo.faqs
        ORDER BY sort_order ASC, faq_id ASC
        """
    ).fetchall()

    return [
        {
            "id": str(row[0]),
            "question": str(row[1] or ""),
            "answer": str(row[2] or ""),
            "sort_order": int(row[3] or 0),
            "is_active": bool(row[4]),
            "is_platform_question": bool(row[5]),
            "created_at": str(row[6] or ""),
            "updated_at": str(row[7] or ""),
        }
        for row in rows
    ]


def create_faq(
    cursor: pyodbc.Cursor,
    question: str,
    answer: str,
    sort_order: int = 0,
    is_active: bool = True,
    is_platform_question: bool = False,
) -> dict[str, Any]:
    """Creates a new FAQ entry in dbo.faqs."""
    ensure_faq_table(cursor)

    cursor.execute(
        """
        INSERT INTO dbo.faqs (question, answer, sort_order, is_active, is_platform_question, created_at, updated_at)
        OUTPUT INSERTED.faq_id, INSERTED.created_at
        VALUES (?, ?, ?, ?, ?, SYSUTCDATETIME(), SYSUTCDATETIME())
        """,
        (
            question.strip(),
            answer.strip(),
            sort_order,
            1 if is_active else 0,
            1 if is_platform_question else 0,
        ),
    )
    inserted = cursor.fetchone()
    if not inserted:
        raise RuntimeError("Failed to insert FAQ")

    return {
        "id": str(inserted[0]),
        "question": question.strip(),
        "answer": answer.strip(),
        "sort_order": sort_order,
        "is_active": is_active,
        "is_platform_question": is_platform_question,
        "created_at": str(inserted[1]),
        "updated_at": str(inserted[1]),
    }


def update_faq(
    cursor: pyodbc.Cursor,
    faq_id: int,
    question: Optional[str] = None,
    answer: Optional[str] = None,
    sort_order: Optional[int] = None,
    is_active: Optional[bool] = None,
    is_platform_question: Optional[bool] = None,
) -> dict[str, Any]:
    """Updates an existing FAQ entry."""
    ensure_faq_table(cursor)

    # Fetch current
    row = cursor.execute(
        "SELECT faq_id, question, answer, sort_order, is_active, is_platform_question FROM dbo.faqs WHERE faq_id = ?",
        (faq_id,),
    ).fetchone()

    if not row:
        raise ValueError(f"FAQ with id {faq_id} not found")

    new_q = question.strip() if question is not None else str(row[1])
    new_a = answer.strip() if answer is not None else str(row[2])
    new_order = sort_order if sort_order is not None else int(row[3])
    new_active = is_active if is_active is not None else bool(row[4])
    new_platform = is_platform_question if is_platform_question is not None else bool(row[5])

    cursor.execute(
        """
        UPDATE dbo.faqs
        SET question = ?,
            answer = ?,
            sort_order = ?,
            is_active = ?,
            is_platform_question = ?,
            updated_at = SYSUTCDATETIME()
        WHERE faq_id = ?
        """,
        (
            new_q,
            new_a,
            new_order,
            1 if new_active else 0,
            1 if new_platform else 0,
            faq_id,
        ),
    )

    return {
        "id": str(faq_id),
        "question": new_q,
        "answer": new_a,
        "sort_order": new_order,
        "is_active": new_active,
        "is_platform_question": new_platform,
    }


def delete_faq(cursor: pyodbc.Cursor, faq_id: int) -> bool:
    """Deletes an FAQ entry from dbo.faqs."""
    ensure_faq_table(cursor)
    cursor.execute("DELETE FROM dbo.faqs WHERE faq_id = ?", (faq_id,))
    return cursor.rowcount > 0
