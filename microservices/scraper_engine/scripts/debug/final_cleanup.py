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

def final_cleanup():
    engine = get_engine()
    # Comprehensive list of tables to drop
    tables = [
        'agoda_reviews', 'booking_reviews', 'google_reviews', 'tripadvisor_reviews',
        'review_media', 'review_embeddings', 'organization_review_stats',
        'reviews', 'organization_sources', 'organizations', 'sources', 'audit_log'
    ]
    
    with engine.begin() as conn:
        print("--- Final Cleanup ---")
        for table in tables:
            try:
                # Drop both with and without dbo prefix
                conn.execute(text(f"DROP TABLE IF EXISTS dbo.{table}"))
                conn.execute(text(f"DROP TABLE IF EXISTS {table}"))
                print(f"Cleared {table}")
            except Exception as e:
                print(f"Error on {table}: {e}")
        
        print("\n--- Remaining Tables ---")
        result = conn.execute(text("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'"))
        for row in result:
            print(f"Still exists: {row[0]}")

if __name__ == "__main__":
    final_cleanup()
