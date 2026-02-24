import { useState, useEffect } from 'react';
import type { DashboardResponse } from '../types/dashboard';
import { MOCK_DASHBOARD_DATA } from '../mocks/dashboardMock';
import { useOrganizations } from '../contexts/OrganizationContext';

interface DashboardState {
    data: DashboardResponse | null;
    loading: boolean;
    error: string | null;
}

export const useDashboardData = () => {
    const { currentOrg } = useOrganizations();
    const [state, setState] = useState<DashboardState>({
        data: null,
        loading: true,
        error: null,
    });

    useEffect(() => {
        const fetchData = async () => {
            if (!currentOrg) return;

            try {
                setState(prev => ({ ...prev, loading: true }));
                // Simulate API delay
                await new Promise((resolve) => setTimeout(resolve, 1000));

                // In a real app, this would be a fetch call with org ID:
                // const response = await fetch(`/api/dashboard?orgId=${currentOrg.id}`);
                // const data = await response.json();

                setState({
                    data: {
                        ...MOCK_DASHBOARD_DATA,
                        hotel: currentOrg,
                        currentOrganizationId: currentOrg.id
                    },
                    loading: false,
                    error: null,
                });
            } catch (err) {
                setState({
                    data: null,
                    loading: false,
                    error: 'Failed to fetch dashboard data. Please try again later.',
                });
            }
        };

        fetchData();
    }, [currentOrg]);

    return state;
};
