import sys
import os
from sqlalchemy import text

# Add root directory to path to reach `core` 
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from core.database import init_db, get_engine
from platforms.booking.models import BookingHotel, BookingReview, BookingReviewImage

def test_booking_db_connection():
    print("\n[TEST] Testing MSSQL Connection for Booking ORMs...")
    try:
        engine = get_engine()
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            print("[TEST] Connection successful! Database is reachable.")
            
        print("[TEST] Initializing Booking tables...")
        # Since core.database imports globally, init_db will scan all imported Base models.
        # Ensure platforms.booking.models is imported above so it registers.
        init_db()
        print("[TEST] Success: Booking SQL Tables initialized/verified.")
    except Exception as e:
        print(f"Failed to connect or initialize Booking DB: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_booking_db_connection()
