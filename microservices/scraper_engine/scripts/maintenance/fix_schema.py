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

def drop_tables():
    engine = get_engine()
    tables_to_drop = [
        'agoda_reviews', 
        'booking_reviews', 
        'google_reviews', 
        'tripadvisor_reviews',
        'review_media',
        'reviews', 
        'organization_sources',
        'organizations', 
        'sources', 
        'audit_log'
    ]
    
    with engine.connect() as conn:
        print("Starting table cleanup...")
        for table in tables_to_drop:
            try:
                # Use cascade-like approach for SQL Server: drop foreign keys first? 
                # Or just drop in order.
                conn.execute(text(f"DROP TABLE IF EXISTS {table}"))
                print(f"Dropped {table} (if it existed)")
            except Exception as e:
                print(f"Failed to drop {table}: {e}")
        conn.commit()
    print("Cleanup complete. Restart uvicorn to recreate tables.")

if __name__ == "__main__":
    confirm = input("This will DELETE ALL DATA in ScraperEngine database tables. Continue? (y/n): ")
    if confirm.lower() == 'y':
        drop_tables()
    else:
        print("Aborted.")
