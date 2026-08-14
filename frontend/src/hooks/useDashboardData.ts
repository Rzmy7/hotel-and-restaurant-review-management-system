import { useQuery } from '@tanstack/react-query';
import type { DashboardResponse } from '../types/dashboard';
import { useOrganizationStore } from '../stores/useOrganizationStore';
import { dashboardService } from '../services/dashboardService';

export const useDashboardData = (period: number = 30) => {
    const currentOrg = useOrganizationStore(state => state.currentOrg);

    const { data: responseData, isLoading: loading, error } = useQuery({
        queryKey: ['dashboardData', currentOrg?.id, period],
        queryFn: async () => {
            if (!currentOrg) return null;
            return await dashboardService.getDashboardSummary(currentOrg.id, period);
        },
        enabled: !!currentOrg,
    });

    const data: DashboardResponse | null = responseData && currentOrg ? {
        ...responseData,
        hotel: currentOrg,
        currentOrganizationId: currentOrg.id
    } : null;

    return {
        data,
        loading,
        error: error instanceof Error ? error.message : null,
    };
};
