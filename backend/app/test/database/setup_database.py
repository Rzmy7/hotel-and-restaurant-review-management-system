"""
Database Setup Script
Automatically creates competitor tracking tables and inserts mock data
"""
import pyodbc
import os
from dotenv import load_dotenv

# Load environment variables - adjust path to .env file location
env_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', '.env')
load_dotenv(dotenv_path=env_path)

# Database connection
DB_CONNECTION_STRING = (
    f"DRIVER={{{os.getenv('DB_DRIVER', 'ODBC Driver 18 for SQL Server')}}};"
    f"SERVER={os.getenv('DB_SERVER')};"
    f"DATABASE={os.getenv('DB_NAME')};"
    f"UID={os.getenv('DB_UID')};"
    f"PWD={os.getenv('DB_PWD')};"
    "TrustServerCertificate=yes;"
)

def read_sql_file(filename):
    """Read SQL file content"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    filepath = os.path.join(script_dir, 'schema', filename)
    
    with open(filepath, 'r', encoding='utf-8') as file:
        return file.read()

def execute_sql_script(cursor, sql_script, script_name):
    """Execute SQL script by splitting on semicolons"""
    print(f"\n{'='*60}")
    print(f"Executing: {script_name}")
    print(f"{'='*60}")
    
    # Remove comments and split by semicolons
    lines = []
    for line in sql_script.split('\n'):
        stripped = line.strip()
        # Skip comment lines and GO statements
        if stripped.startswith('--') or stripped.upper() == 'GO':
            continue
        # Remove inline comments
        if '--' in line:
            line = line[:line.index('--')]
        lines.append(line)
    
    # Rejoin and split by semicolon
    cleaned_sql = '\n'.join(lines)
    statements = cleaned_sql.split(';')
    
    # Execute each statement
    success_count = 0
    for i, statement in enumerate(statements, 1):
        statement = statement.strip()
        
        # Skip empty statements
        if not statement:
            continue
        
        try:
            cursor.execute(statement)
            
            # Show preview of what was executed
            preview = statement[:60].replace('\n', ' ').replace('  ', ' ')
            
            # For INSERT INTO Hotels, fetch the inserted IDs for verification
            if 'INSERT INTO Hotels' in statement:
                cursor.commit()  # Commit immediately after hotel inserts
                cursor.execute("SELECT @@IDENTITY AS last_id")
                last_id = cursor.fetchone()[0]
                print(f"✓ Statement {i}: {preview}... [hotel_id: {last_id}]")
            else:
                cursor.commit()
                print(f"✓ Statement {i}: {preview}...")
            
            success_count += 1
            
        except Exception as e:
            error_msg = str(e)
            # Ignore "object already exists" errors
            if "already an object" in error_msg.lower() or "already exists" in error_msg.lower():
                print(f"⚠ Statement {i}: Object already exists (skipping)")
                success_count += 1  # Count as success
            else:
                print(f"✗ Statement {i} failed: {e}")
                preview = statement[:150].replace('\n', ' ').replace('  ', ' ')
                print(f"   SQL: {preview}...")
                
                # Try to fetch current hotel IDs for debugging
                try:
                    cursor.execute("SELECT hotel_id, name FROM Hotels")
                    hotels = cursor.fetchall()
                    print(f"\n   Current hotels in DB:")
                    for hotel in hotels:
                        print(f"     - ID: {hotel[0]}, Name: {hotel[1]}")
                except:
                    pass
                
                raise
    
    print(f"\n✓ {script_name} completed: {success_count} statements executed")
    return success_count

def main():
    """Main setup function"""
    print("\n" + "="*60)
    print("DATABASE SETUP - Competitor Tracking System")
    print("="*60)
    
    try:
        # Connect to database
        print("\n1. Connecting to database...")
        print(f"   Server: {os.getenv('DB_SERVER')}")
        print(f"   Database: {os.getenv('DB_NAME')}")
        
        conn = pyodbc.connect(DB_CONNECTION_STRING)
        cursor = conn.cursor()
        print("   ✓ Connected successfully!")
        
        # Step 1: Create tables
        print("\n2. Creating database tables...")
        schema_sql = read_sql_file('competitor_schema.sql')
        execute_sql_script(cursor, schema_sql, 'competitor_schema.sql')
        
        # Step 2: Insert mock data
        print("\n3. Inserting mock competitor data...")
        insert_sql = read_sql_file('insert_mock_competitors.sql')
        execute_sql_script(cursor, insert_sql, 'insert_mock_competitors.sql')
        
        # Step 3: Verify setup
        print("\n4. Verifying database setup...")
        
        # Check table counts
        verification_queries = [
            ("Hotels", "SELECT COUNT(*) FROM Hotels"),
            ("HotelMetrics", "SELECT COUNT(*) FROM HotelMetrics"),
            ("HotelCategoryScores", "SELECT COUNT(*) FROM HotelCategoryScores"),
            ("HotelTrendData", "SELECT COUNT(*) FROM HotelTrendData"),
            ("HotelSentimentDistribution", "SELECT COUNT(*) FROM HotelSentimentDistribution"),
        ]
        
        print("\nTable Record Counts:")
        print("-" * 50)
        for table_name, query in verification_queries:
            cursor.execute(query)
            count = cursor.fetchone()[0]
            print(f"   {table_name:30s}: {count:4d} records")
        
        # Show sample hotels
        print("\n5. Sample Hotels:")
        print("-" * 50)
        cursor.execute("""
            SELECT hotel_id, name, is_my_hotel, is_tracked, location 
            FROM Hotels 
            ORDER BY is_my_hotel DESC, is_tracked DESC
        """)
        
        for row in cursor.fetchall():
            hotel_type = "YOUR HOTEL" if row[2] else ("TRACKED" if row[3] else "AVAILABLE")
            print(f"   [{hotel_type:10s}] ID: {row[0]:2d} | {row[1]:30s} | {row[4]}")
        
        # Close connection
        cursor.close()
        conn.close()
        
        print("\n" + "="*60)
        print("✓ DATABASE SETUP COMPLETED SUCCESSFULLY!")
        print("="*60)
        print("\nNext steps:")
        print("1. Make sure your FastAPI server is running (python main.py)")
        print("2. Refresh your frontend application")
        print("3. Navigate to the Competitors page")
        print("\n")
        
    except pyodbc.Error as e:
        print(f"\n✗ Database Error: {e}")
        return False
    except FileNotFoundError as e:
        print(f"\n✗ File Error: {e}")
        print("   Make sure SQL files exist in the 'schema' folder")
        return False
    except Exception as e:
        print(f"\n✗ Unexpected Error: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
