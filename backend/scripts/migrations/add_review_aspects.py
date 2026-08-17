"""Create dbo.review_aspects and backfill it from dbo.review_category.

The Reviews/AI/Insights module dual-writes per-aspect scores to both
review_category (used by category filters, kept for backward compatibility)
and review_aspects. This migration creates the new table if missing and
copies existing rows. Idempotent — safe to run multiple times.
"""

import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

import pyodbc
from app.core.db_utils import get_connection_string


def _table_exists(cursor, table: str) -> bool:
    cursor.execute(
        """
        SELECT 1
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = ?
        """,
        table,
    )
    return cursor.fetchone() is not None


def run():
    conn = pyodbc.connect(get_connection_string(), autocommit=True)
    cursor = conn.cursor()

    if _table_exists(cursor, "review_aspects"):
        print("dbo.review_aspects already exists.")
    else:
        print("Creating dbo.review_aspects...")
        cursor.execute(
            """
            CREATE TABLE dbo.review_aspects (
                id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
                review_id UNIQUEIDENTIFIER NOT NULL,
                name NVARCHAR(100) NOT NULL,
                score FLOAT NULL,
                created_at DATETIME NULL DEFAULT SYSUTCDATETIME()
            )
            """
        )
        cursor.execute(
            """
            CREATE NONCLUSTERED INDEX IX_review_aspects_review_id
            ON dbo.review_aspects (review_id)
            """
        )
        cursor.execute(
            """
            ALTER TABLE dbo.review_aspects
            ADD CONSTRAINT FK_review_aspects_review
            FOREIGN KEY (review_id) REFERENCES dbo.processed_review (id) ON DELETE CASCADE
            """
        )
        print("  + table, index and FK created.")

    cursor.execute("SELECT COUNT(*) FROM dbo.review_category")
    src_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM dbo.review_aspects")
    dst_count = cursor.fetchone()[0]
    print(f"review_category rows: {src_count} | review_aspects rows: {dst_count}")

    if dst_count < src_count:
        print("Backfilling missing rows from dbo.review_category...")
        cursor.execute(
            """
            INSERT INTO dbo.review_aspects (id, review_id, name, score, created_at)
            SELECT NEWID(), rc.review_id, rc.name, rc.score, rc.created_at
            FROM dbo.review_category rc
            WHERE NOT EXISTS (
                SELECT 1 FROM dbo.review_aspects ra
                WHERE ra.review_id = rc.review_id AND ra.name = rc.name
            )
            """
        )
        print(f"  + {cursor.rowcount} rows inserted.")

    cursor.execute("SELECT COUNT(*) FROM dbo.review_aspects")
    print(f"Final review_aspects row count: {cursor.fetchone()[0]}")
    print("Migration completed.")


if __name__ == "__main__":
    run()
