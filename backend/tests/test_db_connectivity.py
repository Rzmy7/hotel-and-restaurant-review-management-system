"""
Integration test to verify database connectivity.
Tests both Raw PyODBC (for reviews/dashboard) and SQLAlchemy (for auth/users).
"""

import sys
import os

# Ensure we can import from 'app'
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pyodbc
from sqlalchemy import text
from app.core.pyodbc_connection import get_connection_string
from app.core.database import SessionLocal, engine


def test_raw_pyodbc():
    print("Checking Raw PyODBC Connection...")
    cs = get_connection_string()
    try:
        conn = pyodbc.connect(cs)
        print("✓ Raw PyODBC: SUCCESS")
        conn.close()
        return True
    except Exception as e:
        print(f"✗ Raw PyODBC: FAILED - {e}")
        return False


def test_sqlalchemy():
    print("Checking SQLAlchemy ORM Connection...")
    if SessionLocal is None:
        print("✗ SQLAlchemy: FAILED - SessionLocal is None (DATABASE_URL missing)")
        return False

    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1 AS ok"))
            val = result.fetchone()[0]
            if val == 1:
                print("✓ SQLAlchemy: SUCCESS")
                return True
            else:
                print(f"✗ SQLAlchemy: FAILED - Unexpected result: {val}")
                return False
    except Exception as e:
        print(f"✗ SQLAlchemy: FAILED - {e}")
        return False


if __name__ == "__main__":
    print("=== Database Connectivity Test ===\n")
    raw_ok = test_raw_pyodbc()
    sql_ok = test_sqlalchemy()
    print("\n" + "=" * 34)
    if raw_ok and sql_ok:
        print("OVERALL STATUS: SUCCESS")
        sys.exit(0)
    else:
        print("OVERALL STATUS: FAILED")
        sys.exit(1)
