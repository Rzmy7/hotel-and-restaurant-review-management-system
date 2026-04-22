import sys
import os

# Add the project root to sys.path to import core modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from core.database import get_engine
from sqlalchemy import text

def find_constraints():
    engine = get_engine()
    # List tables as a string for the query
    table_list = "'reviews', 'agoda_reviews', 'booking_reviews', 'google_reviews', 'tripadvisor_reviews', 'review_media'"
    
    query = f"""
    SELECT 
        tp.name AS table_name,
        fk.name AS constraint_name,
        'FK' AS type
    FROM sys.foreign_keys AS fk
    INNER JOIN sys.tables AS tp ON fk.parent_object_id = tp.object_id
    WHERE tp.name IN ({table_list})
    UNION ALL
    SELECT 
        t.name AS table_name,
        pk.name AS constraint_name,
        'PK' AS type
    FROM sys.indexes AS pk
    INNER JOIN sys.tables AS t ON pk.object_id = t.object_id
    WHERE pk.is_primary_key = 1 AND t.name IN ({table_list})
    """
    
    with engine.connect() as conn:
        result = conn.execute(text(query))
        print("--- Constraints Found ---")
        for row in result:
            print(f"Table: {row.table_name}, Name: {row.constraint_name}, Type: {row.type}")

if __name__ == "__main__":
    find_constraints()
