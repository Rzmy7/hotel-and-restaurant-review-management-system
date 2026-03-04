import { apiClient } from '../api/client';
import { MOCK_DASHBOARD_DATA } from '../mocks/dashboardMock';
import type { DashboardResponse } from '../types/dashboard';

class DashboardService {
    /**
     * Fetches the dashboard summary metrics, charts, and insights.
     */
    async getDashboardSummary(orgId: string): Promise<DashboardResponse> {
        // In a production app, we would use the apiClient to fetch real data:
        // return apiClient.get<DashboardResponse>(`/api/organizations/${orgId}/dashboard`);

        // Simulating an API call with the mock data
        await apiClient.get(`/api/organizations/${orgId}/dashboard`);
        return MOCK_DASHBOARD_DATA as unknown as DashboardResponse;
    }
}

export const dashboardService = new DashboardService();
