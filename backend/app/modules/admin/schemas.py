"""
Pydantic schemas for the admin_backend module.

Migrated from admin-backend/app/models.py and inline schemas in the routers.
"""

from typing import Literal, Optional

from pydantic import BaseModel, Field, EmailStr


# ── Dashboard schemas ───────────────────────────────────────────────


class DashboardStats(BaseModel):
    totalOrganizations: int
    organizationsAddedToday: int
    organizationsGrowth: float
    addedTodayGrowth: float
    totalUsers: int
    usersGrowth: float
    totalReviews: int
    reviewsCollectedToday: int
    reviewsGrowth: float
    activeUsersToday: int
    systemUptime: float
    processedReviews: int
    processedReviewsGrowth: float


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


class PaginatedAlerts(BaseModel):
    data: list[SystemAlert]
    total: int
    page: int
    limit: int


class RecentActivity(BaseModel):
    id: str
    type: Literal[
        "user_joined",
        "org_created",
        "scrape_completed",
        "scrape_failed",
        "subscription_changed",
        "ai_job",
        "settings_updated",
        "broadcast_sent",
        "maintenance_toggled",
        "user_deleted",
        "org_deleted",
        "embeddings_triggered",
    ]
    title: str
    description: str
    timestamp: str
    user: Optional[str] = None


class PaginatedActivities(BaseModel):
    data: list[RecentActivity]
    total: int
    page: int
    limit: int


# ── Organization schemas ────────────────────────────────────────────


class OrganizationSummary(BaseModel):
    id: str
    name: str
    owner: str
    usersCount: int
    iconUrl: Optional[str] = None


class PaginatedOrganizations(BaseModel):
    data: list[OrganizationSummary]
    total: int
    page: int
    limit: int


class OrganizationStats(BaseModel):
    total: int
    addedToday: int


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


class PaginatedUsers(BaseModel):
    data: list[AdminUser]
    total: int
    page: int
    limit: int


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
    supportsLimit: bool


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
    baseUrl: str | None = None
    fetchingType: str | None = "SCRAPING"
    enabled: bool = True
    tableName: str | None = None  # Stored in review_table column; table created in scraper backend
    attributes: list[ScrapingTableAttributePayload] = Field(default_factory=list)


class ScrapingPlatformUpdatePayload(BaseModel):
    name: str
    baseUrl: str | None = None
    fetchingType: str | None = None
    enabled: bool = True
    tableName: str | None = None  # Updated in review_table column; new table created in scraper backend if changed
    attributes: list[ScrapingTableAttributePayload] = Field(default_factory=list)


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


class SecuritySettingsResponse(BaseModel):
    userSessionTimeoutMinutes: int
    adminSessionTimeoutMinutes: int
    requireTwoFactorAuth: bool


class SecuritySettingsPayload(BaseModel):
    userSessionTimeoutMinutes: int = Field(..., ge=5, le=10080)  # 5 min to 7 days
    adminSessionTimeoutMinutes: int = Field(..., ge=5, le=10080)
    requireTwoFactorAuth: bool = False


class AdminProfileResponse(BaseModel):
    name: str
    email: EmailStr


class AdminProfileUpdatePayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: Optional[EmailStr] = None


class AdminPasswordChangePayload(BaseModel):
    currentPassword: str = Field(..., min_length=1, max_length=72)
    newPassword: str = Field(..., min_length=8, max_length=72)


class AdminPasswordChangeResponse(BaseModel):
    message: str


class ReplyGenerationSettingsResponse(BaseModel):
    similarReviewsCount: int
    replyRequestCount: int
    useEmbeddingRules: bool
    useSimilarReviews: bool


class ReplyGenerationSettingsPayload(BaseModel):
    similarReviewsCount: int = Field(default=3, ge=1, le=20)
    useEmbeddingRules: bool = True
    useSimilarReviews: bool = True



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


# ── Review processing schemas ──────────────────────────────────────


