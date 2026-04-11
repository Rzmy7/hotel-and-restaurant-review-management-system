"""Rename metadata -> extra_data in dbo.Notification (SQLAlchemy reserved word fix)."""
from app.core.pyodbc_connection import get_connection_string
import pyodbc

conn = pyodbc.connect(get_connection_string(), autocommit=True)
cur = conn.cursor()

try:
    # Check if metadata column exists
    row = cur.execute("""
        SELECT COUNT(*) FROM sys.columns
        WHERE object_id = OBJECT_ID('dbo.Notification') AND name = 'metadata'
    """).fetchone()
    if row[0] > 0:
        cur.execute("EXEC sp_rename 'dbo.Notification.metadata', 'extra_data', 'COLUMN'")
        print("OK: Renamed metadata -> extra_data in dbo.Notification")
    else:
        # Check if extra_data already exists
        row2 = cur.execute("""
            SELECT COUNT(*) FROM sys.columns
            WHERE object_id = OBJECT_ID('dbo.Notification') AND name = 'extra_data'
        """).fetchone()
        if row2[0] == 0:
            cur.execute("ALTER TABLE dbo.Notification ADD extra_data NVARCHAR(MAX) NULL")
            print("OK: Added extra_data to dbo.Notification")
        else:
            print("SKIP: extra_data already exists")
except Exception as e:
    print(f"Error: {e}")

print("Done.")
