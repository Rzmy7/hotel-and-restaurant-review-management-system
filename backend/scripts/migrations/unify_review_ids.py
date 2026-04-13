import pyodbc
import sys
import os

# Add the project root to sys.path to import core modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.core.pyodbc_connection import get_connection_string

def migrate():
    connection_string = get_connection_string()
    
    with pyodbc.connect(connection_string) as conn:
        cursor = conn.cursor()
        
        print("--- Step 1: Dropping constraints ---")
        # 1. Drop Foreign Key from review_media
        fk_name = cursor.execute("""
            SELECT name FROM sys.foreign_keys 
            WHERE parent_object_id = OBJECT_ID('review_media')
        """).fetchval()
        if fk_name:
            print(f"Dropping FK {fk_name} on review_media...")
            cursor.execute(f"ALTER TABLE review_media DROP CONSTRAINT {fk_name}")

        # 2. Drop Primary Key from processed_review
        pk_name = cursor.execute("""
            SELECT name FROM sys.indexes 
            WHERE object_id = OBJECT_ID('processed_review') AND is_primary_key = 1
        """).fetchval()
        if pk_name:
            print(f"Dropping PK {pk_name} on processed_review...")
            cursor.execute(f"ALTER TABLE processed_review DROP CONSTRAINT {pk_name}")

        print("--- Step 2: Unifying IDs (Data Migration) ---")
        # Update review_media to use the scraper_review_id values
        # ONLY if scraper_review_id is a valid UUID string (checked by pattern)
        print("Updating review_media.review_id to match scraper_review_id (for UUIDs only)...")
        cursor.execute("""
            UPDATE rm 
            SET rm.review_id = CAST(pr.scraper_review_id AS UNIQUEIDENTIFIER)
            FROM review_media rm
            JOIN processed_review pr ON rm.review_id = pr.id
            WHERE pr.scraper_review_id LIKE '[0-9A-Fa-f]%-[0-9A-Fa-f]%-[0-9A-Fa-f]%-[0-9A-Fa-f]%-[0-9A-Fa-f]%'
        """)
        
        # Update processed_review.id to scraper_review_id
        print("Updating processed_review.id to match scraper_review_id (for UUIDs only)...")
        cursor.execute("""
            UPDATE processed_review 
            SET id = CAST(scraper_review_id AS UNIQUEIDENTIFIER)
            WHERE scraper_review_id LIKE '[0-9A-Fa-f]%-[0-9A-Fa-f]%-[0-9A-Fa-f]%-[0-9A-Fa-f]%-[0-9A-Fa-f]%'
        """)

        print("--- Step 3: Cleaning up and re-applying constraints ---")
        # 1. Drop scraper_review_id column
        print("Dropping scraper_review_id column...")
        cursor.execute("ALTER TABLE processed_review DROP COLUMN scraper_review_id")
        
        # 2. Re-add Primary Key to processed_review
        print("Adding PK to processed_review...")
        cursor.execute("ALTER TABLE processed_review ADD CONSTRAINT PK_processed_review PRIMARY KEY (id)")
        
        # 3. Re-add Foreign Key to review_media
        print("Adding FK to review_media...")
        cursor.execute("ALTER TABLE review_media ADD CONSTRAINT FK_review_media_processed_review FOREIGN KEY (review_id) REFERENCES processed_review(id) ON DELETE CASCADE")

        conn.commit()
    
    print("--- ID Unification Successful! ---")

if __name__ == "__main__":
    migrate()
