import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SetupLayout from '../components/shared/SetupLayout';
import { PricingCard } from '../components/subscription/molecules/PricingCard';

type PlanTier = 'starter' | 'professional' | 'enterprise';

const ChoosePlanPage = () => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>('professional');

  const handleContinue = () => {
    navigate('/setup/finish');
  };

  const handleBack = () => {
    navigate('/setup/schedule');
  };

  const plans = [
    {
      tier: 'starter' as const,
      title: 'Free',
      price: '0',
      period: 'mo',
      description: 'Perfect for small businesses just getting started',
      features: [
        'Up to 2 sources',
        'Weekly fetching',
        'Basic sentiment analysis',
        'Community support'
      ]
    },
    {
      tier: 'professional' as const,
      title: 'Pro',
      price: '49',
      period: 'mo',
      description: 'Ideal for growing businesses needing daily insights',
      isPopular: true,
      features: [
        'Up to 10 sources',
        'Daily fetching',
        'Advanced sentiment analysis',
        'Competitor tracking',
        'Priority support'
      ]
    },
    {
      tier: 'enterprise' as const,
      title: 'Enterprise',
      price: '199',
      period: 'mo',
      description: 'For large organizations with complex needs',
      features: [
        'Unlimited sources',
        'Hourly fetching',
        'Custom integrations',
        'API access',
        '24/7 dedicated support'
      ]
    }
  ];

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {plans.map((plan) => (
          <PricingCard
            key={plan.tier}
            {...plan}
            isSelected={selectedPlan === plan.tier}
            onClick={() => setSelectedPlan(plan.tier)}
            buttonText={selectedPlan === plan.tier ? 'Selected' : 'Select'}
          />
        ))}
      </div>
      
      <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 text-center">
        <p className="text-[12px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
            Note: You can easily change your plan or cancel anytime from your organization settings.
        </p>
      </div>
    </SetupLayout>
  );
};

export default ChoosePlanPage;
