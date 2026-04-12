from app.core.pyodbc_connection import get_connection_string
import pyodbc

conn = pyodbc.connect(get_connection_string(), autocommit=True)
cur = conn.cursor()

# Make tenant_id nullable on organization so competitors don't need a real tenant
# First check for FK constraints
fk_rows = cur.execute("""
    SELECT fk.name AS fk_name
    FROM sys.foreign_keys fk
    JOIN sys.tables t ON fk.parent_object_id = t.object_id
    JOIN sys.columns c ON c.object_id = t.object_id AND c.column_id = fk.key_index_id
    WHERE t.name = 'organization'
""").fetchall()
print("FK constraints on organization:", [r.fk_name for r in fk_rows])

# Safer: query directly
fks = cur.execute("""
    SELECT
        kcu.CONSTRAINT_NAME,
        kcu.COLUMN_NAME
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
    JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
        ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
    WHERE kcu.TABLE_NAME = 'organization'
      AND tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
""").fetchall()
print("FKs on organization:", [(r[0], r[1]) for r in fks])

# Drop FK on tenant_id if exists, then re-add without NOT NULL
for fk_name, col_name in [(r[0], r[1]) for r in fks]:
    if col_name == 'tenant_id':
        print(f"Dropping FK: {fk_name}")
        cur.execute(f"ALTER TABLE dbo.organization DROP CONSTRAINT {fk_name}")

# Now alter column to nullable
cur.execute("ALTER TABLE dbo.organization ALTER COLUMN tenant_id UNIQUEIDENTIFIER NULL")
print("Made tenant_id nullable on dbo.organization")

# Re-add FK (optional, allows NULL)
cur.execute("""
    ALTER TABLE dbo.organization
    ADD CONSTRAINT FK_organization_tenant
    FOREIGN KEY (tenant_id) REFERENCES dbo.tenant(tenant_id)
    ON DELETE CASCADE
""")
print("Re-added FK constraint with nullable support")
print("Done.")
