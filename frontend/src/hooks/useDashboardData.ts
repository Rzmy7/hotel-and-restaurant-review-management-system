// src/hooks/useDashboardData.ts
import { useState, useEffect } from 'react';
import type { DashboardResponse } from '../types/dashboard';
import { MOCK_DASHBOARD_DATA } from '../mocks/dashboardMock';

interface DashboardState {
    data: DashboardResponse | null;
    loading: boolean;
    error: string | null;
}

export const useDashboardData = () => {
    const [state, setState] = useState<DashboardState>({
        data: null,
        loading: true,
        error: null,
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Simulate API delay
                await new Promise((resolve) => setTimeout(resolve, 1500));

                // In a real app, this would be a fetch call:
                // const response = await fetch('/api/dashboard');
                // const data = await response.json();

                setState({
                    data: MOCK_DASHBOARD_DATA,
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
    }, []);

    return state;
};
