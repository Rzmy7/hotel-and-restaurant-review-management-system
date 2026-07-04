import { useQuery } from '@tanstack/react-query';
import { useOrganizationStore } from '../stores/useOrganizationStore';
import { dashboardService } from '../services/dashboardService';

export const useDashboardAlerts = () => {
    const currentOrg = useOrganizationStore(state => state.currentOrg);

    const { data, isLoading, isFetching, error, refetch } = useQuery({
        queryKey: ['dashboard', 'alerts', currentOrg?.id],
        queryFn: async () => {
            if (!currentOrg) return [];
            return await dashboardService.getAlerts(currentOrg.id);
        },
        enabled: !!currentOrg,
        refetchOnWindowFocus: true, // Refresh alerts when user switches back to browser tab
    });

    return {
        data: data ?? [],
        loading: isLoading,
        isFetching,
        error: error instanceof Error ? error.message : null,
        refetch,
    };
};
export default useDashboardAlerts;
