"""
Pydantic schemas for the admin_backend module.

Migrated from admin-backend/app/models.py and inline schemas in the routers.
"""

from typing import Literal, Optional

from pydantic import BaseModel, Field


# ── Dashboard schemas ───────────────────────────────────────────────


class DashboardStats(BaseModel):
    totalOrganizations: int
    totalUsers: int
    activeHotels: int
    organizationsGrowth: float
    usersGrowth: float
    hotelsGrowth: float
    totalReviews: int
    reviewsCollectedToday: int
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


# ── Organization schemas ────────────────────────────────────────────


class OrganizationSummary(BaseModel):
    id: str
    name: str
    owner: str
    usersCount: int
    status: Literal["Active", "Pending", "Inactive"]
    iconUrl: Optional[str] = None


class OrganizationStats(BaseModel):
    total: int
    active: int
    pending: int


class OrganizationUpdatePayload(BaseModel):
    name: str


class OrgSourcesUpdateItem(BaseModel):
    source_id: int
    external_url: str | None = None


class OrgSourcesUpdatePayload(BaseModel):
    sources: list[OrgSourcesUpdateItem]


# ── User schemas ────────────────────────────────────────────────────


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


# ── Monitoring / scraping schemas ───────────────────────────────────


class ScrapingTableAttributePayload(BaseModel):
    name: str
    type: str
    nullable: bool = True


class ScrapingPlatformCreatePayload(BaseModel):
    name: str
    tableName: str
    attributes: list[ScrapingTableAttributePayload]
    baseUrl: str | None = None
    enabled: bool = True


class ScrapingPlatformUpdatePayload(BaseModel):
    name: str
    tableName: str
    attributes: list[ScrapingTableAttributePayload]
    baseUrl: str | None = None
    enabled: bool = True


# ── Broadcasting schemas ────────────────────────────────────────────


class BroadcastCreate(BaseModel):
    subject: str = Field(..., min_length=1, max_length=120)
    body: str = Field(..., min_length=1, max_length=5000)
    channel: Literal["email", "notification", "both"]
    audienceType: Literal["all", "role", "plan"]
    audienceValue: Optional[str] = None
    messageType: Literal["info", "warning", "maintenance", "announcement"]
    scheduleType: Literal["now", "scheduled"]
    scheduledAt: Optional[str] = None


class EstimatedRecipientsResponse(BaseModel):
    count: int


class StatisticsResponse(BaseModel):
    total: int
    sent: int
    scheduled: int
    failed: int
