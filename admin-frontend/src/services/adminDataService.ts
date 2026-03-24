import type { AvailableSource, Organization, OrganizationStats, OrgSource, User } from '../types';

const DEFAULT_MAIN_BACKEND_URL = import.meta.env.VITE_MAIN_BACKEND_URL || 'http://localhost:8000';

const getBaseUrl = (): string => {
    const stored = localStorage.getItem('mainBackendUrl');
    return (stored || DEFAULT_MAIN_BACKEND_URL).replace(/\/$/, '');
};

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(`${getBaseUrl()}${path}`, {
        headers: {
            'Content-Type': 'application/json',
        },
        ...init,
    });

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json() as Promise<T>;
};

export interface UserStatsData {
    allActiveUsers: number;
    todayActiveUsers: number;
    todayRegistered: number;
}

export interface UserUpsertPayload {
    name: string;
    email: string;
    role: User['role'];
    status: User['status'];
    plan?: User['plan'];
    organizations?: string[];
    groups?: string[];
}

export interface UserUpdatePayload {
    name?: string;
    email?: string;
    role?: User['role'];
    status?: User['status'];
    plan?: User['plan'];
    organizations?: string[];
    groups?: string[];
}

export const fetchOrganizations = (): Promise<Organization[]> => {
    return requestJson<Organization[]>('/admin/organizations', { method: 'GET' });
};

export const fetchOrgStats = (): Promise<OrganizationStats> => {
    return requestJson<OrganizationStats>('/admin/organizations/stats', { method: 'GET' });
};

export const fetchOrgSources = (orgId: string): Promise<OrgSource[]> => {
    return requestJson<OrgSource[]>(`/admin/organizations/${encodeURIComponent(orgId)}/sources`);
};

export const fetchAllSources = (): Promise<AvailableSource[]> => {
    return requestJson<AvailableSource[]>('/admin/sources');
};

export const updateOrganization = (orgId: string, name: string): Promise<{ id: string; name: string }> => {
    return requestJson(`/admin/organizations/${encodeURIComponent(orgId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
    });
};

export const updateOrgSources = (
    orgId: string,
    sources: { source_id: number; external_url: string | null }[],
): Promise<OrgSource[]> => {
    return requestJson(`/admin/organizations/${encodeURIComponent(orgId)}/sources`, {
        method: 'PUT',
        body: JSON.stringify({ sources }),
    });
};

export const deleteOrganization = (orgId: string): Promise<{ status: string }> => {
    return requestJson(`/admin/organizations/${encodeURIComponent(orgId)}`, { method: 'DELETE' });
};

export const fetchUsers = (): Promise<User[]> => {
    return requestJson<User[]>('/admin/users', { method: 'GET' });
};

export const fetchUserStats = (): Promise<UserStatsData> => {
    return requestJson<UserStatsData>('/admin/users/stats', { method: 'GET' });
};

export const createUser = (payload: UserUpsertPayload): Promise<User> => {
    return requestJson<User>('/admin/users', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
};

export const updateUser = (userId: string, payload: UserUpdatePayload): Promise<User> => {
    return requestJson<User>(`/admin/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });
};

export const deleteUser = async (userId: string): Promise<void> => {
    await requestJson<{ status: string; userId: string }>(`/admin/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
    });
};
