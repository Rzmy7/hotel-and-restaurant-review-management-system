import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.core.pyodbc_connection import get_connection_string
import pyodbc

conn = pyodbc.connect(get_connection_string())
cursor = conn.cursor()
cursor.execute("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='group_hotels'")
print('group_hotels cols:', [(r.COLUMN_NAME, r.DATA_TYPE) for r in cursor.fetchall()])
conn.close()
