import type { DashboardStats, ChartDataPoint, User, Organization, OrganizationStats, FeatureFlag, AdminSettings, SystemAlert, RecentActivity } from '../types';

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
                totalReviews: 156789,
                reviewsGrowth: 15.3,
                activeUsersToday: 1247,
                systemUptime: 99.9,
                aiJobsProcessed: 45832,
                aiJobsGrowth: 22.8,
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
                { label: 'Google', value: 7 },
                { label: 'Booking.com', value: 5 },
                { label: 'TripAdvisor', value: 4 },
                { label: 'Expedia', value: 3 },
                { label: 'Hotels.com', value: 4 },
                { label: 'Agoda', value: 3 },
                { label: 'Yelp', value: 5 },
                { label: 'Trustpilot', value: 6 },
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
                { id: '9', name: 'NextGen Solutions', domain: 'nextgen.io', usersCount: 534, status: 'Active' },
                { id: '10', name: 'DataFlow Inc', domain: 'dataflow.com', usersCount: 789, status: 'Pending' },
                { id: '11', name: 'Quantum Labs', domain: 'quantumlabs.co', usersCount: 312, status: 'Active' },
                { id: '12', name: 'Peak Systems', domain: 'peaksys.net', usersCount: 456, status: 'Active' },
            ]);
        }, 700);
    });
};

export const fetchUsers = (): Promise<User[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                { id: '1', name: 'Sarah Johnson', email: 'sarah.johnson@company.com', role: 'Admin', status: 'Active', plan: 'Enterprise', avatarColor: '#bfdbfe', organizations: ['Acme Corp', 'TechStart', 'Global Solutions'], groups: ['Admins', 'Leadership', 'Security Team'] },
                { id: '2', name: 'Michael Chen', email: 'michael.chen@company.com', role: 'Manager', status: 'Active', plan: 'Pro', avatarColor: '#e9d5ff', organizations: ['TechStart', 'InnovateCo'], groups: ['Managers', 'Developers', 'Product Team'] },
                { id: '3', name: 'Emily Rodriguez', email: 'emily.rodriguez@company.com', role: 'User', status: 'Active', plan: 'Basic', avatarColor: '#fed7aa', organizations: ['Global Solutions'], groups: ['Developers', 'Mobile Team'] },
                { id: '4', name: 'David Kim', email: 'david.kim@company.com', role: 'User', status: 'Suspended', plan: 'Free', avatarColor: '#fecaca', organizations: ['Acme Corp'], groups: ['External Contractors'] },
                { id: '5', name: 'Jessica Taylor', email: 'jessica.taylor@company.com', role: 'Manager', status: 'Active', plan: 'Pro', avatarColor: '#ddd6fe', organizations: ['Global Solutions', 'CloudTech'], groups: ['Managers', 'Design Team', 'UX Research'] },
                { id: '6', name: 'Robert Anderson', email: 'robert.anderson@company.com', role: 'User', status: 'Active', plan: 'Basic', avatarColor: '#bbf7d0', organizations: ['InnovateCo'], groups: ['Developers', 'Backend Team'] },
                { id: '7', name: 'Maria Garcia', email: 'maria.garcia@company.com', role: 'Admin', status: 'Active', plan: 'Enterprise', avatarColor: '#fde68a', organizations: ['Acme Corp', 'Global Solutions'], groups: ['Admins', 'Leadership', 'Operations'] },
                { id: '8', name: 'James Wilson', email: 'james.wilson@company.com', role: 'User', status: 'Suspended', plan: 'Free', avatarColor: '#99f6e4', organizations: ['TechStart'], groups: ['Support Team'] },
                { id: '9', name: 'Linda Martinez', email: 'linda.martinez@company.com', role: 'Manager', status: 'Active', plan: 'Pro', avatarColor: '#c7d2fe', organizations: ['CloudTech', 'InnovateCo'], groups: ['Managers', 'Data Science', 'Analytics Team'] },
                { id: '10', name: 'Kevin Brown', email: 'kevin.brown@company.com', role: 'User', status: 'Active', plan: 'Basic', avatarColor: '#fca5a5', organizations: ['Acme Corp'], groups: ['Developers', 'Frontend Team', 'QA Team'] },
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

export const fetchSystemAlerts = (): Promise<SystemAlert[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                {
                    id: '1',
                    type: 'error',
                    title: 'Scraping Job Failed',
                    message: 'TripAdvisor scraper failed for Hotel Grand Plaza - Connection timeout',
                    timestamp: '2 hours ago',
                    isRead: false
                },
                {
                    id: '2',
                    type: 'warning',
                    title: 'High API Usage',
                    message: 'AI processing API usage at 85% of monthly limit',
                    timestamp: '5 hours ago',
                    isRead: false
                },
                {
                    id: '3',
                    type: 'warning',
                    title: 'Subscription Expiring',
                    message: '3 organizations have subscriptions expiring in 7 days',
                    timestamp: '1 day ago',
                    isRead: true
                },
                {
                    id: '4',
                    type: 'info',
                    title: 'System Maintenance',
                    message: 'Scheduled maintenance on Feb 20, 2026 at 02:00 UTC',
                    timestamp: '1 day ago',
                    isRead: true
                },
                {
                    id: '5',
                    type: 'error',
                    title: 'Database Connection Issue',
                    message: 'Intermittent connection issues detected with replica database',
                    timestamp: '3 hours ago',
                    isRead: false
                }
            ]);
        }, 500);
    });
};

