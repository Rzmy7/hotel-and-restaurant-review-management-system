import { apiClient } from '../api/client';
import { MOCK_DASHBOARD_DATA } from '../mocks/dashboardMock';
import type { DashboardResponse } from '../types/dashboard';

class DashboardService {
    /**
     * Fetches the dashboard summary metrics, charts, and insights.
     * @param orgId - Organization ID
     * @param period - Number of days for the date range. 0 = all time.
     */
    async getDashboardSummary(orgId: string, period: number = 0): Promise<DashboardResponse> {
        try {
            // Attempt to hit the real API
            const response = await apiClient.get<DashboardResponse>(
                `/api/organizations/${orgId}/dashboard`,
                { period }
            );
            return response;
        } catch (error) {
            console.warn('Backend not detected or returned error, falling back to mock dashboard data.', error);
            // Fallback to mock data if backend fails
            return MOCK_DASHBOARD_DATA as unknown as DashboardResponse;
        }
    }
}

export const dashboardService = new DashboardService();
