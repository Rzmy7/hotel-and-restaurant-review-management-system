import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.core.pyodbc_connection import get_connection_string
import pyodbc

try:
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()
    
    org_id = "HOTEL-001" # Let's assume HOTEL-001 for now, or just check without org_id
    
    # Just check globally for last 30 days
    cursor.execute("""
        SELECT COUNT(*)
        FROM dbo.processed_review r
        WHERE r.reviewDate >= DATEADD(DAY, -30, CAST(GETDATE() AS DATE))
          AND r.reviewDate < DATEADD(DAY, 0, CAST(GETDATE() AS DATE))
    """)
    last_30_days = cursor.fetchone()[0]
    print(f"Reviews in last 30 days: {last_30_days}")
    
    cursor.execute("""
        SELECT COUNT(*)
        FROM dbo.processed_review r
        WHERE r.reviewDate >= '2026-01-01'
    """)
    this_year = cursor.fetchone()[0]
    print(f"Reviews in 2026: {this_year}")

except Exception as e:
    print(f"Error: {e}")
