import os
from sqlalchemy import text
from app.database.session import engine


def insert_roles():
    with engine.begin() as conn:
        print("Executing role inserts...")

        # Enable manual ID insertions
        conn.execute(text("SET IDENTITY_INSERT dbo.[role] ON;"))

        # Insert or Update the roles
        conn.execute(text("""
                MERGE INTO dbo.[role] AS target
                USING (VALUES 
                    (1, 'tenant', NULL, GETUTCDATE()),
                    (2, 'admin', NULL, GETUTCDATE())
                ) AS source (role_id, role_name, description, created_at)
                ON target.role_id = source.role_id
                WHEN MATCHED THEN
                    UPDATE SET role_name = source.role_name, description = source.description
                WHEN NOT MATCHED THEN
                    INSERT (role_id, role_name, description, created_at)
                    VALUES (source.role_id, source.role_name, source.description, source.created_at);
            """))

        # Turn manual ID insertions back off
        conn.execute(text("SET IDENTITY_INSERT dbo.[role] OFF;"))

        print("✅ Successfully inserted roles: 'tenant', 'admin'.")


if __name__ == "__main__":
    insert_roles()
