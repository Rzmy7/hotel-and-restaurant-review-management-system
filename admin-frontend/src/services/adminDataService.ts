import type { Organization, OrganizationStats, User } from '../types';

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

export interface UserStatsData {
    allActiveUsers: number;
    todayActiveUsers: number;
    todayRegistered: number;
}

export const fetchOrganizations = (): Promise<Organization[]> => {
    return fetchJson<Organization[]>('/admin/organizations');
};

export const fetchOrgStats = (): Promise<OrganizationStats> => {
    return fetchJson<OrganizationStats>('/admin/organizations/stats');
};

export const fetchUsers = (): Promise<User[]> => {
    return fetchJson<User[]>('/admin/users');
};

export const fetchUserStats = (): Promise<UserStatsData> => {
    return fetchJson<UserStatsData>('/admin/users/stats');
};
