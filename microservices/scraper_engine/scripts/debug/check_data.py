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

def check_data():
    engine = get_engine()
    with engine.connect() as conn:
        print("--- Table: sources ---")
        result = conn.execute(text("SELECT COUNT(*) FROM sources")).scalar()
        print(f"Row count: {result}")
        
        print("\n--- Table: reviews ---")
        result = conn.execute(text("SELECT COUNT(*) FROM reviews")).scalar()
        print(f"Row count: {result}")

if __name__ == "__main__":
    check_data()
