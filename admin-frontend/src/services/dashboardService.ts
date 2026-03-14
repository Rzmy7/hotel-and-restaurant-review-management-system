import type { DashboardStats, ChartDataPoint, SystemAlert, RecentActivity } from '../types';

const DEFAULT_MAIN_BACKEND_URL = import.meta.env.VITE_MAIN_BACKEND_URL || 'http://localhost:8000';

const getBaseUrl = (): string => {
    const stored = localStorage.getItem('mainBackendUrl');
    return (stored || DEFAULT_MAIN_BACKEND_URL).replace(/\/$/, '');
};

const fetchJson = async <T>(path: string): Promise<T> => {
    const response = await fetch(`${getBaseUrl()}${path}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
};

export const fetchDashboardStats = (): Promise<DashboardStats> => {
    return fetchJson<DashboardStats>('/dashboard/stats');
};

export const fetchUsageData = (): Promise<ChartDataPoint[]> => {
    return fetchJson<ChartDataPoint[]>('/dashboard/usage');
};

export const fetchReviewData = (): Promise<ChartDataPoint[]> => {
    return fetchJson<ChartDataPoint[]>('/dashboard/reviews');
};

export const fetchSystemAlerts = (): Promise<SystemAlert[]> => {
    return fetchJson<SystemAlert[]>('/dashboard/alerts');
};

export const fetchRecentActivity = (): Promise<RecentActivity[]> => {
    return fetchJson<RecentActivity[]>('/dashboard/activities');
};
