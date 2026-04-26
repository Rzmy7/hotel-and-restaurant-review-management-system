import logging
import sys
import time
import functools
from typing import Any, Callable
from pythonjsonlogger import jsonlogger

def setup_logging():
    """Sets up standardized logging for the application."""
    logger = logging.getLogger()
    log_handler = logging.StreamHandler(sys.stdout)
    
    # Use JSON formatting in production (or if configured), otherwise human-readable
    # For now, let's stick to a clean, readable format that's also informative
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    log_handler.setFormatter(formatter)
    logger.addHandler(log_handler)
    logger.setLevel(logging.INFO)
    
    # Suppress verbose logs from third-party libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

def log_execution_time(logger: logging.Logger):
    """Decorator to log the execution time of a function."""
    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.perf_counter()
            try:
                result = func(*args, **kwargs)
                end_time = time.perf_counter()
                execution_time = (end_time - start_time) * 1000
                logger.info(f"Method {func.__name__} executed in {execution_time:.2f}ms")
                return result
            except Exception as e:
                end_time = time.perf_counter()
                execution_time = (end_time - start_time) * 1000
                logger.error(f"Method {func.__name__} failed after {execution_time:.2f}ms with error: {str(e)}")
                raise
        return wrapper
    return decorator
