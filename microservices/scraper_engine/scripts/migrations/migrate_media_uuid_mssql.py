import sys
import os
import uuid
from sqlalchemy import text

# Add the project root to sys.path to import core modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from core.database import get_engine

def migrate_media():
    engine = get_engine()
    table = 'review_media'

    print(f"--- Migrating {table}.media_id to UUID ---")
    sys.stdout.flush()

    with engine.begin() as conn:
        # Step 1: Add temporary UUID column
        print(f"Adding media_uuid column to {table}...")
        sys.stdout.flush()
        # Check if already exists
        check_col = conn.execute(text(f"""
            SELECT 1 FROM sys.columns 
            WHERE name = 'media_uuid' AND object_id = OBJECT_ID('{table}')
        """)).scalar()
        if not check_col:
            conn.execute(text(f"ALTER TABLE {table} ADD media_uuid VARCHAR(36) NULL"))

        # Step 2: Populate UUIDs
        print(f"Generating UUIDs for {table}...")
        sys.stdout.flush()
        conn.execute(text(f"""
            UPDATE {table} 
            SET media_uuid = LOWER(CAST(NEWID() AS VARCHAR(36)))
            WHERE media_uuid IS NULL
        """))

        # Step 3: Drop constraints and indices
        print(f"Dropping constraints and indices dependent on media_id...")
        sys.stdout.flush()
        # Find PK constraint
        pk_res = conn.execute(text(f"""
            SELECT name FROM sys.indexes 
            WHERE object_id = OBJECT_ID('{table}') AND is_primary_key = 1
        """)).scalar()
        if pk_res:
            print(f"Dropping PK {pk_res}...")
            sys.stdout.flush()
            conn.execute(text(f"ALTER TABLE {table} DROP CONSTRAINT {pk_res}"))

        # Step 4: Swap columns
        print(f"Swapping media_id column in {table}...")
        sys.stdout.flush()
        # Drop old int column
        conn.execute(text(f"ALTER TABLE {table} DROP COLUMN media_id"))
        # Rename media_uuid to media_id
        conn.execute(text(f"EXEC sp_rename '{table}.media_uuid', 'media_id', 'COLUMN'"))
        # Make the new column UNIQUEIDENTIFIER NOT NULL
        conn.execute(text(f"ALTER TABLE {table} ALTER COLUMN media_id UNIQUEIDENTIFIER NOT NULL"))

        # Step 5: Re-add Primary Key
        print(f"Re-adding PK to {table}...")
        sys.stdout.flush()
        conn.execute(text(f"ALTER TABLE {table} ADD CONSTRAINT PK_{table} PRIMARY KEY (media_id)"))

    print("--- Media UUID Migration Successful! ---")
    sys.stdout.flush()

if __name__ == "__main__":
    migrate_media()
