import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.core.pyodbc_connection import get_connection_string
from app.modules.dashboard.services.categories_service import get_category_performance
import pyodbc
import pprint

try:
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()
    
    # Get organization with most reviews in last 365 days
    cursor.execute("""
        SELECT TOP 1 s.organization_id, COUNT(*)
        FROM dbo.processed_review r
        JOIN dbo.source s ON s.source_id = r.source_id
        GROUP BY s.organization_id
        ORDER BY COUNT(*) DESC
    """)
    row = cursor.fetchone()
    if row:
        org_id = row[0]
        cnt = row[1]
        print(f"Testing for org: {org_id} (has {cnt} reviews)")
        
        # To get more data, let's pass a larger period 
        res365 = get_category_performance(cursor, org_id, 365)
        print("Period 365:")
        pprint.pprint(res365)
    else:
        print("No organizations found with reviews.")

except Exception as e:
    print(f"Error: {e}")
