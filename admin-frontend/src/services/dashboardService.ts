import { apiClient } from '../api/client';
import type { DashboardStats, ChartDataPoint, SystemAlert, PaginatedAlerts, RecentActivity, PaginatedActivities } from '../types';

/**
 * Fetch overall dashboard statistics.
 * Backend: GET /api/admin/dashboard/stats → DashboardStats
 */
export const fetchDashboardStats = (): Promise<DashboardStats> => {
    return apiClient.get<DashboardStats>('/admin/dashboard/stats');
};

/**
 * Fetch monthly review-usage trend data for the Usage chart.
 * Backend: GET /api/admin/dashboard/usage → ChartDataPoint[]
 */
export const fetchUsageData = (): Promise<ChartDataPoint[]> => {
    return apiClient.get<ChartDataPoint[]>('/admin/dashboard/usage');
};

/**
 * Fetch per-platform review breakdown for the Reviews chart.
 * Backend: GET /api/admin/dashboard/reviews → ChartDataPoint[]
 */
export const fetchReviewData = (): Promise<ChartDataPoint[]> => {
    return apiClient.get<ChartDataPoint[]>('/admin/dashboard/reviews');
};

/**
 * Fetch active system alerts for the Alerts panel.
 * Backend: GET /api/admin/dashboard/alerts → SystemAlert[]
 */
export const fetchSystemAlerts = (): Promise<SystemAlert[]> => {
    return apiClient.get<SystemAlert[]>('/admin/dashboard/alerts');
};

/**
 * Fetch paginated system alerts for the Alerts modal.
 * Backend: GET /api/admin/dashboard/alerts/paginated?page=1&limit=10 → PaginatedAlerts
 */
export const fetchPaginatedAlerts = (page: number = 1, limit: number = 10): Promise<PaginatedAlerts> => {
    return apiClient.get<PaginatedAlerts>(`/admin/dashboard/alerts/paginated?page=${page}&limit=${limit}`);
};

/**
 * Fetch recent platform activity for the Activity feed.
 * Backend: GET /api/admin/dashboard/activities → RecentActivity[]
 */
export const fetchRecentActivity = (): Promise<RecentActivity[]> => {
    return apiClient.get<RecentActivity[]>('/admin/dashboard/activities');
};

/**
 * Fetch paginated platform activity for the Activity feed modal.
 * Backend: GET /api/admin/dashboard/activities/paginated?page=1&limit=10 → PaginatedActivities
 */
export const fetchPaginatedActivity = (page: number = 1, limit: number = 10): Promise<PaginatedActivities> => {
    return apiClient.get<PaginatedActivities>(`/admin/dashboard/activities/paginated?page=${page}&limit=${limit}`);
};

/**
 * Dismiss a single system alert.
 * Backend: POST /api/admin/dashboard/alerts/:id/dismiss
 */
export const dismissAlert = (alertId: string): Promise<void> => {
    return apiClient.post<void>(`/admin/dashboard/alerts/${alertId}/dismiss`);
};

/**
 * Dismiss all active system alerts.
 * Backend: POST /api/admin/dashboard/alerts/dismiss-all
 */
export const dismissAllAlerts = (): Promise<void> => {
    return apiClient.post<void>('/admin/dashboard/alerts/dismiss-all');
};
