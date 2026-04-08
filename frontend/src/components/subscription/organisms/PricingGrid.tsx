import React, { useEffect, useMemo, useState } from 'react';
import { PricingCard } from '../molecules/PricingCard';
import { fetchSubscriptionPlans, fetchSubscriptionUsage, type SubscriptionPlan } from '../../../services/subscriptionPlansService';
import { useAuth } from '../../../contexts/AuthContext';

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

const toFeatureLabel = (feature: SubscriptionPlan['features'][number]): string => {
  if (!feature.enabled) {
    return '';
  }
  if (feature.limit === null || feature.limit === undefined) {
    return feature.name;
  }
  return `${feature.name}: ${feature.limit}`;
};

const toButtonText = (plan: SubscriptionPlan, currentPlanId: string | null): string => {
  if (plan.id === currentPlanId) {
    return 'Current Plan';
  }
  if (plan.monthlyPrice <= 0) {
    return 'Get Started';
  }
  if (plan.isPopular) {
    return 'Upgrade Now';
  }
  return 'Choose Plan';
};

/**
 * PricingGrid Organism.
 * Manages the layout of pricing tiers.
 */
export const PricingGrid: React.FC = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadPlansAndUsage = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const loadedPlans = await fetchSubscriptionPlans();
        setPlans(loadedPlans);
        
        if (user?.user_id) {
            const usage = await fetchSubscriptionUsage(user.user_id);
            setCurrentPlanId(usage.planId);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load subscription plans';
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    };

    void loadPlansAndUsage();
  }, [user]);

  const handleSelectPlan = async (planId: string) => {
    if (planId === currentPlanId) return;
    
    setIsUpdating(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const { updateTenantPlan } = await import('../../../services/subscriptionPlansService');
      await updateTenantPlan(planId);
      setCurrentPlanId(planId);
      setSuccessMessage('Plan allocated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
       const message = error instanceof Error ? error.message : 'Failed to update plan';
       setErrorMessage(message);
    } finally {
       setIsUpdating(false);
    }
  };

  const cardPlans = useMemo(
    () =>
      plans.map((plan, index) => ({
        id: plan.id,
        tier: toPlanTier(plan, index),
        title: plan.name,
        price: String(plan.monthlyPrice),
        period: 'mo',
        description: plan.description,
        buttonText: isUpdating ? 'Updating...' : toButtonText(plan, currentPlanId),
        isPopular: plan.isPopular,
        features: plan.features
          .map(toFeatureLabel)
          .filter((label) => label.length > 0),
      })),
    [plans, isUpdating, currentPlanId],
  );

  if (isLoading) {
    return <div className="text-center text-gray-500 dark:text-slate-400 font-medium">Loading subscription plans...</div>;
  }

  if (errorMessage && !plans.length) {
    return <div className="text-center text-red-500 font-medium">{errorMessage}</div>;
  }

  if (cardPlans.length === 0) {
    return <div className="text-center text-gray-500 dark:text-slate-400 font-medium">No active plans available.</div>;
  }

  return (
    <div className="flex flex-col items-center">
      {successMessage && <div className="mb-4 text-green-500 font-medium animate-in fade-in">{successMessage}</div>}
      {errorMessage && plans.length > 0 && <div className="mb-4 text-red-500 font-medium">{errorMessage}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto px-4 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        {cardPlans.map((plan) => (
          <PricingCard
            key={plan.id}
            tier={plan.tier}
            title={plan.title}
            price={plan.price}
            period={plan.period}
            description={plan.description}
            buttonText={plan.buttonText}
            isPopular={plan.isPopular}
            features={plan.features}
            onClick={() => handleSelectPlan(plan.id)}
            isSelected={plan.id === currentPlanId}
          />
        ))}
      </div>
    </div>
  );
};

