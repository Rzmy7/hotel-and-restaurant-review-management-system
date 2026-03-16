from typing import Literal, Optional

from pydantic import BaseModel, Field


class DashboardStats(BaseModel):
    totalOrganizations: int
    totalUsers: int
    activeHotels: int
    organizationsGrowth: float
    usersGrowth: float
    hotelsGrowth: float
    totalReviews: int
    reviewsGrowth: float
    activeUsersToday: int
    systemUptime: float
    aiJobsProcessed: int
    aiJobsGrowth: float


class ChartDataPoint(BaseModel):
    label: str
    value: int


class SystemAlert(BaseModel):
    id: str
    type: Literal["error", "warning", "info"]
    title: str
    message: str
    timestamp: str
    isRead: bool


class RecentActivity(BaseModel):
    id: str
    type: Literal[
        "user_joined",
        "org_created",
        "scrape_completed",
        "scrape_failed",
        "subscription_changed",
        "ai_job",
    ]
    title: str
    description: str
    timestamp: str
    user: Optional[str] = None


class OrganizationSummary(BaseModel):
    id: str
    name: str
    domain: str
    usersCount: int
    status: Literal["Active", "Pending", "Inactive"]
    iconUrl: Optional[str] = None


class OrganizationStats(BaseModel):
    total: int
    active: int
    pending: int


class AdminUser(BaseModel):
    id: str
    name: str
    email: str
    role: Literal["Admin", "User"]
    status: Literal["Active", "Suspended"]
    plan: Optional[Literal["Free", "Basic", "Pro", "Enterprise"]] = None
    avatarColor: Optional[str] = None
    organizations: list[str] = Field(default_factory=list)
    groups: list[str] = Field(default_factory=list)


class UserStatsData(BaseModel):
    allActiveUsers: int
    todayActiveUsers: int
    todayRegistered: int


class AdminUserCreatePayload(BaseModel):
    name: str
    email: str
    role: Literal["Admin", "User"] = "User"
    status: Literal["Active", "Suspended"] = "Active"
    plan: Optional[Literal["Free", "Basic", "Pro", "Enterprise"]] = None
    organizations: list[str] = Field(default_factory=list)
    groups: list[str] = Field(default_factory=list)


class AdminUserUpdatePayload(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[Literal["Admin", "User"]] = None
    status: Optional[Literal["Active", "Suspended"]] = None
    plan: Optional[Literal["Free", "Basic", "Pro", "Enterprise"]] = None
    organizations: Optional[list[str]] = None
    groups: Optional[list[str]] = None


class DeleteUserResponse(BaseModel):
    status: str
    userId: str
