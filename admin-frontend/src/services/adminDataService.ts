import { apiClient } from '../api/client';
import type { AvailableSource, Organization, OrganizationStats, OrgSource, User, PaginatedResponse } from '../types';
 
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
    password?: string;
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
 
export const fetchOrganizations = (page: number, limit: number, search?: string): Promise<PaginatedResponse<Organization>> => {
    return apiClient.get<PaginatedResponse<Organization>>(`/admin/organizations?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`);
};
 
export const fetchOrgStats = (): Promise<OrganizationStats> => {
    return apiClient.get<OrganizationStats>('/admin/organizations/stats');
};
 
export const fetchOrgSources = (orgId: string): Promise<OrgSource[]> => {
    return apiClient.get<OrgSource[]>(`/admin/organizations/${encodeURIComponent(orgId)}/sources`);
};
 
export const fetchAllSources = (): Promise<AvailableSource[]> => {
    return apiClient.get<AvailableSource[]>('/admin/sources');
};
 
export const updateOrganization = (orgId: string, name: string): Promise<{ id: string; name: string }> => {
    return apiClient.patch<{ id: string; name: string }>(`/admin/organizations/${encodeURIComponent(orgId)}`, { name });
};
 
export const updateOrgSources = (
    orgId: string,
    sources: { source_id: number; external_url: string | null }[],
): Promise<OrgSource[]> => {
    return apiClient.put<OrgSource[]>(`/admin/organizations/${encodeURIComponent(orgId)}/sources`, { sources });
};
 
export const deleteOrganization = (orgId: string): Promise<{ status: string }> => {
    return apiClient.delete<{ status: string }>(`/admin/organizations/${encodeURIComponent(orgId)}`);
};
 
export const fetchUsers = (
    page: number,
    limit: number,
    search?: string,
    role?: string,
    plan?: string,
    status?: string
): Promise<PaginatedResponse<User>> => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (search) params.append('search', search);
    if (role) params.append('role', role);
    if (plan) params.append('plan', plan);
    if (status) params.append('status', status);
    return apiClient.get<PaginatedResponse<User>>(`/admin/users?${params}`);
};
 
export const fetchUserStats = (): Promise<UserStatsData> => {
    return apiClient.get<UserStatsData>('/admin/users/stats');
};
 
export const createUser = (payload: UserUpsertPayload): Promise<User> => {
    return apiClient.post<User>('/admin/users', payload);
};
 
export const updateUser = (userId: string, payload: UserUpdatePayload): Promise<User> => {
    return apiClient.patch<User>(`/admin/users/${encodeURIComponent(userId)}`, payload);
};
 
export const deleteUser = async (userId: string): Promise<void> => {
    await apiClient.delete<any>(`/admin/users/${encodeURIComponent(userId)}`);
};
 
export const triggerPendingEmbeddings = (): Promise<{ triggered_sources_count: number; message: string }> => {
    return apiClient.post<{ triggered_sources_count: number; message: string }>('/admin/embeddings/trigger-pending', {});
};

export const reEmbedAllReviews = (): Promise<{ triggered_sources_count: number; message: string }> => {
    return apiClient.post<{ triggered_sources_count: number; message: string }>('/admin/embeddings/re-embed-all', {});
};
