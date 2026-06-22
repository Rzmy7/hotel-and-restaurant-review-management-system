"""
Single PYODBC connection-string helper.

Replaces the 4+ duplicate copies that were scattered across
test/main.py, test/api/review_api.py, test/api/admin_api.py,
and test/services/competitor_service.py.
"""

from app.core.config import DB_DRIVER, DB_SERVER, DB_NAME, DB_UID, DB_PWD
import contextlib
import pyodbc
import time
import logging

logger = logging.getLogger(__name__)


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
    )


@contextlib.contextmanager
def get_raw_connection():
    """
    Return a database connection wrapped in contextlib.closing and auto-transaction management.
    Enforces a SQL Server lock timeout of 10 seconds.
    """
    conn = pyodbc.connect(get_connection_string())
    try:
        # Run database initialization query (lock timeout 10 seconds)
        cursor = conn.cursor()
        try:
            cursor.execute("SET LOCK_TIMEOUT 10000;")
        finally:
            cursor.close()
        
        with contextlib.closing(conn) as closed_conn:
            with closed_conn:
                yield closed_conn
    except Exception as e:
        try:
            conn.close()
        except Exception:
            pass
        raise e


def retry_on_deadlock(max_retries: int = 3, initial_backoff: float = 0.5):
    """
    Decorator to retry database operations if a SQL Server deadlock (error 1205) is encountered.
    Uses exponential backoff and logs to both python logging and a dedicated deadlocks.log file.
    """
    def decorator(func):
        import functools
        from datetime import datetime
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            backoff = initial_backoff
            for attempt in range(1, max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except pyodbc.Error as e:
                    error_msg = str(e)
                    is_deadlock = "1205" in error_msg or (len(e.args) > 1 and "1205" in str(e.args[1]))
                    
                    if is_deadlock:
                        # Log to a dedicated application deadlock log file
                        try:
                            with open("deadlocks.log", "a", encoding="utf-8") as f:
                                f.write(
                                    f"[{datetime.now().isoformat()}] DEADLOCK (1205) in '{func.__name__}' "
                                    f"(Attempt {attempt}/{max_retries}): {error_msg}\n"
                                )
                        except Exception:
                            pass
                        
                        if attempt < max_retries:
                            logger.warning(
                                f"[Deadlock Retry] Encountered SQL Server deadlock (1205) in function '{func.__name__}'. "
                                f"Attempt {attempt}/{max_retries}. Retrying in {backoff:.2f} seconds..."
                            )
                            time.sleep(backoff)
                            backoff *= 2
                        else:
                            raise
                    else:
                        raise
        return wrapper
    return decorator

