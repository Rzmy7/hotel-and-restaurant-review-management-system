import os
import sys

# Add the backend directory to sys.path
sys.path.append(os.getcwd())

import pyodbc
from app.core.pyodbc_connection import get_connection_string

def check_schema():
    try:
        conn = pyodbc.connect(get_connection_string())
        cursor = conn.cursor()
        cursor.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ProcessedReviews'")
        columns = [row[0] for row in cursor.fetchall()]
        print("Columns in ProcessedReviews:", columns)
        conn.close()
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    check_schema()
