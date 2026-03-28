from pydantic import BaseModel, EmailStr
from typing import Optional


# -----------------------------
# Signup Request
# -----------------------------
class SignupRequest(BaseModel):
    
    name: str
    email: EmailStr
    password: str


# -----------------------------
# Login Request
# -----------------------------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# -----------------------------
# User Response
# -----------------------------
class UserResponse(BaseModel):
    user_id: str
    email: EmailStr
    first_name: Optional[str]
    last_name: Optional[str]
    role: Optional[str]

    class Config:
        from_attributes = True