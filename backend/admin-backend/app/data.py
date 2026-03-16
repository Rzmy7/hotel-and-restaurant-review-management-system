from app.models import ChartDataPoint, DashboardStats, RecentActivity, SystemAlert


DASHBOARD_STATS = DashboardStats(
    totalOrganizations=2847,
    organizationsGrowth=12.5,
    totalUsers=18392,
    usersGrowth=8.2,
    activeHotels=1245,
    hotelsGrowth=5.4,
    totalReviews=156789,
    reviewsGrowth=15.3,
    activeUsersToday=1247,
    systemUptime=99.9,
    aiJobsProcessed=45832,
    aiJobsGrowth=22.8,
)


USAGE_DATA = [
    ChartDataPoint(label="Jan", value=4200),
    ChartDataPoint(label="Feb", value=5000),
    ChartDataPoint(label="Mar", value=4800),
    ChartDataPoint(label="Apr", value=6500),
    ChartDataPoint(label="May", value=7200),
    ChartDataPoint(label="Jun", value=8100),
    ChartDataPoint(label="Jul", value=9500),
    ChartDataPoint(label="Aug", value=10200),
    ChartDataPoint(label="Sep", value=11800),
    ChartDataPoint(label="Oct", value=13500),
    ChartDataPoint(label="Nov", value=14800),
    ChartDataPoint(label="Dec", value=16900),
]


REVIEW_DATA = [
    ChartDataPoint(label="Google", value=7),
    ChartDataPoint(label="Booking.com", value=5),
    ChartDataPoint(label="TripAdvisor", value=4),
    ChartDataPoint(label="Expedia", value=3),
    ChartDataPoint(label="Hotels.com", value=4),
    ChartDataPoint(label="Agoda", value=3),
    ChartDataPoint(label="Yelp", value=5),
    ChartDataPoint(label="Trustpilot", value=6),
]


SYSTEM_ALERTS = [
    SystemAlert(
        id="1",
        type="error",
        title="Scraping Job Failed",
        message="TripAdvisor scraper failed for Hotel Grand Plaza - Connection timeout",
        timestamp="2 hours ago",
        isRead=False,
    ),
    SystemAlert(
        id="2",
        type="warning",
        title="High API Usage",
        message="AI processing API usage at 85% of monthly limit",
        timestamp="5 hours ago",
        isRead=False,
    ),
    SystemAlert(
        id="3",
        type="warning",
        title="Subscription Expiring",
        message="3 organizations have subscriptions expiring in 7 days",
        timestamp="1 day ago",
        isRead=True,
    ),
    SystemAlert(
        id="4",
        type="info",
        title="System Maintenance",
        message="Scheduled maintenance on Feb 20, 2026 at 02:00 UTC",
        timestamp="1 day ago",
        isRead=True,
    ),
]


RECENT_ACTIVITY = [
    RecentActivity(
        id="1",
        type="user_joined",
        title="New User Registration",
        description="Sarah Johnson joined Acme Hotels",
        timestamp="10 minutes ago",
        user="Sarah Johnson",
    ),
    RecentActivity(
        id="2",
        type="scrape_completed",
        title="Scraping Completed",
        description="Booking.com scrape completed - 156 new reviews collected",
        timestamp="25 minutes ago",
    ),
    RecentActivity(
        id="3",
        type="org_created",
        title="Organization Created",
        description="New organization 'Sunset Resort Group' created",
        timestamp="1 hour ago",
        user="Mike Chen",
    ),
    RecentActivity(
        id="4",
        type="ai_job",
        title="AI Processing Complete",
        description="Sentiment analysis completed for 2,450 reviews",
        timestamp="2 hours ago",
    ),
    RecentActivity(
        id="5",
        type="subscription_changed",
        title="Subscription Upgraded",
        description="TechStart Inc upgraded to Enterprise plan",
        timestamp="3 hours ago",
        user="David Kim",
    ),
    RecentActivity(
        id="6",
        type="scrape_failed",
        title="Scraping Failed",
        description="Agoda scraper rate limited - retry scheduled",
        timestamp="4 hours ago",
    ),
]
