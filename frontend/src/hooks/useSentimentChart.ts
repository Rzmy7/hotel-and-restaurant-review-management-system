import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useOrganizationStore } from '../stores/useOrganizationStore';
import { dashboardService } from '../services/dashboardService';

export const useSentimentChart = (period: number = 0) => {
    const currentOrg = useOrganizationStore(state => state.currentOrg);

    const { data, isLoading, isFetching, error, refetch } = useQuery({
        queryKey: ['dashboard', 'charts', 'sentiment', currentOrg?.id, period],
        queryFn: async () => {
            if (!currentOrg) return null;
            return await dashboardService.getSentimentDistribution(currentOrg.id, period);
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
export default useSentimentChart;