export const fetchRecentActivity = (): Promise<RecentActivity[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                {
                    id: '1',
                    type: 'user_joined',
                    title: 'New User Registration',
                    description: 'Sarah Johnson joined Acme Hotels',
                    timestamp: '10 minutes ago',
                    user: 'Sarah Johnson'
                },
                {
                    id: '2',
                    type: 'scrape_completed',
                    title: 'Scraping Completed',
                    description: 'Booking.com scrape completed - 156 new reviews collected',
                    timestamp: '25 minutes ago'
                },
                {
                    id: '3',
                    type: 'org_created',
                    title: 'Organization Created',
                    description: 'New organization "Sunset Resort Group" created',
                    timestamp: '1 hour ago',
                    user: 'Mike Chen'
                },
                {
                    id: '4',
                    type: 'ai_job',
                    title: 'AI Processing Complete',
                    description: 'Sentiment analysis completed for 2,450 reviews',
                    timestamp: '2 hours ago'
                },
                {
                    id: '5',
                    type: 'subscription_changed',
                    title: 'Subscription Upgraded',
                    description: 'TechStart Inc upgraded to Enterprise plan',
                    timestamp: '3 hours ago',
                    user: 'David Kim'
                },
                {
                    id: '6',
                    type: 'scrape_failed',
                    title: 'Scraping Failed',
                    description: 'Agoda scraper rate limited - retry scheduled',
                    timestamp: '4 hours ago'
                },
                {
                    id: '7',
                    type: 'user_joined',
                    title: 'New User Registration',
                    description: 'Emily Rodriguez joined Global Enterprises',
                    timestamp: '5 hours ago',
                    user: 'Emily Rodriguez'
                },
                {
                    id: '8',
                    type: 'ai_job',
                    title: 'AI Response Generated',
                    description: 'Auto-generated 45 review responses for Hotel Marina',
                    timestamp: '6 hours ago'
                }
            ]);
        }, 600);
    });
};

export const fetchAiJobsData = (): Promise<ChartDataPoint[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                { label: 'Mon', value: 1250 },
                { label: 'Tue', value: 1890 },
                { label: 'Wed', value: 2100 },
                { label: 'Thu', value: 1780 },
                { label: 'Fri', value: 2340 },
                { label: 'Sat', value: 980 },
                { label: 'Sun', value: 750 }
            ]);
        }, 500);
    });
};

export const fetchScrapingStats = (): Promise<import('../types').ScrapingStats> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                activeJobs: 12,
                activeJobsChange: 2,
                completedToday: 1458,
                successRate: 98.5,
                failedJobs: 3,
                requiresAttention: true,
                reviewsIngested: 24500,
                reviewsChange: 12
            });
        }, 500);
    });
};

export const fetchScrapingPlatforms = (): Promise<import('../types').ScrapingPlatform[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                { id: '1', name: 'Booking.com', icon: 'B', color: '#003580', enabled: true, lastRun: '2h ago', status: 'active' },
                { id: '2', name: 'TripAdvisor', icon: 'T', color: '#00AF87', enabled: true, lastRun: '45m ago', status: 'active' },
                { id: '3', name: 'Agoda', icon: 'Ag', color: '#5E4B8B', enabled: false, lastRun: '', status: 'maintenance' }
            ]);
        }, 400);
    });
};

export const fetchScrapingJobs = (): Promise<import('../types').ScrapingJob[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                { id: '1', jobId: '#SCR-28492', platform: 'Booking.com', platformIcon: 'B', platformColor: '#003580', organization: 'Grand Hotel Budapest', status: 'Running', startTime: 'Today, 10:42 AM', duration: '12m 45s', reviews: null },
                { id: '2', jobId: '#SCR-28491', platform: 'TripAdvisor', platformIcon: 'T', platformColor: '#00AF87', organization: 'Seaside Resort & Spa', status: 'Completed', startTime: 'Today, 09:15 AM', duration: '4m 12s', reviews: 128 },
                { id: '3', jobId: '#SCR-28488', platform: 'Agoda', platformIcon: 'Ag', platformColor: '#5E4B8B', organization: 'Mountain View Lodge', status: 'Failed', startTime: 'Yesterday, 11:30 PM', duration: '0s', reviews: 0 },
                { id: '4', jobId: '#SCR-28485', platform: 'Booking.com', platformIcon: 'B', platformColor: '#003580', organization: 'City Center Boutique', status: 'Completed', startTime: 'Yesterday, 08:00 PM', duration: '8m 33s', reviews: 45 },
                { id: '5', jobId: '#SCR-28482', platform: 'TripAdvisor', platformIcon: 'T', platformColor: '#00AF87', organization: 'Blue Lagoon Hotel', status: 'Completed', startTime: 'Yesterday, 06:15 PM', duration: '5m 01s', reviews: 12 }
            ]);
        }, 600);
    });
};
