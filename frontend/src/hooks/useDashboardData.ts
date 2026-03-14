import { useState, useEffect } from 'react';
import type { DashboardResponse } from '../types/dashboard';
import { useOrganizationStore } from '../stores/useOrganizationStore';
import { dashboardService } from '../services/dashboardService';

interface DashboardState {
    data: DashboardResponse | null;
    loading: boolean;
    error: string | null;
}

export const useDashboardData = () => {
    const currentOrg = useOrganizationStore(state => state.currentOrg);
    const [state, setState] = useState<DashboardState>({
        data: null,
        loading: true,
        error: null,
    });

    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            if (!currentOrg) return;

            try {
                setState(prev => ({ ...prev, loading: true }));

                const response = await dashboardService.getDashboardSummary(currentOrg.id);

                if (isMounted) {
                    setState({
                        data: {
                            ...response,
                            hotel: currentOrg,
                            currentOrganizationId: currentOrg.id
                        },
                        loading: false,
                        error: null,
                    });
                }
            } catch (err) {
                if (isMounted) {
                    setState({
                        data: null,
                        loading: false,
                        error: 'Failed to fetch dashboard data. Please try again later.',
                    });
                }
            }
        };

        fetchData();

        return () => {
            isMounted = false;
        };
    }, [currentOrg]);

    return state;
};
