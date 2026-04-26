import urllib.parse
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()


def get_engine():
    params = urllib.parse.quote_plus(
        # Note: I'm using DATABASE={os.getenv('DB_NAME')} from .env
        f"DRIVER={{ODBC Driver 18 for SQL Server}};"
        f"SERVER={os.getenv('DB_SERVER')};"
        f"DATABASE={os.getenv('DB_NAME')};"
        f"UID={os.getenv('DB_UID')};"
        f"PWD={os.getenv('DB_PWD')};"
        f"TrustServerCertificate=yes;"
    )
    conn_str = f"mssql+pyodbc:///?odbc_connect={params}"
    return create_engine(conn_str, echo=False)


def check_context():
    engine = get_engine()
    with engine.connect() as conn:
        db = conn.execute(text("SELECT DB_NAME()")).scalar()
        schema = conn.execute(text("SELECT SCHEMA_NAME()")).scalar()
        user = conn.execute(text("SELECT SYSTEM_USER")).scalar()
        print(f"Connected to DB: {db}")
        print(f"Current Schema: {schema}")
        print(f"System User: {user}")

        print("\n--- Listing all tables in this DB ---")
        result = conn.execute(
            text(
                "SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'"
            )
        )
        for row in result:
            print(f"{row[0]}.{row[1]}")


if __name__ == "__main__":
    check_context()
