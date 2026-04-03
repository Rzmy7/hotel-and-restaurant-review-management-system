export interface DashboardStats {
    totalOrganizations: number;
    organizationsAddedToday: number;
    organizationsGrowth: number;
    addedTodayGrowth: number;
    totalUsers: number;
    usersGrowth: number;
    totalReviews: number;
    reviewsGrowth: number;
    activeUsersToday: number;
    reviewsCollectedToday: number;
    systemUptime: number;
    aiJobsProcessed: number;
    aiJobsGrowth: number;
}

export interface ChartDataPoint {
    label: string;
    value: number;
}

export interface SystemAlert {
    id: string;
    type: 'error' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: string;
    isRead: boolean;
}

export interface RecentActivity {
    id: string;
    type: 'user_joined' | 'org_created' | 'scrape_completed' | 'scrape_failed' | 'subscription_changed' | 'ai_job';
    title: string;
    description: string;
    timestamp: string;
    user?: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: 'Admin' | 'User';
    status: 'Active' | 'Suspended';
    plan?: string;
    avatarColor?: string;
    organizations?: string[]; // List of organization names
    groups?: string[]; // List of group names
}

export interface NavItem {
    label: string;
    path: string;
    icon: React.ComponentType;
}

export interface Organization {
    id: string;
    name: string;
    owner: string;
    usersCount: number;
    iconUrl?: string;
}

export interface OrgSource {
    organization_source_id: number;
    source_id: number;
    platform_name: string;
    external_url: string | null;
    last_synced_at: string | null;
}

export interface AvailableSource {
    source_id: number;
    platform_name: string;
    base_url: string;
}

export interface OrganizationStats {
    total: number;
    addedToday: number;
}

export interface FeatureFlag {
    id: string;
    key: string;
    name: string;
    description: string;
    status: 'Enabled' | 'Disabled';
    limit?: number;
}

export interface AdminSettings {
    timezone: string;
    language: string;
    dateFormat: string;
    currency: string;
    maintenanceMode: boolean;
    twoFactorAuth: boolean;
    passwordStrength: string;
    sessionTimeout: string;
    allowNewSignups: boolean;
    notifyApiLimitReaching: boolean;
    notifyServerOverloading: boolean;
    notifyServerConnectionFailed: boolean;
    notifyScrapingFailures: boolean;
}

export interface ScrapingStats {
    activeJobs: number;
    activeJobsChange: number;
    completedToday: number;
    successRate: number;
    failedJobs: number;
    requiresAttention: boolean;
    reviewsIngested: number;
    reviewsChange: number;
}

export interface ScrapingPlatform {
    id: string;
    name: string;
    icon: string;
    color: string;
    enabled: boolean;
    lastRun: string;
    status: 'active' | 'maintenance';
}

export interface ScrapingJob {
    id: string;
    jobId: string;
    platform: string;
    platformIcon: string;
    platformColor: string;
    organization: string;
    status: 'Running' | 'Completed' | 'Failed';
    startTime: string;
    duration: string;
    reviews: number | null;
}

export interface ServerStatus {
    id: string;
    name: string;
    status: 'Online' | 'Offline' | 'Warning';
    cpuUsage: number;
    ramUsage: number;
    icon: any; // LucideIcon type
    uptime?: string;
}
