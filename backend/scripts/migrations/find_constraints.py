import pyodbc
import sys
import os

# Add the project root to sys.path to import core modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.core.pyodbc_connection import get_connection_string


def find_constraints():
    connection_string = get_connection_string()
    tables = ["processed_review", "review_media"]

    table_list = "'processed_review', 'review_media'"

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

    with pyodbc.connect(connection_string) as conn:
        cursor = conn.cursor()
        cursor.execute(query)
        print("--- Constraints Found ---")
        for row in cursor.fetchall():
            print(
                f"Table: {row.table_name}, Name: {row.constraint_name}, Type: {row.type}"
            )


if __name__ == "__main__":
    find_constraints()
