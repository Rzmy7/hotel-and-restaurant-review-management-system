import { apiClient } from '../api/client';

export interface UserOrganizationSummary {
    organization_id: string;
    organization_name: string;
    organization_type?: string | null;
    organization_type_id?: string | number | null;
    role?: string | null;
}

export const fetchUserOrganizations = (): Promise<UserOrganizationSummary[]> => {
    return apiClient.get<UserOrganizationSummary[]>('/user/organizations');
};

export const deleteUserOrganization = (organizationId: string): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/organizations/${encodeURIComponent(organizationId)}`);
};
