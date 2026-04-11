"""DB migration script for Groups & Subgroups feature."""
from app.core.pyodbc_connection import get_connection_string
import pyodbc

conn = pyodbc.connect(get_connection_string(), autocommit=True)
cur = conn.cursor()

steps = []

# 1. Add description to dbo.group
try:
    cur.execute("ALTER TABLE dbo.[group] ADD description NVARCHAR(500) NULL")
    steps.append("OK: Added description to dbo.group")
except Exception as e:
    steps.append(f"SKIP: description — {e}")

# 2. Add parent_group_id to dbo.group
try:
    cur.execute("ALTER TABLE dbo.[group] ADD parent_group_id UNIQUEIDENTIFIER NULL")
    steps.append("OK: Added parent_group_id to dbo.group")
except Exception as e:
    steps.append(f"SKIP: parent_group_id — {e}")

# 3. Fix GROUP_OWNER in group_member check constraint
try:
    cur.execute("""
    IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_group_member_role_valid')
        ALTER TABLE dbo.group_member DROP CONSTRAINT ck_group_member_role_valid
    """)
    cur.execute("""
    ALTER TABLE dbo.group_member ADD CONSTRAINT ck_group_member_role_valid
        CHECK (role IN ('GROUP_OWNER','GROUP_MANAGER','GROUP_MEMBER'))
    """)
    steps.append("OK: Updated group_member CHECK constraint to include GROUP_OWNER")
except Exception as e:
    steps.append(f"SKIP: check constraint — {e}")

# 4. Add metadata column to dbo.Notification
try:
    cur.execute("ALTER TABLE dbo.Notification ADD metadata NVARCHAR(MAX) NULL")
    steps.append("OK: Added metadata to dbo.Notification")
except Exception as e:
    steps.append(f"SKIP: metadata — {e}")

# 5. Create dbo.group_invitation
try:
    cur.execute("""
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='group_invitation' AND schema_id=SCHEMA_ID('dbo'))
    CREATE TABLE dbo.group_invitation (
        invitation_id   UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        group_id        UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.[group](group_id) ON DELETE CASCADE,
        invited_email   NVARCHAR(255) NOT NULL,
        invited_user_id UNIQUEIDENTIFIER NULL REFERENCES dbo.[user](user_id),
        invited_by      UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.[user](user_id),
        status          NVARCHAR(20) NOT NULL DEFAULT 'pending',
        role            NVARCHAR(30) NOT NULL DEFAULT 'GROUP_MEMBER',
        created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        responded_at    DATETIME2 NULL,
        notification_id UNIQUEIDENTIFIER NULL
    )
    """)
    steps.append("OK: Created dbo.group_invitation")
except Exception as e:
    steps.append(f"SKIP: group_invitation — {e}")

for s in steps:
    print(s)
print("\nMigration complete.")
