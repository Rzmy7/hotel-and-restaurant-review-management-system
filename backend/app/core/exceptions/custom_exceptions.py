"""
Custom application exceptions for standardized error handling.
"""

from typing import Any, Dict, Optional
from fastapi import HTTPException


class AppException(Exception):
    """Base class for all application-specific exceptions."""
    def __init__(
        self, 
        message: str, 
        status_code: int = 500, 
        error_code: str = "INTERNAL_ERROR",
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details
        super().__init__(message)


class EntityNotFoundException(AppException):
    """Raised when a requested resource is not found."""
    def __init__(self, entity: str, identifier: Any):
        super().__init__(
            message=f"{entity} with identifier {identifier} not found.",
            status_code=404,
            error_code="NOT_FOUND"
        )


class PermissionDeniedException(AppException):
    """Raised when a user lacks permission for an action."""
    def __init__(self, detail: str = "Permission denied."):
        super().__init__(
            message=detail,
            status_code=403,
            error_code="FORBIDDEN"
        )


class ValidationException(AppException):
    """Raised when data validation fails."""
    def __init__(self, details: Dict[str, Any]):
        super().__init__(
            message="Data validation failed.",
            status_code=400,
            error_code="VALIDATION_ERROR",
            details=details
        )


class FileValidationException(HTTPException):
    """Legacy exception for file validation."""
    def __init__(self, detail: str):
        super().__init__(status_code=400, detail=detail)
