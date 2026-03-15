"""
Single PYODBC connection-string helper.

Replaces the 4+ duplicate copies that were scattered across
test/main.py, test/api/review_api.py, test/api/admin_api.py,
and test/services/competitor_service.py.
"""

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
    )
