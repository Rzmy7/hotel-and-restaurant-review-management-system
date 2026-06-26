import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from app.core.db_utils import get_connection_string
import pyodbc

def run():
    connection_string = get_connection_string()
    conn = pyodbc.connect(connection_string, autocommit=True)
    cursor = conn.cursor()

    # Add is_email_notifications_enabled to dbo.user
    print("Checking dbo.[user] for is_email_notifications_enabled...")
    cursor.execute("""
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'user' AND COLUMN_NAME = 'is_email_notifications_enabled'
    """)
    if not cursor.fetchone():
        print("Adding is_email_notifications_enabled column to dbo.[user]...")
        cursor.execute("ALTER TABLE dbo.[user] ADD is_email_notifications_enabled BIT NOT NULL DEFAULT 1")
        print("Column added successfully.")
    else:
        print("is_email_notifications_enabled column already exists in dbo.[user].")

    print("Migration completed.")

if __name__ == "__main__":
    run()
