from pydantic import BaseModel
from typing import Optional


class ProfileResponse(BaseModel):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    email: str
    phone: Optional[str] = None
    jobTitle: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    avatar: Optional[str] = None
    is_email_notifications_enabled: Optional[bool] = None
    is_new_review_alerts_enabled: Optional[bool] = None
    is_weekly_summary_enabled: Optional[bool] = None
    is_group_invitations_enabled: Optional[bool] = None
    is_subscription_changes_enabled: Optional[bool] = None
    joinedDate: Optional[str] = None


class ProfileUpdate(BaseModel):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    phone: Optional[str] = None
    jobTitle: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    is_email_notifications_enabled: Optional[bool] = None
    is_new_review_alerts_enabled: Optional[bool] = None
    is_weekly_summary_enabled: Optional[bool] = None
    is_group_invitations_enabled: Optional[bool] = None
    is_subscription_changes_enabled: Optional[bool] = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: Optional[str] = None


class TwoFactorVerifyRequest(BaseModel):
    code: str

