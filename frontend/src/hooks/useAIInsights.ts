import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useOrganizationStore } from '../stores/useOrganizationStore';
import { dashboardService } from '../services/dashboardService';

export const useAIInsights = (period: number = 30) => {
    const currentOrg = useOrganizationStore(state => state.currentOrg);

    const { data, isLoading, isFetching, error, refetch } = useQuery({
        queryKey: ['dashboard', 'insights', currentOrg?.id, period],
        queryFn: async () => {
            if (!currentOrg) return null;
            return await dashboardService.getAIInsights(currentOrg.id, period);
        },
        enabled: !!currentOrg,
        placeholderData: keepPreviousData,
    });

    return {
        data,
        loading: isLoading,
        isFetching,
        error: error instanceof Error ? error.message : null,
        refetch,
    };
};
export default useAIInsights;
