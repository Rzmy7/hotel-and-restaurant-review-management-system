import React from 'react';
import { PlanIcon } from '../atoms/PlanIcon';
import { FeatureItem } from '../atoms/FeatureItem';
import { PricingBadge } from '../atoms/PricingBadge';
import { Button } from '../../ui/Button';

interface PricingCardProps {
  tier: 'starter' | 'professional' | 'enterprise';
  title: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  buttonText: string;
  isPopular?: boolean;
}

/**
 * PricingCard Molecule.
 * A premium glassmorphism card displaying pricing details and features.
 */
export const PricingCard: React.FC<PricingCardProps> = ({
  tier,
  title,
  price,
  period,
  description,
  features,
  buttonText,
  isPopular = false,
}) => {
  return (
    <div className={`relative flex flex-col p-8 rounded-[2rem] border transition-all duration-500 hover:scale-[1.02] bg-white dark:bg-slate-800/80 backdrop-blur-sm ${isPopular ? 'border-blue-200 shadow-2xl shadow-blue-500/10 dark:border-blue-900/50' : 'border-gray-100 dark:border-slate-700/50 shadow-xl shadow-gray-200/20 dark:shadow-none'}`}>
      {isPopular && <PricingBadge label="Most Popular" />}
      
      <div className="flex flex-col gap-6 mb-8">
        <PlanIcon tier={tier} />
        <div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">{title}</h3>
          <p className="text-[13px] font-medium text-gray-400 dark:text-slate-500 mt-1">{description}</p>
        </div>
        
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-black text-gray-900 dark:text-white">${price}</span>
          <span className="text-[14px] font-bold text-gray-400 dark:text-slate-500">/{period}</span>
        </div>
      </div>

      <div className="flex-1 space-y-3 mb-10">
        <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4">What's included</p>
        {features.map((feature, idx) => (
          <FeatureItem key={idx} label={feature} />
        ))}
      </div>

      <Button 
        variant={isPopular ? 'primary' : 'outline'} 
        className={`w-full py-6 text-sm uppercase tracking-widest shadow-lg ${isPopular ? 'shadow-blue-200 dark:shadow-none' : ''}`}
      >
        {buttonText}
      </Button>
    </div>
  );
};
