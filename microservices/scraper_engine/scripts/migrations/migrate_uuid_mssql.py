import sys
import os
import uuid
from sqlalchemy import text
from sqlalchemy.orm import Session

# Add the project root to sys.path to import core modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from core.database import get_engine, get_session


def migrate():
    engine = get_engine()

    # Detail tables that have a foreign key to reviews.review_id
    detail_tables = [
        "agoda_reviews",
        "booking_reviews",
        "google_reviews",
        "tripadvisor_reviews",
        "review_media",
    ]
    all_tables = ["reviews"] + detail_tables

    print("--- Step 1: Adding temporary UUID columns (if not exist) ---")
    sys.stdout.flush()
    with engine.begin() as conn:
        for table in all_tables:
            # Check if column exists
            check_col = conn.execute(text(f"""
                SELECT 1 FROM sys.columns 
                WHERE name = 'review_uuid' AND object_id = OBJECT_ID('{table}')
            """)).scalar()

            if not check_col:
                print(f"Adding review_uuid to {table}...")
                sys.stdout.flush()
                conn.execute(
                    text(f"ALTER TABLE {table} ADD review_uuid VARCHAR(36) NULL")
                )
            else:
                print(f"review_uuid already exists in {table}.")
                sys.stdout.flush()

    print("--- Step 2: Generating and mapping UUIDs (Bulk) ---")
    sys.stdout.flush()
    with engine.begin() as conn:
        # 1. Generate UUIDs for all reviews that don't have one
        print("Generating UUIDs for reviews table...")
        sys.stdout.flush()
        conn.execute(text("""
            UPDATE reviews 
            SET review_uuid = LOWER(CAST(NEWID() AS VARCHAR(36)))
            WHERE review_uuid IS NULL
        """))

        # 2. Map those UUIDs to all detail tables
        for table in detail_tables:
            print(f"Mapping UUIDs to {table}...")
            sys.stdout.flush()
            conn.execute(text(f"""
                UPDATE d 
                SET d.review_uuid = r.review_uuid 
                FROM {table} d
                JOIN reviews r ON d.review_id = r.review_id
                WHERE d.review_uuid IS NULL
            """))

    print("UUID mapping complete.")
    sys.stdout.flush()

    print("--- Step 3: Dropping constraints and indices ---")
    sys.stdout.flush()
    with engine.begin() as conn:
        # 1. Drop Foreign Keys
        for table in detail_tables:
            res = conn.execute(text(f"""
                SELECT name FROM sys.foreign_keys 
                WHERE parent_object_id = OBJECT_ID('{table}')
            """)).all()
            for row in res:
                print(f"Dropping FK {row.name} on {table}...")
                sys.stdout.flush()
                conn.execute(text(f"ALTER TABLE {table} DROP CONSTRAINT {row.name}"))

        # 2. Drop Indices (including PKs and other indices)
        for table in all_tables:
            res = conn.execute(text(f"""
                SELECT i.name 
                FROM sys.indexes i
                INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
                INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
                WHERE i.object_id = OBJECT_ID('{table}') AND c.name = 'review_id'
            """)).all()
            for row in res:
                # Check if it's a constraint (like PK) or just an index
                is_pk = conn.execute(
                    text(
                        f"SELECT is_primary_key FROM sys.indexes WHERE name = '{row.name}' AND object_id = OBJECT_ID('{table}')"
                    )
                ).scalar()
                if is_pk:
                    print(f"Dropping PK constraint {row.name} on {table}...")
                    sys.stdout.flush()
                    conn.execute(
                        text(f"ALTER TABLE {table} DROP CONSTRAINT {row.name}")
                    )
                else:
                    print(f"Dropping index {row.name} on {table}...")
                    sys.stdout.flush()
                    conn.execute(text(f"DROP INDEX {row.name} ON {table}"))

        print("--- Step 4: Swapping columns ---")
        sys.stdout.flush()
        for table in all_tables:
            # Check if old review_id still exists
            check_old = conn.execute(text(f"""
                SELECT 1 FROM sys.columns 
                WHERE name = 'review_id' AND object_id = OBJECT_ID('{table}')
            """)).scalar()

            if check_old:
                print(f"Cleaning up old review_id and setting up new one in {table}...")
                sys.stdout.flush()
                conn.execute(text(f"ALTER TABLE {table} DROP COLUMN review_id"))
                conn.execute(
                    text(f"EXEC sp_rename '{table}.review_uuid', 'review_id', 'COLUMN'")
                )
                conn.execute(
                    text(
                        f"ALTER TABLE {table} ALTER COLUMN review_id UNIQUEIDENTIFIER NOT NULL"
                    )
                )
            else:
                print(f"review_id already swapped in {table}.")
                sys.stdout.flush()

        print("--- Step 5: Re-applying constraints ---")
        sys.stdout.flush()
        # 1. Re-add Primary Key on reviews
        print("Adding PK to reviews...")
        sys.stdout.flush()
        conn.execute(
            text(
                "ALTER TABLE reviews ADD CONSTRAINT PK_reviews PRIMARY KEY (review_id)"
            )
        )

        # 2. Re-add Primary Keys and Foreign Keys for detail tables
        for table in detail_tables:
            if table == "review_media":
                print(f"Adding FK to {table}...")
                sys.stdout.flush()
                conn.execute(
                    text(
                        f"ALTER TABLE {table} ADD CONSTRAINT FK_{table}_reviews FOREIGN KEY (review_id) REFERENCES reviews(review_id) ON DELETE CASCADE"
                    )
                )
            else:
                print(f"Adding PK and FK to {table}...")
                sys.stdout.flush()
                conn.execute(
                    text(
                        f"ALTER TABLE {table} ADD CONSTRAINT PK_{table} PRIMARY KEY (review_id)"
                    )
                )
                conn.execute(
                    text(
                        f"ALTER TABLE {table} ADD CONSTRAINT FK_{table}_reviews FOREIGN KEY (review_id) REFERENCES reviews(review_id) ON DELETE CASCADE"
                    )
                )

    print("--- Migration Successful! ---")
    sys.stdout.flush()


if __name__ == "__main__":
    migrate()
