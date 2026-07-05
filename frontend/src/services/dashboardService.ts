import { apiClient } from '../api/client';
import type { DashboardResponse, Alert, Review, CategoryPerformanceItem, SourceData, SentimentDistribution, ChartDataPoint, AIInsightsData } from '../types/dashboard';

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
     * Fetches granular KPI metrics and rating distribution.
     */
    async getKPIs(orgId: string, period: number = 0): Promise<DashboardResponse['metrics']> {
        return await apiClient.get<DashboardResponse['metrics']>(
            `/api/organizations/${orgId}/dashboard-granular/kpis`,
            { period }
        );
    }

    /**
     * Fetches active organization security and operational alerts.
     */
    async getAlerts(orgId: string): Promise<Alert[]> {
        return await apiClient.get<Alert[]>(
            `/api/organizations/${orgId}/dashboard-granular/alerts`
        );
    }

    /**
     * Fetches latest 5 reviews with structured metadata.
     */
    async getLatestReviews(orgId: string, period: number = 0): Promise<Review[]> {
        return await apiClient.get<Review[]>(
            `/api/organizations/${orgId}/dashboard-granular/reviews/latest`,
            { period }
        );
    }

    /**
     * Fetches and extracts sentiment distribution.
     */
    async getSentimentDistribution(orgId: string, period: number = 0): Promise<SentimentDistribution> {
        return await apiClient.get<SentimentDistribution>(
            `/api/organizations/${orgId}/dashboard-granular/charts/sentiment`,
            { period }
        );
    }

    /**
     * Fetches and extracts daily and weekly review trends.
     */
    async getTrends(orgId: string, period: number = 0): Promise<{ reviewsOverTime: ChartDataPoint[]; sentimentTrends: ChartDataPoint[] }> {
        return await apiClient.get<{ reviewsOverTime: ChartDataPoint[]; sentimentTrends: ChartDataPoint[] }>(
            `/api/organizations/${orgId}/dashboard-granular/charts/trends`,
            { period }
        );
    }

    /**
     * Fetches and extracts category performance metrics.
     */
    async getCategoryPerformance(orgId: string, period: number = 0): Promise<CategoryPerformanceItem[]> {
        return await apiClient.get<CategoryPerformanceItem[]>(
            `/api/organizations/${orgId}/dashboard-granular/category-performance`,
            { period }
        );
    }

    /**
     * Fetches and extracts AI insights (strengths, issues, highlights).
     */
    async getAIInsights(orgId: string, period: number = 0): Promise<AIInsightsData> {
        return await apiClient.get<AIInsightsData>(
            `/api/organizations/${orgId}/dashboard-granular/ai-insights`,
            { period }
        );
    }

    /**
     * Fetches and extracts source comparison metrics.
     */
    async getSourceComparison(orgId: string, period: number = 0): Promise<SourceData[]> {
        return await apiClient.get<SourceData[]>(
            `/api/organizations/${orgId}/dashboard-granular/source-comparison`,
            { period }
        );
    }
}

export const dashboardService = new DashboardService();

