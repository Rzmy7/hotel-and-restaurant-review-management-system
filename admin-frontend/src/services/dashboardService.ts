import { apiClient } from '../api/client';
import type { DashboardStats, ChartDataPoint, SystemAlert, RecentActivity } from '../types';

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
 * Fetch recent platform activity for the Activity feed.
 * Backend: GET /api/admin/dashboard/activities → RecentActivity[]
 */
export const fetchRecentActivity = (): Promise<RecentActivity[]> => {
    return apiClient.get<RecentActivity[]>('/admin/dashboard/activities');
};
