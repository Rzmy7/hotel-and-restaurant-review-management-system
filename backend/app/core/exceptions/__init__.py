"""
Standardized exceptions for the application.
"""

from .custom_exceptions import (
    AppException,
    EntityNotFoundException,
    PermissionDeniedException,
    ValidationException,
    FileValidationException,
    register_exception_handlers,
)
