import os
import sys

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from core.database import get_engine


def migrate():
    print("Starting TripAdvisor schema migration...")

    engine = get_engine()
    with engine.connect() as conn:
        try:
            # Check and add columns one by one to avoid errors if they exist
            columns_to_add = [
                "contribution_count INTEGER",
                "rating_value NUMERIC(3, 1)",
                "rating_service NUMERIC(3, 1)",
                "rating_location NUMERIC(3, 1)",
                "rating_cleanliness NUMERIC(3, 1)",
                "rating_rooms NUMERIC(3, 1)",
                "rating_sleep_quality NUMERIC(3, 1)",
                "rating_food NUMERIC(3, 1)",
                "rating_atmosphere NUMERIC(3, 1)",
            ]

            for col_def in columns_to_add:
                col_name = col_def.split()[0]
                try:
                    conn.execute(text(f"ALTER TABLE tripadvisor_reviews ADD {col_def}"))
                    print(f"Added column {col_name}")
                except Exception as inner_e:
                    # Column might already exist, log and continue
                    print(f"Skipping {col_name} (might already exist): {inner_e}")

            conn.commit()
            print("Migration completed successfully.")
        except Exception as e:
            print(f"Migration failed: {e}")
            conn.rollback()
        finally:
            db.close()


if __name__ == "__main__":
    migrate()
