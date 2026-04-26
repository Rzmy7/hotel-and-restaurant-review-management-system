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
        "agoda_reviews",
        "booking_reviews",
        "google_reviews",
        "tripadvisor_reviews",
        "review_media",
        "review_embeddings",
        "reviews",
        "organization_sources",
        "organizations",
        "sources",
        "audit_log",
    ]

    with engine.begin() as conn:
        print("Starting aggressive table cleanup with engine.begin()...")
        # Disable constraints temporarily if needed, though order should work
        for table in tables_to_drop:
            try:
                # Drop without dbo prefix first, then with it if it fails
                conn.execute(text(f"DROP TABLE IF EXISTS {table}"))
                print(f"Dropped {table}")
            except Exception as e:
                print(f"Failed to drop {table}: {e}")
                try:
                    conn.execute(text(f"DROP TABLE IF EXISTS dbo.{table}"))
                    print(f"Dropped dbo.{table}")
                except Exception as e2:
                    print(f"Failed to drop dbo.{table}: {e2}")

    print("Cleanup phase finished.")


if __name__ == "__main__":
    drop_tables()
