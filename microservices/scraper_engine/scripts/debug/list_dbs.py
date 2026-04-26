import urllib.parse
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()


def get_engine():
    params = urllib.parse.quote_plus(
        f"DRIVER={{ODBC Driver 18 for SQL Server}};"
        f"SERVER={os.getenv('DB_SERVER')};"
        f"DATABASE=master;"  # Connect to master to list databases
        f"UID={os.getenv('DB_UID')};"
        f"PWD={os.getenv('DB_PWD')};"
        f"TrustServerCertificate=yes;"
    )
    conn_str = f"mssql+pyodbc:///?odbc_connect={params}"
    return create_engine(conn_str, echo=False)


def list_databases():
    engine = get_engine()
    with engine.connect() as conn:
        print("--- Databases on Server ---")
        result = conn.execute(
            text("SELECT name FROM sys.databases WHERE database_id > 4")
        )
        for row in result:
            print(f"DB: {row[0]}")


if __name__ == "__main__":
    list_databases()
