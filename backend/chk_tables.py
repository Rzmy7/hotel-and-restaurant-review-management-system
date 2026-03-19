import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.core.pyodbc_connection import get_connection_string
import pyodbc

conn = pyodbc.connect(get_connection_string())
cursor = conn.cursor()
cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'")
tables = [row.TABLE_NAME for row in cursor.fetchall()]
print('Tables in DB:', tables)
conn.close()
