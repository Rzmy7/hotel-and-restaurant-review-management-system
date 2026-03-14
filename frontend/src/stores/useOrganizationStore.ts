import { create } from 'zustand';
import type { Organization } from '../types/dashboard';
import { MOCK_DASHBOARD_DATA } from '../mocks/dashboardMock';

interface OrganizationState {
    organizations: Organization[];
    currentOrg: Organization | null;
    loading: boolean;
    error: string | null;
    fetchOrganizations: () => Promise<void>;
    switchOrganization: (orgId: string) => void;
    addOrganization: () => void;
}

export const useOrganizationStore = create<OrganizationState>((set, get) => ({
    organizations: [],
    currentOrg: null,
    loading: true,
    error: null,

    fetchOrganizations: async () => {
        try {
            set({ loading: true, error: null });
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 800));

            const data = MOCK_DASHBOARD_DATA.organizations;
            const initialOrg = MOCK_DASHBOARD_DATA.hotel;

            set({
                organizations: data,
                currentOrg: initialOrg,
                loading: false,
            });
        } catch (err) {
            set({ error: 'Failed to load organizations', loading: false });
        }
    },

    switchOrganization: (orgId: string) => {
        const { organizations } = get();
        const org = organizations.find((o) => o.id === orgId);
        if (org) {
            set({ currentOrg: org });
        }
    },

    addOrganization: () => {
        // Logic to open add organization modal or navigate
        console.log('Add organization triggered');
    },
}));
