import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SetupLayout from '../components/shared/SetupLayout';
import { PricingCard } from '../components/subscription/molecules/PricingCard';
import { fetchSubscriptionPlans, type SubscriptionPlan } from '../services/subscriptionPlansService';

const SETUP_DRAFT_CONFIG_KEY = 'setup_draft_config';

type PlanTier = 'starter' | 'professional' | 'enterprise';

const toPlanTier = (plan: SubscriptionPlan, index: number): PlanTier => {
  if (plan.iconName === 'zap') {
    return 'starter';
  }
  if (plan.iconName === 'crown' || plan.iconName === 'building') {
    return 'enterprise';
  }
  if (plan.iconName === 'star') {
    return 'professional';
  }

  return index % 3 === 0 ? 'starter' : index % 3 === 1 ? 'professional' : 'enterprise';
};

const formatFeatureText = (feature: SubscriptionPlan['features'][number]): string => {
  if (!feature.enabled) {
    return '';
  }
  if (feature.limit === null || feature.limit === undefined) {
    return feature.name;
  }
  return `${feature.name}: ${feature.limit}`;
};

const ChoosePlanPage = () => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadPlans = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const loadedPlans = await fetchSubscriptionPlans();
        setPlans(loadedPlans);
        
        // Check draft first
        const draftStr = localStorage.getItem(SETUP_DRAFT_CONFIG_KEY);
        let draftPlanId = null;
        if (draftStr) {
            const draft = JSON.parse(draftStr);
            if (draft.plan) {
                draftPlanId = draft.plan;
            }
        }

        if (draftPlanId) {
            setSelectedPlan(draftPlanId);
        } else if (loadedPlans.length > 0) {
            setSelectedPlan(loadedPlans[0].id);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load plans';
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    };

    void loadPlans();
  }, []);

  const cardPlans = useMemo(
    () =>
      plans.map((plan, index) => ({
        id: plan.id,
        tier: toPlanTier(plan, index),
        title: plan.name,
        price: String(plan.monthlyPrice),
        period: 'mo',
        description: plan.description,
        isPopular: plan.isPopular,
        features: plan.features
          .map(formatFeatureText)
          .filter((feature) => feature.length > 0),
      })),
    [plans],
  );

  const handleContinue = () => {
    if (selectedPlan) {
        const draftStr = localStorage.getItem(SETUP_DRAFT_CONFIG_KEY);
        const draft = draftStr ? JSON.parse(draftStr) : {};
        
        localStorage.setItem(SETUP_DRAFT_CONFIG_KEY, JSON.stringify({
            ...draft,
            plan: selectedPlan
        }));
    }
    navigate('/setup/finish');
  };

  const handleBack = () => {
    navigate('/setup/schedule');
  };

  return (
    <SetupLayout
      currentStep={4}
      onContinue={handleContinue}
      onBack={handleBack}
      maxWidthClass="max-w-5xl"
    >
      <div className="text-center mb-10">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-3">
            Select Plan
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
            Choose the subscription plan that best fits your needs
        </p>
      </div>

      {isLoading ? (
        <div className="text-center text-slate-500 dark:text-slate-400 font-medium mb-8">Loading plans...</div>
      ) : errorMessage ? (
        <div className="text-center text-red-500 font-medium mb-8">{errorMessage}</div>
      ) : cardPlans.length === 0 ? (
        <div className="text-center text-slate-500 dark:text-slate-400 font-medium mb-8">No active plans available.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {cardPlans.map((plan) => (
            <PricingCard
              key={plan.id}
              tier={plan.tier}
              title={plan.title}
              price={plan.price}
              period={plan.period}
              description={plan.description}
              features={plan.features}
              isPopular={plan.isPopular}
              isSelected={selectedPlan === plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              buttonText={selectedPlan === plan.id ? 'Selected' : 'Select'}
            />
          ))}
        </div>
      )}
      
      <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 text-center">
        <p className="text-[12px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
            Note: You can easily change your plan or cancel anytime from your organization settings.
        </p>
      </div>
    </SetupLayout>
  );
};

export default ChoosePlanPage;
