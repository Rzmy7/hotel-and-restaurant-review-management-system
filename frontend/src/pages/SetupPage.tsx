import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hotel, Utensils } from 'lucide-react';
import SetupLayout from '../components/shared/SetupLayout';
import { apiClient } from '../api/client';

const SETUP_SNAPSHOT_CURRENT_ORG_KEY = 'setup_snapshot_current_organization';
const SETUP_PENDING_ORG_ID_KEY = 'setup_pending_organization_id';
const SETUP_PENDING_ORG_NAME_KEY = 'setup_pending_organization_name';
const SETUP_PENDING_MEMBERSHIP_CREATED_KEY = 'setup_pending_membership_created';
const SETUP_SNAPSHOT_EMPTY_VALUE = '__none__';

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
    const [selectedType, setSelectedType] = useState<string>('');
    const [organizationName, setOrganizationName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const organizationTypes = [
        {
            id: 'hotel',
            title: 'Hotel/resort',
            description: 'Traditional hotel, boutique hotel, or resort property',
            icon: Hotel,
        },
        {
            id: 'restaurant',
            title: 'Restaurant/cafe',
            description: 'Restaurant, cafe, bar, or food service establishment',
            icon: Utensils,
        },
    ];

    const handleContinue = async () => {
        const token = localStorage.getItem("token");

        // Use a generic name if none provided for now, but in future, could prompt for it.
        const orgName = organizationName || `My ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}`;

        if (!token) {
            alert("User not authenticated");
            return;
        }

        if (localStorage.getItem(SETUP_SNAPSHOT_CURRENT_ORG_KEY) === null) {
            const currentOrganization = localStorage.getItem('current_organization');
            if (currentOrganization !== null) {
                localStorage.setItem(SETUP_SNAPSHOT_CURRENT_ORG_KEY, currentOrganization);
            } else {
                localStorage.setItem(SETUP_SNAPSHOT_CURRENT_ORG_KEY, SETUP_SNAPSHOT_EMPTY_VALUE);
            }
        }

        setIsLoading(true);
        try {
            const data = await apiClient.post<any>('/api/organizations', {
                organization_name: orgName,
                organization_type: selectedType,
            });

            const organizationId = data?.organization_id;
            const membershipCreated = Boolean(data?.membership_created);

            if (organizationId) {
                localStorage.setItem(SETUP_PENDING_ORG_ID_KEY, organizationId);
                localStorage.setItem(SETUP_PENDING_ORG_NAME_KEY, orgName.trim());
                localStorage.setItem(SETUP_PENDING_MEMBERSHIP_CREATED_KEY, membershipCreated ? 'true' : 'false');
                localStorage.setItem("current_organization", organizationId);
            }

            navigate("/setup/sources");
        } catch (error: any) {
            console.error(error);
            const detail = String(error.detail || "").toLowerCase();
            const message = String(error.message || "").toLowerCase();

            const isDuplicateJoin =
                detail.includes("already") ||
                detail.includes("duplicate") ||
                detail.includes("unique") ||
                message.includes("already") ||
                message.includes("duplicate") ||
                message.includes("unique");

            if (isDuplicateJoin) {
                alert("You have already joined this organization");
            } else {
                alert("Server error creating organization");
            }
        } finally {
            setIsLoading(false);
        }
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
            isContinueDisabled={!selectedType || isLoading}
            isContinueLoading={isLoading}
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

            {/* Optional Name Input */}
            <div className="mb-6">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
                    Organization Name (Optional)
                </label>
                <input
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="E.g., Ocean Bay Hotel"
                    className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all dark:text-white"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {organizationTypes.map((type) => {
                    const Icon = type.icon;
                    const isSelected = selectedType === type.id;
                    
                    return (
                        <div
                            key={type.id}
                            onClick={() => setSelectedType(type.id)}
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
                                        {type.title}
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
        </SetupLayout>
    );
};

export default SetupPage;