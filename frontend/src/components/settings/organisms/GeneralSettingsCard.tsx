import React, { useEffect, useMemo, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { Select } from '../../ui/Select';
import { FormField } from '../molecules/FormField';
import { Button } from '../../ui/Button';
import type { GeneralSettings } from '../../../types/settings';
import { useTheme } from '../../../contexts/ThemeContext';
import {
    deleteUserOrganization,
    fetchUserOrganizations,
    type UserOrganizationSummary,
} from '../../../services/userOrganizationsService';
import { useToast } from '../../../contexts/ToastContext';

interface GeneralSettingsCardProps {
    data: GeneralSettings;
    onChange: (updates: Partial<GeneralSettings>) => void;
}

export const GeneralSettingsCard: React.FC<GeneralSettingsCardProps> = ({ data, onChange }) => {
    const { setTheme, darkModeAllowed } = useTheme();
    const { showToast } = useToast();
    const [organizations, setOrganizations] = useState<UserOrganizationSummary[]>([]);
    const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(true);
    const [organizationsError, setOrganizationsError] = useState<string | null>(null);
    const [organizationPendingDelete, setOrganizationPendingDelete] = useState<UserOrganizationSummary | null>(null);
    const [isDeletingOrganization, setIsDeletingOrganization] = useState(false);

    const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
        setTheme(newTheme);
        onChange({ themePreference: newTheme });
    };

    const syncOrganizationCache = (items: UserOrganizationSummary[]) => {
        localStorage.setItem('organizations', JSON.stringify(items));
        localStorage.setItem('organization_ids', JSON.stringify(items.map((item) => item.organization_id)));

        const currentOrganization = localStorage.getItem('current_organization');
        const hasCurrent = !!currentOrganization && items.some((item) => item.organization_id === currentOrganization);

        if (!items.length) {
            localStorage.removeItem('current_organization');
            return;
        }

        if (!hasCurrent) {
            localStorage.setItem('current_organization', items[0].organization_id);
        }
    };

    const loadOrganizations = async () => {
        setIsLoadingOrganizations(true);
        setOrganizationsError(null);
        try {
            const ownedOrganizations = await fetchUserOrganizations();
            setOrganizations(ownedOrganizations);
            syncOrganizationCache(ownedOrganizations);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load owned organizations';
            setOrganizationsError(message);
        } finally {
            setIsLoadingOrganizations(false);
        }
    };

    useEffect(() => {
        void loadOrganizations();
    }, []);

    const deleteDescription = useMemo(() => {
        if (!organizationPendingDelete) {
            return '';
        }

        return `Are you sure you want to remove ${organizationPendingDelete.organization_name}? This action cannot be undone.`;
    }, [organizationPendingDelete]);

    const handleConfirmDeleteOrganization = async () => {
        if (!organizationPendingDelete) {
            return;
        }

        setIsDeletingOrganization(true);
        setOrganizationsError(null);
        try {
            await deleteUserOrganization(organizationPendingDelete.organization_id);
            showToast('Organization deleted successfully', 'success');
            setOrganizationPendingDelete(null);
            await loadOrganizations();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete organization';
            setOrganizationsError(message);
            showToast(message, 'error');
        } finally {
            setIsDeletingOrganization(false);
        }
    };

    return (
        <div className="flex flex-col">
            <FormField label="Owned Organizations" orientation="horizontal" description="Manage organizations you own">
                <div className="w-full max-w-[640px] border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    {isLoadingOrganizations ? (
                        <div className="px-4 py-3 text-sm text-gray-500 dark:text-slate-400">Loading organizations...</div>
                    ) : organizationsError ? (
                        <div className="px-4 py-3 text-sm text-red-500">{organizationsError}</div>
                    ) : organizations.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500 dark:text-slate-400">No owned organizations found.</div>
                    ) : (
                        organizations.map((organization) => (
                            <div
                                key={organization.organization_id}
                                className="px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-slate-700/50 last:border-b-0"
                            >
                                <div className="flex flex-col">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                        {organization.organization_name}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="danger"
                                    size="sm"
                                    onClick={() => setOrganizationPendingDelete(organization)}
                                >
                                    Remove
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </FormField>
            <FormField label="Time Zone" orientation="horizontal">
                <Select
                    value={data.timeZone}
                    onChange={(e) => onChange({ timeZone: e.target.value })}
                    options={[
                        { label: 'EST (UTC-5)', value: 'EST (UTC-5)' },
                        { label: 'CST (UTC-6)', value: 'CST (UTC-6)' },
                        { label: 'MST (UTC-7)', value: 'MST (UTC-7)' },
                        { label: 'PST (UTC-8)', value: 'PST (UTC-8)' },
                        { label: 'GMT (UTC+0)', value: 'GMT (UTC+0)' }
                    ]}
                />
            </FormField>
            <FormField label="Language" orientation="horizontal">
                <Select
                    value={data.language}
                    onChange={(e) => onChange({ language: e.target.value })}
                    options={[
                        { label: 'English', value: 'English' },
                        { label: 'Spanish', value: 'Spanish' },
                        { label: 'French', value: 'French' },
                        { label: 'German', value: 'German' }
                    ]}
                />
            </FormField>
            {darkModeAllowed && (
            <FormField label="Application Theme" orientation="horizontal" description="Select your preferred UI appearance">
                <div className="flex bg-gray-100/80 dark:bg-slate-700/50 p-1 rounded-xl w-full max-w-[280px]">
                    {[
                        { id: 'light', label: 'Light', icon: Sun },
                        { id: 'dark', label: 'Dark', icon: Moon },
                        { id: 'system', label: 'System', icon: Monitor }
                    ].map((t) => {
                        const Icon = t.icon;
                        const isActive = data.themePreference === t.id;

                        return (
                            <button
                                key={t.id}
                                onClick={() => handleThemeChange(t.id as any)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[13px] font-bold transition-all duration-300 ${isActive
                                    ? 'bg-white dark:bg-slate-600 text-[#4e80ee] dark:text-blue-400 shadow-sm transform scale-100'
                                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-slate-600/50 transform scale-[0.98]'
                                    }`}
                            >
                                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                                <span className={isActive ? 'block' : 'hidden sm:block'}>{t.label}</span>
                            </button>
                        );
                    })}
                </div>
            </FormField>
            )}

            {organizationPendingDelete && (
                <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-xl p-6">
                        <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">Confirm Organization Removal</h3>
                        <p className="text-sm text-gray-600 dark:text-slate-300 mt-3">{deleteDescription}</p>
                        <div className="flex justify-end gap-3 mt-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOrganizationPendingDelete(null)}
                                disabled={isDeletingOrganization}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="danger"
                                onClick={handleConfirmDeleteOrganization}
                                isLoading={isDeletingOrganization}
                            >
                                Confirm Remove
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
