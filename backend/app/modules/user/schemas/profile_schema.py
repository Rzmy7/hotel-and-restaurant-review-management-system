from pydantic import BaseModel
from typing import Optional


class ProfileResponse(BaseModel):
    firstName: Optional[str]
    lastName: Optional[str]
    email: str
    phone: Optional[str]
    jobTitle: Optional[str]
    bio: Optional[str]
    location: Optional[str]
    avatar: Optional[str]
    joinedDate: Optional[str]


class ProfileUpdate(BaseModel):
    firstName: Optional[str]
    lastName: Optional[str]
    phone: Optional[str]
    jobTitle: Optional[str]
    bio: Optional[str]
    location: Optional[str]


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: Optional[str] = None


class TwoFactorVerifyRequest(BaseModel):
    code: str

