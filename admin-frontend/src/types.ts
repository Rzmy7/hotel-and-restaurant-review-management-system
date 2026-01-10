export interface DashboardStats {
    totalOrganizations: number;
    totalUsers: number;
    activeHotels: number;
    organizationsGrowth: number;
    usersGrowth: number;
    hotelsGrowth: number;
}

export interface ChartDataPoint {
    label: string;
    value: number;
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: 'Admin' | 'User' | 'Manager';
    status: 'Active' | 'Suspended';
    avatarColor?: string;
}

export interface NavItem {
    label: string;
    path: string;
    icon: React.ComponentType;
}

export interface Organization {
    id: string;
    name: string;
    domain: string;
    usersCount: number;
    status: 'Active' | 'Pending' | 'Inactive';
    iconUrl?: string;
}

export interface OrganizationStats {
    total: number;
    active: number;
    pending: number;
}

export interface FeatureFlag {
    id: string;
    key: string;
    name: string;
    description: string;
    status: 'Enabled' | 'Disabled';
}

export interface AdminSettings {
    platformName: string;
    timezone: string;
    language: string;
    dateFormat: string;
    currency: string;
    maintenanceMode: boolean;
    twoFactorAuth: boolean;
    passwordStrength: string;
    sessionTimeout: string;
    allowNewSignups: boolean;
    notifyNewReviews: boolean;
    notifyLowRating: boolean;
    notifyWeeklyDigest: boolean;
    notifyAiReply: boolean;
    notifySystemAlerts: boolean;
    notifyFeatureUpdates: boolean;
}
