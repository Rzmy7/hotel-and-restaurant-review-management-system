async def validate_image(file):
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise ValueError("Only JPG and PNG images are allowed")

    file_bytes = await file.read()
    await file.seek(0)

    if len(file_bytes) > 2 * 1024 * 1024:
        raise ValueError("File size must be less than 2MB")

    return file_bytes