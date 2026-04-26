import sys
import os

# Add root directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from core.database import init_db, get_engine
from sqlalchemy import text


def test_connection():
    print("Testing MSSQL Connection...")
    try:
        engine = get_engine()
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            print("Connection successful! Database is reachable.")

        print("Initializing tables...")
        init_db()
        print("Success: Tables are ready.")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    test_connection()
