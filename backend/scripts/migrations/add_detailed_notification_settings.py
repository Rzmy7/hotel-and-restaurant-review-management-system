import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from app.core.db_utils import get_connection_string
import pyodbc

def run():
    connection_string = get_connection_string()
    conn = pyodbc.connect(connection_string, autocommit=True)
    cursor = conn.cursor()

    columns_to_add = {
        "is_new_review_alerts_enabled": "BIT NOT NULL DEFAULT 1",
        "is_weekly_summary_enabled": "BIT NOT NULL DEFAULT 1",
        "is_group_invitations_enabled": "BIT NOT NULL DEFAULT 1",
        "is_subscription_changes_enabled": "BIT NOT NULL DEFAULT 1",
    }

    for column_name, column_def in columns_to_add.items():
        print(f"Checking dbo.[user] for {column_name}...")
        cursor.execute(f"""
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'user' AND COLUMN_NAME = ?
        """, (column_name,))
        if not cursor.fetchone():
            print(f"Adding {column_name} column to dbo.[user]...")
            cursor.execute(f"ALTER TABLE dbo.[user] ADD {column_name} {column_def}")
            print(f"Column {column_name} added successfully.")
        else:
            print(f"Column {column_name} already exists in dbo.[user].")

    print("Migration completed.")

if __name__ == "__main__":
    run()
