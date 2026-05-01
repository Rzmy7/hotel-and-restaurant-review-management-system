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

    /**
     * Fetches the dynamic AI insights and aggregated metrics for the Insights page.
     * @param orgId - Organization ID
     * @param timeRange - Time range string (e.g., '7d', '30d', '90d')
     */
    async getInsights(orgId: string, timeRange: string): Promise<any> {
        return await apiClient.get<any>(
            `/organizations/${orgId}/insights`,
            { timeRange }
        );
    }
}

export const dashboardService = new DashboardService();
