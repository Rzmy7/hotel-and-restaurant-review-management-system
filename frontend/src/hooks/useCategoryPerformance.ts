import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useOrganizationStore } from '../stores/useOrganizationStore';
import { dashboardService } from '../services/dashboardService';

export const useCategoryPerformance = (period: number = 30) => {
    const currentOrg = useOrganizationStore(state => state.currentOrg);

    const { data, isLoading, isFetching, error, refetch } = useQuery({
        queryKey: ['dashboard', 'categories', currentOrg?.id, period],
        queryFn: async () => {
            if (!currentOrg) return [];
            return await dashboardService.getCategoryPerformance(currentOrg.id, period);
        },
        enabled: !!currentOrg,
        placeholderData: keepPreviousData,
    });

    return {
        data: data ?? [],
        loading: isLoading,
        isFetching,
        error: error instanceof Error ? error.message : null,
        refetch,
    };
};
export default useCategoryPerformance;
