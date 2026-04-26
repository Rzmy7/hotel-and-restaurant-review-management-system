"""
File Validation Module
Provides utilities for validating uploaded files (size, type, etc.).
"""

from fastapi import UploadFile


async def validate_image(file: UploadFile) -> bytes:
    """
    Validates that an uploaded file is an image of acceptable type and size.
    
    Args:
        file: The UploadFile object from FastAPI.
        
    Returns:
        The file bytes if validation passes.
        
    Raises:
        ValueError: If the file type is not supported or the file is too large.
    """
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise ValueError("Only JPG and PNG images are allowed")

    file_bytes = await file.read()
    
    # Reset file pointer so other functions can read it again if needed
    await file.seek(0)

    # Limit file size to 2MB
    if len(file_bytes) > 2 * 1024 * 1024:
        raise ValueError("File size must be less than 2MB")

    return file_bytes
