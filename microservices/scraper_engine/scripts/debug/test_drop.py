import urllib.parse
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

def get_engine():
    params = urllib.parse.quote_plus(
        f"DRIVER={{ODBC Driver 18 for SQL Server}};"
        f"SERVER={os.getenv('DB_SERVER')};"
        f"DATABASE={os.getenv('DB_NAME')};"
        f"UID={os.getenv('DB_UID')};"
        f"PWD={os.getenv('DB_PWD')};"
        f"TrustServerCertificate=yes;"
    )
    conn_str = f"mssql+pyodbc:///?odbc_connect={params}"
    return create_engine(conn_str, echo=False)

def test_drop():
    engine = get_engine()
    with engine.begin() as conn:
        print("Attempting to drop dbo.agoda_reviews...")
        try:
            conn.execute(text("DROP TABLE dbo.agoda_reviews"))
            print("SUCCESS")
        except Exception as e:
            print(f"FAILED: {e}")

if __name__ == "__main__":
    test_drop()
