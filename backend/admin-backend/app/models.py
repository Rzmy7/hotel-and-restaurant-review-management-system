from typing import Literal, Optional

from pydantic import BaseModel


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
