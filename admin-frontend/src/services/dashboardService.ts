import { apiClient } from '../api/client';
import type { DashboardStats, ChartDataPoint, SystemAlert, RecentActivity } from '../types';

export const fetchDashboardStats = (): Promise<DashboardStats> => {
    return apiClient.get<DashboardStats>('/admin/dashboard/stats');
};

export const fetchUsageData = async (): Promise<ChartDataPoint[]> => {
    const response = await apiClient.get<{ trendData: any[] }>('/admin/dashboard/usage');
    return (response.trendData || []).map(d => ({
        label: d.date || 'Unknown',
        value: d.reviews || 0
    }));
};

export const fetchReviewData = async (): Promise<ChartDataPoint[]> => {
    const response = await apiClient.get<{ reviews: any[] }>('/admin/dashboard/reviews');
    return (response.reviews || []).map(r => ({
        label: r.date || r.userName || 'Unknown',
        value: r.rating || 0
    }));
};

export const fetchSystemAlerts = async (): Promise<SystemAlert[]> => {
    const response = await apiClient.get<{ alerts: SystemAlert[] }>('/admin/dashboard/alerts');
    return response.alerts || [];
};

export const fetchRecentActivity = async (): Promise<RecentActivity[]> => {
    const response = await apiClient.get<{ activities: RecentActivity[] }>('/admin/dashboard/activities');
    return response.activities || [];
};
