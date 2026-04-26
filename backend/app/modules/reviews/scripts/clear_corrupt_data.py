import pyodbc
import sys
import os

# Add parent directory to path to import app core
sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

from app.core.pyodbc_connection import get_connection_string


def clear_data():
    conn_str = get_connection_string()
    print(f"Connecting to: {conn_str}")

    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()

        print("Clearing processed_review table...")
        # We use DELETE because TRUNCATE might fail if there are foreign keys
        cursor.execute("DELETE FROM dbo.review_media")
        cursor.execute("DELETE FROM dbo.processed_review")

        conn.commit()
        print("Successfully cleared all review data.")
        conn.close()
    except Exception as e:
        print(f"FAILED to clear data: {e}")
        sys.exit(1)


if __name__ == "__main__":
    clear_data()
