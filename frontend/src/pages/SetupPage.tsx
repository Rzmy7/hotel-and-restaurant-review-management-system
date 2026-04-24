import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hotel, Utensils } from 'lucide-react';
import SetupLayout from '../components/shared/SetupLayout';
import { apiClient } from '../api/client';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchSubscriptionUsage, fetchUserOrganizations } from '../services/subscriptionPlansService';
import { Button } from '../components/ui/Button';

const SETUP_SNAPSHOT_CURRENT_ORG_KEY = 'setup_snapshot_current_organization';
const SETUP_PENDING_ORG_ID_KEY = 'setup_pending_organization_id';
const SETUP_PENDING_ORG_NAME_KEY = 'setup_pending_organization_name';
const SETUP_PENDING_MEMBERSHIP_CREATED_KEY = 'setup_pending_membership_created';
const SETUP_SNAPSHOT_EMPTY_VALUE = '__none__';
const SETUP_DRAFT_CONFIG_KEY = 'setup_draft_config';

const parseJsonArray = (value: string | null): any[] => {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const clearSetupDraftState = () => {
    localStorage.removeItem(SETUP_PENDING_ORG_ID_KEY);
    localStorage.removeItem(SETUP_PENDING_ORG_NAME_KEY);
    localStorage.removeItem(SETUP_PENDING_MEMBERSHIP_CREATED_KEY);
    localStorage.removeItem(SETUP_SNAPSHOT_CURRENT_ORG_KEY);
    localStorage.removeItem('setup_snapshot_organizations');
    localStorage.removeItem('setup_snapshot_organization_ids');
};

const discardPendingSetupOrganizationIfNeeded = async () => {
    const pendingOrganizationId = localStorage.getItem(SETUP_PENDING_ORG_ID_KEY);
    const membershipCreated = localStorage.getItem(SETUP_PENDING_MEMBERSHIP_CREATED_KEY) === 'true';

    if (!pendingOrganizationId || !membershipCreated) {
        return;
    }

    try {
        await apiClient.delete(`/api/setup/organizations/${pendingOrganizationId}/discard`);
    } catch (error) {
        console.warn('Failed to discard pending setup organization from backend:', error);
    }
};

const restoreSnapshotOrganizations = () => {
    const snapshotCurrentOrganization = localStorage.getItem(SETUP_SNAPSHOT_CURRENT_ORG_KEY);
    if (snapshotCurrentOrganization === SETUP_SNAPSHOT_EMPTY_VALUE) {
        localStorage.removeItem('current_organization');
    } else if (snapshotCurrentOrganization !== null) {
        localStorage.setItem('current_organization', snapshotCurrentOrganization);
    } else {
        localStorage.removeItem('current_organization');
    }
};

const SetupPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [selectedType, setSelectedType] = useState<number | null>(null);
    const [organizationName, setOrganizationName] = useState('');
    const [city, setCity] = useState('');
    const [country, setCountry] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isCheckingLimit, setIsCheckingLimit] = useState(false);
    const [organizationTypes, setOrganizationTypes] = useState<any[]>([]);
    const [limitError, setLimitError] = useState<string | null>(null);

    const checkOrganizationLimit = async (): Promise<boolean> => {
        const storedAuthUserRaw = localStorage.getItem('authUser');
        let storedUserId = '';
        if (storedAuthUserRaw) {
            try {
                const parsed = JSON.parse(storedAuthUserRaw);
                storedUserId = typeof parsed?.user_id === 'string' ? parsed.user_id.trim() : '';
            } catch {
                storedUserId = '';
            }
        }

        const userId = user?.user_id?.trim() || storedUserId;
        if (!userId) {
            setLimitError(null);
            return false;
        }

        setIsCheckingLimit(true);
        try {
            const [usage, organizations] = await Promise.all([
                fetchSubscriptionUsage(userId),
                fetchUserOrganizations(),
            ]);

            const orgFeature = usage.features.find((feature) => feature.key === 'organizations');
            const organizationsCount = organizations.length;

            if (orgFeature?.limit !== null && orgFeature?.limit !== undefined && organizationsCount >= orgFeature.limit) {
                setLimitError('Organization limit reached for your current plan. Upgrade your plan to add more organizations.');
                return true;
            }

            setLimitError(null);
            return false;
        } catch (error) {
            console.warn('Failed to validate organization quota:', error);
            return false;
        } finally {
            setIsCheckingLimit(false);
        }
    };

    useEffect(() => {
        const fetchTypes = async () => {
            try {
                const data = await apiClient.get<any[]>('/api/organization-types');
                
                // Map icons based on type_code
                const mappedTypes = data.map(type => ({
                    ...type,
                    icon: type.type_code === 1 ? Hotel : Utensils
                }));
                
                setOrganizationTypes(mappedTypes);

                // Load from draft if exists
                const draftStr = localStorage.getItem(SETUP_DRAFT_CONFIG_KEY);
                if (draftStr) {
                    const draft = JSON.parse(draftStr);
                    if (draft.organization && draft.organization.type) {
                        setSelectedType(draft.organization.type);
                    }
                    if (draft.organization?.name) setOrganizationName(draft.organization.name);
                    if (draft.organization?.city) setCity(draft.organization.city);
                    if (draft.organization?.country) setCountry(draft.organization.country);
                }
            } catch (error) {
                console.error('Failed to fetch organization types:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTypes();
    }, []);

    useEffect(() => {
        void checkOrganizationLimit();
    }, [user?.user_id]);

    const handleContinue = async () => {
        const token = localStorage.getItem("token");

        const orgName = organizationName.trim();
        const cityTrim = city.trim();
        const countryTrim = country.trim();

        if (!orgName || !cityTrim || !countryTrim) {
            alert("Organization name, city, and country are required.");
            return;
        }

        if (!token) {
            alert("User not authenticated");
            return;
        }

        const limitReached = await checkOrganizationLimit();
        if (limitReached) {
            return;
        }

        // Buffer the data in localStorage
        const draftStr = localStorage.getItem(SETUP_DRAFT_CONFIG_KEY);
        const draft = draftStr ? JSON.parse(draftStr) : {};

        localStorage.setItem(SETUP_DRAFT_CONFIG_KEY, JSON.stringify({
            ...draft,
            organization: {
                name: orgName,
                type: selectedType,
                city: cityTrim,
                country: countryTrim,
            }
        }));

        // We still store a "pending name" for UI purposes across steps if needed
        localStorage.setItem(SETUP_PENDING_ORG_NAME_KEY, orgName);

        navigate("/setup/sources");
    };

    const handleSkip = async () => {
        const hasPendingSetupOrganization = Boolean(localStorage.getItem(SETUP_PENDING_ORG_ID_KEY));
        const hasSnapshot = localStorage.getItem(SETUP_SNAPSHOT_CURRENT_ORG_KEY) !== null;

        if (hasPendingSetupOrganization || hasSnapshot) {
            await discardPendingSetupOrganizationIfNeeded();
            restoreSnapshotOrganizations();
            clearSetupDraftState();

            const committedOrgIds = parseJsonArray(localStorage.getItem('organization_ids'));
            const hasCommittedOrganizations = committedOrgIds.length > 0;

            navigate(hasCommittedOrganizations ? '/dashboard' : '/no-organization');
            return;
        }

        const setupComplete = localStorage.getItem("setupComplete") === "true";
        const existingOrgIds = parseJsonArray(localStorage.getItem("organization_ids"));
        const hasExistingOrganizations = Array.isArray(existingOrgIds) && existingOrgIds.length > 0;

        if (hasExistingOrganizations) {
            navigate("/dashboard");
            return;
        }

        if (!setupComplete) {
            localStorage.removeItem("organizations");
            localStorage.removeItem("organization_ids");
            localStorage.removeItem("current_organization");
        }

        navigate("/no-organization");
    };

    return (
        <SetupLayout
            currentStep={1}
            onContinue={handleContinue}
            showBack={false}
            isContinueDisabled={!selectedType || !organizationName.trim() || !city.trim() || !country.trim() || isLoading || isCheckingLimit || !!limitError}
            isContinueLoading={isLoading || isCheckingLimit}
        >
            <div className="text-center mb-10">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-3">
                    Your Business Type
                </h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium">
                    Select the category that best describes your organization
                </p>
                <button
                    type="button"
                    onClick={handleSkip}
                    className="absolute top-8 right-8 text-blue-600 font-bold uppercase tracking-widest text-xs hover:text-blue-700 transition"
                >
                    Skip Setup
                </button>
            </div>

            {limitError && (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-900/40 dark:bg-amber-900/10">
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400 text-center">{limitError}</p>
                    <div className="mt-3 flex justify-center">
                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => navigate('/subscription')}
                        >
                            Upgrade Plan
                        </Button>
                    </div>
                </div>
            )}

            {/* Name */}
            <div className="mb-4">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
                    Organization Name
                </label>
                <input
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="E.g., Ocean Bay Hotel"
                    className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all dark:text-white"
                />
            </div>

            {/* City + Country */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
                        City
                    </label>
                    <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="E.g., Colombo"
                        className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all dark:text-white"
                    />
                </div>
                <div>
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
                        Country
                    </label>
                    <input
                        type="text"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder="E.g., Sri Lanka"
                        className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all dark:text-white"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Fetching business types...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {organizationTypes.map((type) => {
                        const Icon = type.icon;
                        const isSelected = selectedType === type.type_code;

                        return (
                            <div
                                key={type.type_code}
                                onClick={() => setSelectedType(type.type_code)}
                                className={`
                                    group relative border-2 rounded-2xl p-6 cursor-pointer transition-all duration-300
                                    ${isSelected
                                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/10 shadow-lg shadow-blue-500/10'
                                        : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-200 dark:hover:border-blue-900/50 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none'}
                                `}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`
                                        w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300
                                        ${isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600'}
                                    `}>
                                        <Icon size={24} />
                                    </div>
                                    <div>
                                        <div className={`text-[15px] font-black uppercase tracking-tight mb-1 transition-colors ${isSelected ? 'text-blue-600' : 'text-slate-900 dark:text-white'}`}>
                                            {type.type_name}
                                        </div>
                                        <div className="text-[13px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                            {type.description}
                                        </div>
                                    </div>
                                </div>

                                {/* Active Indicator */}
                                {isSelected && (
                                    <div className="absolute top-4 right-4 animate-in zoom-in duration-300">
                                        <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </SetupLayout>
    );
};

export default SetupPage;