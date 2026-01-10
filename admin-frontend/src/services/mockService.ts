import type { DashboardStats, ChartDataPoint, User, Organization, OrganizationStats, FeatureFlag, AdminSettings } from '../types';

export const fetchDashboardStats = (): Promise<DashboardStats> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                totalOrganizations: 2847,
                organizationsGrowth: 12.5,
                totalUsers: 18392,
                usersGrowth: 8.2,
                activeHotels: 1245,
                hotelsGrowth: 5.4,
            });
        }, 600);
    });
};

export const fetchUsageData = (): Promise<ChartDataPoint[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                { label: 'Jan', value: 4200 },
                { label: 'Feb', value: 5000 },
                { label: 'Mar', value: 4800 },
                { label: 'Apr', value: 6500 },
                { label: 'May', value: 7200 },
                { label: 'Jun', value: 8100 },
                { label: 'Jul', value: 9500 },
                { label: 'Aug', value: 10200 },
                { label: 'Sep', value: 11800 },
                { label: 'Oct', value: 13500 },
                { label: 'Nov', value: 14800 },
                { label: 'Dec', value: 16900 },
            ]);
        }, 800);
    });
};

export const fetchReviewData = (): Promise<ChartDataPoint[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                { label: 'Beach Paradise', value: 85 },
                { label: 'City Suites', value: 92 },
                { label: 'Mountain Lodge', value: 78 },
                { label: 'Coastal Views', value: 88 },
                { label: 'Urban Inn', value: 65 },
            ]);
        }, 700);
    });
};

export const fetchCurrentUser = (): Promise<User> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                id: 'u1',
                name: 'Admin User',
                email: 'admin@company.com',
                role: 'Admin',
                status: 'Active'
            });
        }, 400);
    });
};

export const fetchOrgStats = (): Promise<OrganizationStats> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                total: 2847,
                active: 2634,
                pending: 213,
            });
        }, 500);
    });
};

export const fetchOrganizations = (): Promise<Organization[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                { id: '1', name: 'Acme Corporation', domain: 'acme.com', usersCount: 1247, status: 'Active' },
                { id: '2', name: 'TechStart Inc', domain: 'techstart.io', usersCount: 892, status: 'Active' },
                { id: '3', name: 'Global Enterprises', domain: 'globalent.com', usersCount: 2156, status: 'Active' },
                { id: '4', name: 'Innovate Labs', domain: 'innovatelabs.co', usersCount: 445, status: 'Pending' },
                { id: '5', name: 'Digital Solutions', domain: 'digitalsol.net', usersCount: 678, status: 'Active' },
                { id: '6', name: 'Smart Systems', domain: 'smartsys.com', usersCount: 234, status: 'Inactive' },
                { id: '7', name: 'Future Tech', domain: 'futuretech.io', usersCount: 1523, status: 'Active' },
                { id: '8', name: 'CloudBase Ltd', domain: 'cloudbase.co', usersCount: 967, status: 'Active' },
            ]);
        }, 700);
    });
};

export const fetchUsers = (): Promise<User[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                { id: '1', name: 'Sarah Johnson', email: 'sarah.johnson@company.com', role: 'Admin', status: 'Active', avatarColor: '#bfdbfe' },
                { id: '2', name: 'Michael Chen', email: 'michael.chen@company.com', role: 'Manager', status: 'Active', avatarColor: '#e9d5ff' },
                { id: '3', name: 'Emily Rodriguez', email: 'emily.rodriguez@company.com', role: 'User', status: 'Active', avatarColor: '#fed7aa' },
                { id: '4', name: 'David Kim', email: 'david.kim@company.com', role: 'User', status: 'Suspended', avatarColor: '#fecaca' },
                { id: '5', name: 'Jessica Taylor', email: 'jessica.taylor@company.com', role: 'Manager', status: 'Active', avatarColor: '#ddd6fe' },
                { id: '6', name: 'Robert Anderson', email: 'robert.anderson@company.com', role: 'User', status: 'Active', avatarColor: '#bbf7d0' },
                { id: '7', name: 'Maria Garcia', email: 'maria.garcia@company.com', role: 'Admin', status: 'Active', avatarColor: '#fde68a' },
                { id: '8', name: 'James Wilson', email: 'james.wilson@company.com', role: 'User', status: 'Suspended', avatarColor: '#99f6e4' },
            ]);
        }, 600);
    });
};

export const fetchFeatureFlags = (): Promise<FeatureFlag[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                { id: '1', name: 'Advanced Analytics Dashboard', key: 'analytics_dashboard_v2', description: 'Enable advanced analytics and reporting features for enterprise users', status: 'Enabled' },
                { id: '2', name: 'AI-Powered Recommendations', key: 'ai_recommendations', description: 'Show AI-generated recommendations in the user interface', status: 'Enabled' },
                { id: '3', name: 'Dark Mode', key: 'dark_mode_support', description: 'Allow users to switch between light and dark themes', status: 'Disabled' },
                { id: '4', name: 'Multi-Language Support', key: 'i18n_support', description: 'Enable internationalization and localization features', status: 'Enabled' },
                { id: '5', name: 'Real-time Collaboration', key: 'realtime_collab', description: 'Enable real-time collaborative editing and comments', status: 'Disabled' },
                { id: '6', name: 'Advanced Search Filters', key: 'advanced_search', description: 'Provide enhanced search capabilities with multiple filter options', status: 'Enabled' },
                { id: '7', name: 'Mobile App Integration', key: 'mobile_integration', description: 'Allow seamless integration with mobile applications', status: 'Disabled' },
                { id: '8', name: 'Two-Factor Authentication', key: '2fa_required', description: 'Require two-factor authentication for enhanced security', status: 'Enabled' },
                { id: '9', name: 'Export to PDF', key: 'pdf_export', description: 'Enable PDF export functionality for reports and documents', status: 'Enabled' },
                { id: '10', name: 'Beta Features Access', key: 'beta_features', description: 'Grant access to experimental and beta features', status: 'Disabled' },
                { id: '11', name: 'Custom Branding', key: 'custom_branding', description: 'Allow organizations to customize branding and colors', status: 'Enabled' },
                { id: '12', name: 'API Rate Limiting', key: 'api_rate_limiting', description: 'Implement rate limiting for API requests', status: 'Disabled' },
            ]);
        }, 600);
    });
};

export const fetchSettings = (): Promise<AdminSettings> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                platformName: 'AdminPanel Platform',
                timezone: '',
                language: '',
                dateFormat: 'MM/DD/YYYY',
                currency: 'USD ($)',
                maintenanceMode: false,
                twoFactorAuth: true,
                passwordStrength: 'Strong (Alpha-numeric + Special Char)',
                sessionTimeout: '30 Minutes',
                allowNewSignups: false,
                notifyNewReviews: true,
                notifyLowRating: true,
                notifyWeeklyDigest: false,
                notifyAiReply: true,
                notifySystemAlerts: true,
                notifyFeatureUpdates: false
            });
        }, 500);
    });
};
