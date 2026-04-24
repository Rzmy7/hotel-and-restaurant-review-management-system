import { CheckCircle2, Rocket, Search, BarChart3, Loader2 } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SetupLayout from '../components/shared/SetupLayout';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';

const SETUP_DRAFT_CONFIG_KEY = 'setup_draft_config';
const SETUP_SNAPSHOT_CURRENT_ORG_KEY = 'setup_snapshot_current_organization';
const SETUP_PENDING_ORG_NAME_KEY = 'setup_pending_organization_name';

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
  localStorage.removeItem(SETUP_DRAFT_CONFIG_KEY);
  localStorage.removeItem(SETUP_PENDING_ORG_NAME_KEY);
  localStorage.removeItem(SETUP_SNAPSHOT_CURRENT_ORG_KEY);
  localStorage.removeItem('setup_pending_organization_id');
  localStorage.removeItem('setup_pending_membership_created');
};

const FinishSetupPage = () => {
  const navigate = useNavigate();
  const { user, persist } = useAuth();
  const [isFinishing, setIsFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showUpgradePlanAction =
    !!error &&
    error.toLowerCase().includes('organization limit reached');

  const handleFinish = async () => {
    setIsFinishing(true);
    setError(null);

    try {
      const draftStr = localStorage.getItem(SETUP_DRAFT_CONFIG_KEY);
      if (!draftStr) {
        throw new Error("Setup data not found. Please restart the setup process.");
      }

      const draft = JSON.parse(draftStr);
      
      // Get User ID for Tenant ID
      const tenantId = user?.user_id;
      
      console.log('Setup finish user:', user);

      if (!tenantId) {
        throw new Error("User session not found. Please log in again.");
      }

      if (!draft.organization?.locationUrl) {
        throw new Error("Location URL is missing. Please restart setup.");
      }

      const payload = {
        organization_name: draft.organization.name,
        organization_type_id: draft.organization.type || 1,
        location_url: draft.organization.locationUrl,
        sources: (draft.sources || []).map((s: any) => ({
          platform_id: s.platform_id,
          source_url: s.source_url,
          fetching_frequency: draft.schedule || 1
        }))
      };

      const response = await apiClient.post<any>(`/api/organizations/${tenantId}`, payload);
      
      const organizationId = response?.organization_id;
      const accessToken = response?.access_token;

      if (organizationId) {
        // Update the session with the new token that includes the organization_id
        if (accessToken) {
          persist(user, accessToken);
        }
        // Update local organizations list
        const organizations = parseJsonArray(localStorage.getItem('organizations'));
        const alreadyExists = organizations.some((org: any) => org?.organization_id === organizationId);

        if (!alreadyExists) {
          organizations.push({
            organization_id: organizationId,
            organization_name: draft.organization.name,
          });
        }

        localStorage.setItem('organizations', JSON.stringify(organizations));
        
        const organizationIds = organizations
          .map((org: any) => org?.organization_id)
          .filter(Boolean);
          
        localStorage.setItem('organization_ids', JSON.stringify(organizationIds));
        localStorage.setItem('current_organization', organizationId);
        localStorage.setItem('setupComplete', 'true');
        
        clearSetupDraftState();
        
        // Wait briefly for the "success" feel
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        throw new Error("Failed to retrieve organization ID from server.");
      }

    } catch (err: any) {
      console.error('Final setup error:', err);
      setError(err.message || "An unexpected error occurred during finalization.");
      setIsFinishing(false);
    }
  };

  const nextSteps = [
    {
      title: 'Initial Review Fetching',
      description: 'We are currently connecting to your sources and retrieving your latest reviews.',
      icon: Search,
    },
    {
      title: 'Sentiment Analysis',
      description: 'Our AI is processing each review to categorize feedback and determine sentiment.',
      icon: BarChart3,
    },
    {
      title: 'Reporting Dashboard',
      description: 'Your dashboard will be ready with actionable insights in approximately 5-10 minutes.',
      icon: Rocket,
    },
  ];

  return (
    <SetupLayout
      currentStep={3}
      onContinue={handleFinish}
      onBack={() => navigate('/setup/sources')}
      isContinueLoading={isFinishing}
      isContinueDisabled={isFinishing}
    >
      <div className="flex flex-col items-center text-center">
        <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center text-white mb-8 shadow-2xl shadow-blue-500/40 animate-bounce-subtle">
          {isFinishing ? <Loader2 size={48} className="animate-spin" /> : <CheckCircle2 size={48} strokeWidth={2.5} />}
        </div>

        <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">
            {isFinishing ? 'Finalizing Setup...' : "You're All Set!"}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium max-w-md mb-8">
            {isFinishing 
              ? "We're saving your organization and connecting your sources. Please don't close this window."
              : "Your organization is ready to be created. We'll start aggregating your reviews immediately."}
        </p>

        {error && (
          <div className="w-full bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl p-4 mb-8 text-red-600 dark:text-red-400 text-sm font-bold">
            <p>Error: {error}</p>
            {showUpgradePlanAction && (
              <div className="mt-4">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/subscription')}
                >
                  Upgrade Plan
                </Button>
              </div>
            )}
            </div>
        )}

        <div className="w-full text-left space-y-6 mb-10">
            <h3 className="text-[12px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6">
                What's happening now
            </h3>
            
            {nextSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                    <div key={index} className="flex gap-4 group">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 transition-colors shrink-0">
                            <Icon size={20} />
                        </div>
                        <div>
                            <h4 className="text-[15px] font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">
                                {step.title}
                            </h4>
                            <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                {step.description}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>

        <div className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 text-left">
            <div className="flex items-center gap-3 text-blue-600 mb-2">
                <CheckCircle2 size={16} />
                <span className="text-[11px] font-black uppercase tracking-widest">Ready to Launch</span>
            </div>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Click the button below to finalize and head to your dashboard. Welcome to the L2 Project family.
            </p>
        </div>
      </div>
    </SetupLayout>
  );
};

export default FinishSetupPage;
