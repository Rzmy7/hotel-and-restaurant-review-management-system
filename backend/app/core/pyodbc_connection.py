"""
Single PYODBC connection-string helper.

Replaces the 4+ duplicate copies that were scattered across
test/main.py, test/api/review_api.py, test/api/admin_api.py,
and test/services/competitor_service.py.
"""

import time
import pyodbc
from app.core.config import DB_DRIVER, DB_SERVER, DB_NAME, DB_UID, DB_PWD


def get_connection_string() -> str:
    """Return a fully-formed PYODBC connection string."""
    return (
        f"DRIVER={{{DB_DRIVER}}};"
        f"SERVER={DB_SERVER};"
        f"DATABASE={DB_NAME};"
        f"UID={DB_UID};"
        f"PWD={DB_PWD};"
        "TrustServerCertificate=yes;"
        "Encrypt=no;"
        "ConnectRetryCount=3;"
        "ConnectRetryInterval=2;"
    )


def connect_db(max_retries: int = 3, retry_delay: float = 1.5) -> pyodbc.Connection:
    """
    Open a pyodbc connection with automatic retry on transient errors (10054, 10060).
    Use this instead of pyodbc.connect() directly so dropped connections are retried.
    """
    last_exc = None
    for attempt in range(max_retries):
        try:
            return pyodbc.connect(get_connection_string())
        except pyodbc.OperationalError as e:
            last_exc = e
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
    raise last_exc
