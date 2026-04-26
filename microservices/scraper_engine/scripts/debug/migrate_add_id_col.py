import sys
import os
import urllib.parse
from sqlalchemy import create_engine, text

# Add the parent directory to sys.path to allow importing from core
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from core.config import config


def add_column():
    params = urllib.parse.quote_plus(
        f"DRIVER={{{config.db_driver}}};"
        f"SERVER={config.db_server};"
        f"DATABASE={config.db_name};"
        f"UID={config.db_uid};"
        f"PWD={config.db_pwd};"
        f"TrustServerCertificate={config.trust_server_certificate};"
    )
    conn_str = f"mssql+pyodbc:///?odbc_connect={params}"
    engine = create_engine(conn_str)

    with engine.connect() as conn:
        print("Checking if platform_review_id exists in reviews table...")
        try:
            # SQL Server syntax for adding column
            conn.execute(
                text("ALTER TABLE reviews ADD platform_review_id NVARCHAR(255) NULL")
            )
            conn.commit()
            print("Successfully added platform_review_id to reviews table.")
        except Exception as e:
            print(
                f"Note: Could not add column (it might already exist or table missing): {e}"
            )

        print("Creating index IX_reviews_platform_id...")
        try:
            conn.execute(
                text(
                    "CREATE INDEX IX_reviews_platform_id ON reviews (source_id, platform_review_id)"
                )
            )
            conn.commit()
            print("Successfully created index IX_reviews_platform_id.")
        except Exception as e:
            print(f"Note: Could not create index: {e}")


if __name__ == "__main__":
    add_column()
