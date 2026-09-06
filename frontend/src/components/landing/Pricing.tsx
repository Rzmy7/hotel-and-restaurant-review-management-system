import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';
import { cn, Button } from '../ui/Button';
import { Check, Sparkles, RefreshCw } from 'lucide-react';
import { fetchSubscriptionPlans, type SubscriptionPlan } from '../../services/subscriptionPlansService';

const formatFeatureLabel = (feature: SubscriptionPlan['features'][number]): string => {
  if (!feature.enabled) return '';
  if (feature.limit === null || feature.limit === undefined) {
    return feature.name;
  }
  if (feature.key === 'scraping_frequency') {
    if (feature.limit === 0) return 'Daily automated sync';
    if (feature.limit === 1) return 'On-demand & hourly sync';
    return `${feature.name}: Every ${feature.limit} hrs`;
  }
  return `${feature.name}: ${feature.limit.toLocaleString()}`;
};

export const Pricing = () => {
  const { elementRef, isIntersecting } = useIntersectionObserver<HTMLDivElement>();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnnual, setIsAnnual] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlans = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const activePlans = await fetchSubscriptionPlans();
      setPlans(activePlans);
    } catch (err) {
      console.error('Failed to load subscription plans:', err);
      setError('Unable to fetch live pricing at this moment.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPlans();
  }, []);

  return (
    <section id="pricing" className="py-24 bg-[#FEFEFE] dark:bg-slate-900 border-b border-gray-100/80 dark:border-slate-800/60">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-[#4E80EE]/10 text-[#4E80EE] border border-[#4E80EE]/20 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
            <Sparkles size={14} />
            <span>Live Subscription Plans</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Simple, Transparent <span className="text-[#4E80EE]">Pricing</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Choose the plan that fits your business needs. No hidden setup fees.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center mt-8 space-x-4">
            <span className={cn("text-sm font-semibold transition-colors", !isAnnual ? "text-gray-900 dark:text-white" : "text-gray-500")}>
              Monthly
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isAnnual}
              onClick={() => setIsAnnual(!isAnnual)}
              className={cn(
                "relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#4E80EE] focus:ring-offset-2",
                isAnnual ? "bg-[#4E80EE]" : "bg-gray-200 dark:bg-slate-700"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                  isAnnual ? "translate-x-7" : "translate-x-0"
                )}
              />
            </button>
            <span className={cn("text-sm font-semibold flex items-center space-x-1.5 transition-colors", isAnnual ? "text-gray-900 dark:text-white" : "text-gray-500")}>
              <span>Annual</span>
              <span className="bg-[#4E80EE]/15 text-[#4E80EE] text-xs font-bold px-2 py-0.5 rounded-full">
                Save up to 20%
              </span>
            </span>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[1, 2, 3].map((i) => (
              <div 
                key={i} 
                className="p-8 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 bg-[#F9FAFB] dark:bg-slate-900/50 animate-pulse space-y-6"
              >
                <div className="w-24 h-6 bg-gray-200 dark:bg-slate-700 rounded-lg" />
                <div className="w-36 h-10 bg-gray-200 dark:bg-slate-700 rounded-lg" />
                <div className="w-full h-12 bg-gray-200 dark:bg-slate-700 rounded-lg" />
                <div className="space-y-3 pt-4">
                  <div className="w-5/6 h-4 bg-gray-200 dark:bg-slate-700 rounded" />
                  <div className="w-4/6 h-4 bg-gray-200 dark:bg-slate-700 rounded" />
                  <div className="w-3/4 h-4 bg-gray-200 dark:bg-slate-700 rounded" />
                </div>
                <div className="w-full h-12 bg-gray-200 dark:bg-slate-700 rounded-2xl pt-2" />
              </div>
            ))}
          </div>
        )}

        {/* Error / Empty State */}
        {!isLoading && (error || plans.length === 0) && (
          <div className="max-w-xl mx-auto text-center py-12 px-6 bg-[#FEFEFE] dark:bg-slate-800/50 rounded-3xl border border-gray-200 dark:border-slate-700">
            <p className="text-gray-700 dark:text-gray-300 font-medium mb-4">
              {error || 'No active public plans are currently listed.'}
            </p>
            <div className="flex items-center justify-center space-x-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => void loadPlans()}
                leftIcon={<RefreshCw size={14} />}
              >
                Retry
              </Button>
              <Link to="/signup">
                <Button size="sm" className="bg-[#4E80EE] hover:bg-[#3A66DE] text-white">Get Started Free</Button>
              </Link>
            </div>
          </div>
        )}

        {/* Dynamic Plans Display */}
        {!isLoading && plans.length > 0 && (
          <div 
            ref={elementRef}
            className={cn(
              "grid gap-8 max-w-6xl mx-auto items-stretch",
              plans.length === 1 ? "grid-cols-1 max-w-md" : plans.length === 2 ? "grid-cols-1 md:grid-cols-2 max-w-4xl" : "grid-cols-1 md:grid-cols-3"
            )}
          >
            {plans.map((plan, index) => {
              const price = isAnnual && plan.annualPrice > 0 ? plan.annualPrice : plan.monthlyPrice;
              const period = isAnnual && plan.annualPrice > 0 ? '/year' : '/month';
              const enabledFeatures = plan.features.filter((f) => f.enabled);
              const isEnterprise = plan.name.toLowerCase().includes('enterprise');

              return (
                <div
                  key={plan.id}
                  className={cn(
                    "relative p-8 rounded-[2.5rem] border transition-all duration-300 flex flex-col justify-between staggered-item",
                    plan.isPopular 
                      ? "bg-[#FEFEFE] dark:bg-slate-800 border-2 border-[#4E80EE] shadow-2xl shadow-[#4E80EE]/15 scale-105 z-10" 
                      : "bg-[#FEFEFE] dark:bg-slate-900/50 border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-[#4E80EE]/30",
                    isIntersecting && "animate-fadeInUp"
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {plan.isPopular && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#4E80EE] text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md shadow-[#4E80EE]/30">
                      Most Popular
                    </div>
                  )}
                  
                  <div>
                    <div className="mb-6">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                      <div className="flex items-baseline mb-3">
                        <span className="text-4xl font-bold text-gray-900 dark:text-white">
                          {price === 0 ? 'Free' : `$${price}`}
                        </span>
                        {price > 0 && (
                          <span className="text-gray-500 dark:text-gray-400 ml-2 text-sm font-medium">{period}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 min-h-[40px] leading-relaxed">
                        {plan.description}
                      </p>
                    </div>

                    <div className="border-t border-gray-100 dark:border-slate-700/50 pt-6 mb-8">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Included Features</p>
                      <ul className="space-y-3">
                        {enabledFeatures.map((feature) => {
                          const label = formatFeatureLabel(feature);
                          if (!label) return null;
                          return (
                            <li key={feature.id} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                              <Check className="text-[#4E80EE] shrink-0 h-4 w-4 mr-3" />
                              <span>{label}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-4">
                    {isEnterprise ? (
                      <a href="mailto:sales@reviewmate.com" className="block w-full">
                        <Button 
                          variant="outline" 
                          className="w-full rounded-2xl hover:border-[#4E80EE] hover:text-[#4E80EE]"
                          size="lg"
                        >
                          Contact Sales
                        </Button>
                      </a>
                    ) : (
                      <Link to={`/signup?plan=${encodeURIComponent(plan.id)}`} className="block w-full">
                        <Button 
                          variant={plan.isPopular ? "primary" : "outline"} 
                          className={cn(
                            "w-full rounded-2xl",
                            plan.isPopular 
                              ? "bg-[#4E80EE] hover:bg-[#3A66DE] text-white shadow-md shadow-[#4E80EE]/25 border-transparent"
                              : "hover:border-[#4E80EE] hover:text-[#4E80EE]"
                          )}
                          size="lg"
                        >
                          {price === 0 ? "Get Started Free" : `Choose ${plan.name}`}
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

