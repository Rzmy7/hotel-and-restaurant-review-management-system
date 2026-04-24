"""Add city + country columns to dbo.organization for location-based competitor suggestions."""

import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

import pyodbc
from app.core.db_utils import get_connection_string


def _column_exists(cursor, table: str, column: str) -> bool:
    cursor.execute(
        """
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = ? AND COLUMN_NAME = ?
        """,
        table,
        column,
    )
    return cursor.fetchone() is not None


def run():
    conn = pyodbc.connect(get_connection_string(), autocommit=True)
    cursor = conn.cursor()

    for col in ("city", "country"):
        if _column_exists(cursor, "organization", col):
            print(f"dbo.organization.{col} already exists.")
            continue
        print(f"Adding dbo.organization.{col}...")
        cursor.execute(f"ALTER TABLE dbo.organization ADD {col} NVARCHAR(100) NULL")
        print(f"  + {col} added.")

    print("Migration completed.")


if __name__ == "__main__":
    run()
