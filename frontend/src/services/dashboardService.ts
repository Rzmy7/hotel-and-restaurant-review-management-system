import { apiClient } from '../api/client';
import type { DashboardResponse } from '../types/dashboard';

class DashboardService {
    /**
     * Fetches the dashboard summary metrics, charts, and insights.
     * @param orgId - Organization ID
     * @param period - Number of days for the date range. 0 = all time.
     */
    async getDashboardSummary(orgId: string, period: number = 0): Promise<DashboardResponse> {
        const response = await apiClient.get<DashboardResponse>(
            `/api/organizations/${orgId}/dashboard`,
            { period }
        );
        return response;
    }
}

export const dashboardService = new DashboardService();
