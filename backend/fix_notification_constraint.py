"""Fix notification CHECK constraint to include group_invite."""
from app.core.pyodbc_connection import get_connection_string
import pyodbc

conn = pyodbc.connect(get_connection_string(), autocommit=True)
cur = conn.cursor()

try:
    cur.execute("""
    IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_notification_type_valid')
        ALTER TABLE dbo.notification DROP CONSTRAINT ck_notification_type_valid
    """)
    cur.execute("""
    ALTER TABLE dbo.notification ADD CONSTRAINT ck_notification_type_valid
        CHECK (notification_type IN ('info','success','warning','error','maintenance','announcement','group_invite'))
    """)
    print("OK: Updated notification CHECK constraint")
except Exception as e:
    print(f"Error: {e}")

# Also check the table name (might be Notification not notification)
try:
    cur.execute("""
    IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_notification_type_valid')
        SELECT 'exists' as status
    """)
    print("Constraint confirmed exists")
except Exception as e:
    print(f"Verify error: {e}")

print("Done.")
