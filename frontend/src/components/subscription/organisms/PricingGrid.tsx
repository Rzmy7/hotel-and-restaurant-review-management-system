import React from 'react';
import { PricingCard } from '../molecules/PricingCard';

/**
 * PricingGrid Organism.
 * Manages the layout of pricing tiers.
 */
export const PricingGrid: React.FC = () => {
  const plans = [
    {
      tier: 'starter' as const,
      title: 'Starter',
      price: '0',
      period: 'mo',
      description: 'Perfect for small properties.',
      buttonText: 'Get Started',
      features: [
        '50 reviews/month',
        'Email notifications',
        'Basic sentiment analysis',
        'Community support',
        'Single property manage'
      ]
    },
    {
      tier: 'professional' as const,
      title: 'Professional',
      price: '49',
      period: 'mo',
      description: 'Best for growing businesses.',
      buttonText: 'Upgrade Now',
      isPopular: true,
      features: [
        '2,500 reviews/month',
        'AI response generation',
        'Advanced insights suite',
        'Competitor tracking',
        'Priority email support'
      ]
    },
    {
      tier: 'enterprise' as const,
      title: 'Enterprise',
      price: '199',
      period: 'mo',
      description: 'For hotel chains and groups.',
      buttonText: 'Contact Sales',
      features: [
        'Unlimited reviews',
        'Custom AI training',
        'API access & webhooks',
        'Dedicated success manager',
        'Multi-property groups'
      ]
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto px-4 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      {plans.map((plan, idx) => (
        <PricingCard key={idx} {...plan} />
      ))}
    </div>
  );
};
