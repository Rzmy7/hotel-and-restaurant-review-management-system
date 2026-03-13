import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Organization } from '../types/dashboard';
import { MOCK_DASHBOARD_DATA } from '../mocks/dashboardMock';

interface OrganizationContextType {
    organizations: Organization[];
    currentOrg: Organization | null;
    loading: boolean;
    error: string | null;
    switchOrganization: (orgId: string) => void;
    addOrganization: () => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrganizations = async () => {
            try {
                setLoading(true);
                // Simulate API call
                await new Promise((resolve) => setTimeout(resolve, 800));

                const data = MOCK_DASHBOARD_DATA.organizations;
                const initialOrg = MOCK_DASHBOARD_DATA.hotel;

                setOrganizations(data);
                setCurrentOrg(initialOrg);
                setError(null);
            } catch (err) {
                setError('Failed to load organizations');
            } finally {
                setLoading(false);
            }
        };

        fetchOrganizations();
    }, []);

    const switchOrganization = (orgId: string) => {
        const org = organizations.find((o) => o.id === orgId);
        if (org) {
            setCurrentOrg(org);
        }
    };

    const addOrganization = () => {
        // Logic to open add organization modal or navigate
        console.log('Add organization triggered');
    };

    return (
        <OrganizationContext.Provider
            value={{
                organizations,
                currentOrg,
                loading,
                error,
                switchOrganization,
                addOrganization,
            }}
        >
            {children}
        </OrganizationContext.Provider>
    );
};

export const useOrganizations = () => {
    const context = useContext(OrganizationContext);
    if (context === undefined) {
        throw new Error('useOrganizations must be used within an OrganizationProvider');
    }
    return context;
};
