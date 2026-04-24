"""Pydantic schemas for the groups API."""

from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime


class GroupSettings(BaseModel):
    can_members_invite: bool = False
    show_members_to_members: bool = True
    show_analytics_to_members: bool = False


class GroupCreate(BaseModel):
    group_name: str
    description: Optional[str] = None
    is_private: bool = True
    settings: Optional[GroupSettings] = None


class GroupUpdate(BaseModel):
    group_name: Optional[str] = None
    description: Optional[str] = None
    is_private: Optional[bool] = None


class InviteCreate(BaseModel):
    organization_id: str
    message: Optional[str] = None


class MemberResponse(BaseModel):
    user_id: str
    first_name: Optional[str]
    last_name: Optional[str]
    email: str
    profile_image_url: Optional[str]
    role: str
    joined_at: str


class InviteResponse(BaseModel):
    invite_id: str
    group_id: str
    group_name: Optional[str]
    invited_by_name: Optional[str]
    invited_user_id: Optional[str]
    invited_user_name: Optional[str]
    invited_user_email: Optional[str]
    invite_type: str
    status: str
    message: Optional[str]
    expires_at: Optional[str]
    created_at: str


class GroupResponse(BaseModel):
    group_id: str
    group_name: str
    description: Optional[str]
    avatar_url: Optional[str]
    is_private: bool
    settings: GroupSettings
    has_invite_link: bool
    invite_link_token: Optional[str]
    created_by: str
    created_at: str
    member_count: int
    my_role: str


class GroupAnalytics(BaseModel):
    member_count: int
    total_reviews: int
    avg_rating: Optional[float]
    positive_count: int
    negative_count: int
    neutral_count: int
    invite_stats: dict
    recent_members: List[dict]
    member_orgs: List[dict]
    reviews_over_time: List[dict]
    rating_distribution: List[dict]
