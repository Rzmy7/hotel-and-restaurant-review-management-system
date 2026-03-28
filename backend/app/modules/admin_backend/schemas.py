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
    plan: Optional[str] = None
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
    password: Optional[str] = Field(default=None, min_length=8, max_length=72)
    plan: Optional[str] = None
    organizations: list[str] = Field(default_factory=list)
    groups: list[str] = Field(default_factory=list)


class AdminUserUpdatePayload(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[Literal["Admin", "User"]] = None
    status: Optional[Literal["Active", "Suspended"]] = None
    plan: Optional[str] = None
    organizations: Optional[list[str]] = None
    groups: Optional[list[str]] = None


class DeleteUserResponse(BaseModel):
    status: str
    userId: str


# ── Subscription plan schemas ─────────────────────────────────────


class SubscriptionFeature(BaseModel):
    id: str
    key: str
    name: str
    description: str | None = None
    supportsLimit: bool


class SubscriptionPlanFeatureState(SubscriptionFeature):
    enabled: bool
    limit: int | None = None


class SubscriptionPlan(BaseModel):
    id: str
    name: str
    description: str
    monthlyPrice: float
    annualPrice: float
    currency: str
    isPopular: bool
    isActive: bool
    color: str
    iconName: Literal["zap", "star", "crown", "building"]
    features: list[SubscriptionPlanFeatureState] = Field(default_factory=list)


class SubscriptionPlanFeatureUpsertPayload(BaseModel):
    featureId: str
    enabled: bool
    limit: int | None = Field(default=None, ge=0)


class SubscriptionPlanUpsertPayload(BaseModel):
    name: str
    description: str = ""
    monthlyPrice: float = Field(default=0.0, ge=0)
    annualPrice: float = Field(default=0.0, ge=0)
    currency: str = Field(default="USD", min_length=1, max_length=16)
    isPopular: bool = False
    isActive: bool = True
    color: str = Field(default="from-blue-500 to-blue-600", min_length=1, max_length=100)
    iconName: Literal["zap", "star", "crown", "building"] = "star"
    features: list[SubscriptionPlanFeatureUpsertPayload] = Field(default_factory=list)


class DeleteSubscriptionPlanResponse(BaseModel):
    status: str
    planId: str


class SubscriptionFeatureUsage(BaseModel):
    id: str
    key: str
    name: str
    enabled: bool
    used: int
    limit: int | None = None
    balance: int | None = None


class SubscriptionUsageSummary(BaseModel):
    userId: str
    planId: str | None = None
    planName: str | None = None
    features: list[SubscriptionFeatureUsage] = Field(default_factory=list)


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


# ── Settings schemas ───────────────────────────────────────────────


class GeneralSettingsResponse(BaseModel):
    timezone: str
    language: str
    dateFormat: str
    currency: str


class GeneralSettingsPayload(BaseModel):
    timezone: str = Field(..., min_length=1, max_length=100)
    language: str = Field(..., min_length=1, max_length=32)
    dateFormat: str = Field(..., min_length=1, max_length=64)
    currency: str = Field(..., min_length=1, max_length=64)


class ReplyGenerationSettingsResponse(BaseModel):
    googleApiKey: str
    claudeApiKey: str
    selectedModel: str
    similarReviewsCount: int
    googleRequestCount: int
    claudeRequestCount: int
    googleTokenUsage: int
    claudeTokenUsage: int
    useEmbeddingRules: bool
    useSimilarReviews: bool


class ReplyGenerationSettingsPayload(BaseModel):
    googleApiKey: str = Field(default="", max_length=512)
    claudeApiKey: str = Field(default="", max_length=512)
    selectedModel: str = Field(default="gemini-2.5-flash-lite", min_length=1, max_length=128)
    similarReviewsCount: int = Field(default=3, ge=1, le=20)
    useEmbeddingRules: bool = True
    useSimilarReviews: bool = True


class ReplyGenerationApiTestPayload(BaseModel):
    provider: Literal["google", "claude"]
    apiKey: str = Field(..., min_length=1, max_length=512)
    model: str | None = Field(default=None, min_length=1, max_length=128)


class ReplyGenerationApiTestResponse(BaseModel):
    provider: Literal["google", "claude"]
    success: bool
    message: str


class FeatureFlagResponse(BaseModel):
    id: str
    key: str
    name: str
    description: str
    status: Literal["Enabled", "Disabled"]
    limit: int | None = None


class FeatureFlagUpdatePayload(BaseModel):
    status: Literal["Enabled", "Disabled"]
    limit: int | None = Field(default=None, ge=1, le=100)


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