class ReviewProcessingStatsResponse(BaseModel):
    activeJobs: int = 0
    activeJobsChange: int = 0
    completedToday: int = 0
    successRate: float = 0.0
    failedJobs: int = 0
    reviewsProcessed: int = 0
    reviewsChange: float = 0.0
    pendingReviews: int = 0
    isPaused: bool = False


class ReviewProcessingJobResponse(BaseModel):
    id: str
    jobId: str
    platform: str
    platformIcon: str
    platformColor: str
    organization: str
    status: str
    startTime: str
    duration: str
    reviewsProcessed: int | None = None
    totalReviews: int | None = None



# ── Batch config schemas ───────────────────────────────────────────


class BatchConfigResponse(BaseModel):
    batch_size: int
    min: int
    max: int
    default: int
    parallel_batches: int
    parallel_min: int
    parallel_max: int
    parallel_default: int


class BatchConfigUpdatePayload(BaseModel):
    batch_size: int = Field(..., ge=1, le=20, description="Number of reviews per LLM batch (1–20)")
    parallel_batches: int = Field(..., ge=1, le=10, description="Number of parallel batches running concurrently (1–10)")



# ── LLM Gateway schemas ────────────────────────────────────────────


class LLMModelCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    endpoint: str = Field(..., min_length=1, max_length=500)
    model_name: str = Field(..., min_length=1, max_length=200)
    api_key: str = Field(..., min_length=1, max_length=2048)
    max_tokens: int = Field(default=4096, ge=1, le=128000)


class LLMModelUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    endpoint: str | None = Field(default=None, min_length=1, max_length=500)
    model_name: str | None = Field(default=None, min_length=1, max_length=200)
    api_key: str | None = Field(default=None, min_length=1, max_length=2048)
    max_tokens: int | None = Field(default=None, ge=1, le=128000)


class LLMModelResponse(BaseModel):
    id: str
    name: str
    endpoint: str
    model_name: str
    api_key_masked: str
    max_tokens: int
    # Registration state (soft delete), NOT connectivity — see last_test_status.
    is_active: bool
    created_at: str
    updated_at: str
    # Result of the most recent connectivity test:
    # untested | ok | auth_error | quota_error | model_error | unreachable | error
    last_test_status: str = "untested"
    last_test_message: str | None = None
    last_tested_at: str | None = None


class LLMModelTestPayload(BaseModel):
    endpoint: str = Field(..., min_length=1, max_length=500)
    model_name: str = Field(..., min_length=1, max_length=200)
    api_key: str | None = Field(default=None, max_length=2048)
    max_tokens: int = Field(default=4096, ge=1, le=128000)
    model_id: str | None = None


class LLMModelTestResponse(BaseModel):
    success: bool
    message: str
    status: str = "error"


class LLMAssignmentsResponse(BaseModel):
    review_processing_model_id: str | None = None
    reply_generation_model_id: str | None = None
    insights_model_id: str | None = None
    competitor_analysis_model_id: str | None = None
    rule_extraction_model_id: str | None = None
    review_processing_model_name: str | None = None
    reply_generation_model_name: str | None = None
    insights_model_name: str | None = None
    competitor_analysis_model_name: str | None = None
    rule_extraction_model_name: str | None = None


class LLMAssignmentsUpdate(BaseModel):
    review_processing_model_id: str | None = None
    reply_generation_model_id: str | None = None
    insights_model_id: str | None = None
    competitor_analysis_model_id: str | None = None
    rule_extraction_model_id: str | None = None


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


# ── Scheduler schemas ───────────────────────────────────────────────


class SchedulerSettingsResponse(BaseModel):
    reviewProcessingIntervalMinutes: int
    deduplicationIntervalMinutes: int


class SchedulerSettingsPayload(BaseModel):
    reviewProcessingIntervalMinutes: int = Field(..., ge=1, le=1440)  # 1 min to 24 hours
    deduplicationIntervalMinutes: int = Field(..., ge=1, le=1440)
