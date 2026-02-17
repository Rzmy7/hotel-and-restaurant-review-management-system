import pyodbc
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection details
DB_DRIVER = os.getenv("DB_DRIVER", "ODBC Driver 18 for SQL Server")
DB_SERVER = os.getenv("DB_SERVER", "178.128.84.124")
DB_NAME = os.getenv("DB_NAME", "BookingScraper")
DB_UID = os.getenv("DB_UID", "SA")
DB_PWD = os.getenv("DB_PWD", "MyStr0ngP@ssw0rd")

def update_hotel_name():
    """Update the hotel name from ReviewHub Grand Hotel NYC to Grand Plaza Hotel"""
    try:
        # Create connection string
        conn_str = (
            f"DRIVER={{{DB_DRIVER}}};"
            f"SERVER={DB_SERVER};"
            f"DATABASE={DB_NAME};"
            f"UID={DB_UID};"
            f"PWD={DB_PWD};"
            "TrustServerCertificate=yes;"
        )
        
        # Connect to database
        print("Connecting to database...")
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        # Update hotel name
        update_query = """
        UPDATE Hotels
        SET name = 'Grand Plaza Hotel'
        WHERE is_my_hotel = 1
        """
        
        print("Updating hotel name...")
        cursor.execute(update_query)
        conn.commit()
        
        # Verify the update
        cursor.execute("SELECT hotel_id, name, location FROM Hotels WHERE is_my_hotel = 1")
        result = cursor.fetchone()
        
        if result:
            print(f"\n✅ Successfully updated!")
            print(f"   Hotel ID: {result[0]}")
            print(f"   Name: {result[1]}")
            print(f"   Location: {result[2]}")
        else:
            print("❌ No hotel found with is_my_hotel = 1")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error updating hotel name: {e}")

if __name__ == "__main__":
    update_hotel_name()
