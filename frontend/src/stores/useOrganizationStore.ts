import { create } from 'zustand';
import type { Organization } from '../types/dashboard';

interface OrganizationState {
    organizations: Organization[];
    currentOrg: Organization | null;
    loading: boolean;
    error: string | null;
    hasOrganization: boolean;
    fetchOrganizations: () => Promise<void>;
    switchOrganization: (orgId: string) => void;
    addOrganization: () => void;
}

/** Read the organization list that AuthContext stores after login. */
const loadFromStorage = (): { organizations: Organization[]; currentOrg: Organization | null } => {
    try {
        const raw = localStorage.getItem('organizations');
        const currentId = localStorage.getItem('current_organization');
        if (!raw) return { organizations: [], currentOrg: null };

        const list: any[] = JSON.parse(raw);
        const orgs: Organization[] = list.map((o) => ({
            id: o.organization_id ?? o.id ?? '',
            name: o.organization_name ?? o.name ?? 'My Organization',
            status: o.status ?? 'Active',
        }));

        const currentOrg =
            orgs.find((o) => o.id === currentId) ?? (orgs.length > 0 ? orgs[0] : null);

        return { organizations: orgs, currentOrg };
    } catch {
        return { organizations: [], currentOrg: null };
    }
};

export const useOrganizationStore = create<OrganizationState>((set, get) => ({
    organizations: [],
    currentOrg: null,
    loading: true,
    error: null,
    hasOrganization: false,

    fetchOrganizations: async () => {
        try {
            set({ loading: true, error: null });

            // AuthContext already fetched and stored these after login — read from localStorage.
            const { organizations, currentOrg } = loadFromStorage();

            set({
                organizations,
                currentOrg,
                hasOrganization: organizations.length > 0,
                loading: false,
            });
        } catch (err) {
            set({ error: 'Failed to load organizations', loading: false, hasOrganization: false });
        }
    },

    switchOrganization: (orgId: string) => {
        const { organizations } = get();
        const org = organizations.find((o) => o.id === orgId);
        if (org) {
            localStorage.setItem('current_organization', org.id);
            set({ currentOrg: org });
        }
    },

    addOrganization: () => {
        window.location.href = '/setup';
    },
}));
