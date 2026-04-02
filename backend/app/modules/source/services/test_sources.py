from __future__ import annotations
import json

import pyodbc

from app.core.pyodbc_connection import get_connection_string


def get_all_platform():
    try:
        conn = pyodbc.connect(get_connection_string())
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM Platforms")
        rows = cursor.fetchall()
        return rows
    except Exception as e:
        print(f"Database Error: {e}")
        raise e
