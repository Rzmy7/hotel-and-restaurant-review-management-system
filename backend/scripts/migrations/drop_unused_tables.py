"""
Migration script to safely drop obsolete and orphaned tables from the database.

Tables dropped:
1. dbo.ReviewCategory (PascalCase legacy duplicate)
2. dbo.CompetitorReviews (Legacy competitor review table)
3. dbo.user_subscription (Orphaned table never populated)
4. dbo.group_hotels (Orphaned legacy table)
5. dbo.group_invitation (Orphaned legacy table replaced by group_invite)
"""

import os
import sys

# Ensure backend root is on sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

import pyodbc
from app.core.pyodbc_connection import get_connection_string


def drop_foreign_keys_referencing(cursor: pyodbc.Cursor, table_name: str) -> None:
    """Drop any foreign key constraints pointing to the given table."""
    sql = """
        SELECT fk.name AS fk_name, OBJECT_SCHEMA_NAME(fk.parent_object_id) AS schema_name, OBJECT_NAME(fk.parent_object_id) AS table_name
        FROM sys.foreign_keys fk
        WHERE fk.referenced_object_id = OBJECT_ID(?)
    """
    cursor.execute(sql, f"dbo.{table_name}")
    fks = cursor.fetchall()
    for fk in fks:
        fk_name = fk[0]
        schema = fk[1]
        parent_table = fk[2]
        print(f"  -> Dropping FK constraint [{fk_name}] on [{schema}].[{parent_table}] pointing to [{table_name}]...")
        cursor.execute(f"ALTER TABLE [{schema}].[{parent_table}] DROP CONSTRAINT [{fk_name}]")


def drop_table_if_exists(cursor: pyodbc.Cursor, table_name: str) -> bool:
    """Drop a table if it exists in dbo schema."""
    cursor.execute("SELECT OBJECT_ID(?)", f"dbo.{table_name}")
    row = cursor.fetchone()
    if row and row[0] is not None:
        drop_foreign_keys_referencing(cursor, table_name)
        print(f"Dropping table dbo.{table_name}...")
        cursor.execute(f"DROP TABLE dbo.[{table_name}]")
        print(f"  [SUCCESS] Dropped dbo.{table_name}.")
        return True
    else:
        print(f"Table dbo.{table_name} does not exist (already dropped or never created).")
        return False


def run():
    conn_str = get_connection_string()
    print("Connecting to database...")
    conn = pyodbc.connect(conn_str, autocommit=True)
    cursor = conn.cursor()

    tables_to_drop = [
        "ReviewCategory",      # PascalCase legacy table
        "CompetitorReviews",   # Legacy competitor reviews
        "user_subscription",   # Orphaned table
        "group_hotels",        # Orphaned legacy table
        "group_invitation",    # Orphaned legacy table
    ]

    print("\nStarting cleanup of unused database tables...\n" + "="*50)
    dropped_count = 0
    for tbl in tables_to_drop:
        if drop_table_if_exists(cursor, tbl):
            dropped_count += 1

    print("="*50)
    print(f"Migration completed. Dropped {dropped_count} tables.")

    # Verification
    print("\nVerifying current tables in dbo schema...")
    cursor.execute("""
        SELECT name FROM sys.tables 
        WHERE schema_id = SCHEMA_ID('dbo') 
        ORDER BY name
    """)
    remaining = [r[0] for r in cursor.fetchall()]
    print(f"Total remaining tables: {len(remaining)}")
    
    still_present = [t for t in tables_to_drop if t.lower() in [r.lower() for r in remaining]]
    if still_present:
        print(f"WARNING: Some tables are still present: {still_present}")
    else:
        print("ALL target tables have been confirmed DROPPED from the database!")


if __name__ == "__main__":
    run()
