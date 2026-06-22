import React from 'react';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';
import { cn, Button, type ButtonProps } from '../ui/Button';
import { Check } from 'lucide-react';

export const Pricing = () => {
  const { elementRef, isIntersecting } = useIntersectionObserver<HTMLDivElement>();

  const tiers: {
    name: string;
    price: string;
    description: string;
    features: string[];
    buttonText: string;
    variant: ButtonProps['variant'];
    highlighted?: boolean;
  }[] = [
    {
      name: "Starter",
      price: "$29",
      description: "Perfect for small businesses starting their digital journey.",
      features: ["Up to 3 Sources", "AI Sentiment Analysis", "Weekly Reports", "Email Support"],
      buttonText: "Start Starter",
      variant: "outline"
    },
    {
      name: "Professional",
      price: "$79",
      description: "The most popular choice for growing restaurants and hotels.",
      features: ["Unlimited Sources", "AI Response Studio", "Daily Reports", "Competitor Tracking", "Priority Support"],
      buttonText: "Go Pro",
      variant: "primary",
      highlighted: true
    },
    {
      name: "Enterprise",
      price: "$199",
      description: "Advanced solutions for large hospitality chains and agencies.",
      features: ["Custom Integrations", "API Access", "Dedicated Account Manager", "White-label Reports", "24/7 Phone Support"],
      buttonText: "Contact Sales",
      variant: "outline"
    }
  ];

  return (
    <section id="pricing" className="py-24 bg-white dark:bg-slate-900">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Simple, Transparent <span className="text-blue-600">Pricing</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Choose the plan that fits your business needs. No hidden fees.
          </p>
        </div>

        <div 
          ref={elementRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
        >
          {tiers.map((tier, index) => (
            <div
              key={index}
              className={cn(
                "relative p-8 rounded-[2.5rem] border transition-all duration-300 staggered-item",
                tier.highlighted 
                  ? "bg-white dark:bg-slate-800 border-blue-500 shadow-2xl scale-105 z-10" 
                  : "bg-gray-50 dark:bg-slate-900/50 border-gray-100 dark:border-slate-800",
                isIntersecting && "animate-fadeInUp"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {tier.highlighted && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
                  Most Popular
                </div>
              )}
              
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{tier.name}</h3>
                <div className="flex items-baseline mb-4">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">{tier.price}</span>
                  <span className="text-gray-500 ml-2">/month</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{tier.description}</p>
              </div>

              <ul className="space-y-4 mb-8">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                    <Check className="text-blue-600 h-5 w-5 mr-3 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button 
                variant={tier.variant} 
                className="w-full rounded-2xl"
                size="lg"
              >
                {tier.buttonText}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
