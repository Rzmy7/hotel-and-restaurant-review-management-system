import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../../ui/Button';
import { useNavigate } from 'react-router-dom';
import type { SubscriptionSettings } from '../../../types/settings';
import { useAuth } from '../../../contexts/AuthContext';
import {
    fetchSubscriptionPlans,
    fetchSubscriptionUsage,
    fetchUserOrganizations,
    type SubscriptionFeatureUsage,
    type SubscriptionPlan,
} from '../../../services/subscriptionPlansService';
// Reuse the exact same atoms from the subscription page for visual consistency
import { PlanIcon } from '../../subscription/atoms/PlanIcon';
import { FeatureItem } from '../../subscription/atoms/FeatureItem';
import { PricingBadge } from '../../subscription/atoms/PricingBadge';

const PLAN_ALIASES: Record<string, string> = {
    professional: 'pro',
    enterprise: 'enterprise',
    free: 'free',
    starter: 'starter',
    pro: 'pro',
};

const normalizePlanKey = (value: string | null | undefined): string =>
    (value || '').trim().toLowerCase();

type PlanTier = 'starter' | 'professional' | 'enterprise';

const toPlanTier = (plan: SubscriptionPlan, index: number): PlanTier => {
    if (plan.iconName === 'zap') return 'starter';
    if (plan.iconName === 'crown' || plan.iconName === 'building') return 'enterprise';
    if (plan.iconName === 'star') return 'professional';
    return index % 3 === 0 ? 'starter' : index % 3 === 1 ? 'professional' : 'enterprise';
};

const toFeatureLabel = (feature: SubscriptionPlan['features'][number]): string => {
    if (!feature.enabled) return '';
    if (feature.limit === null || feature.limit === undefined) return feature.name;
    return `${feature.name}: ${feature.limit}`;
};

interface SubscriptionSettingsCardProps {
    data: SubscriptionSettings;
    onChange: (updates: Partial<SubscriptionSettings>) => void;
    onPaymentEdit: () => void;
}

export const SubscriptionSettingsCard: React.FC<SubscriptionSettingsCardProps> = ({
    data,
    onPaymentEdit,
}) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [featureUsage, setFeatureUsage] = useState<SubscriptionFeatureUsage[]>([]);
    const [usagePlanId, setUsagePlanId] = useState<string | null>(null);
    const [usagePlanName, setUsagePlanName] = useState<string | null>(null);
    const [usageLoading, setUsageLoading] = useState(true);
    const [usageError, setUsageError] = useState<string | null>(null);

    useEffect(() => {
        const loadPlans = async () => {
            setIsLoading(true);
            setErrorMessage(null);
            try {
                const loadedPlans = await fetchSubscriptionPlans();
                setPlans(loadedPlans);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to load plans';
                setErrorMessage(message);
            } finally {
                setIsLoading(false);
            }
        };

        void loadPlans();
    }, [data.plan]);

    useEffect(() => {
        const userId = user?.user_id?.trim();
        if (!userId) {
            setFeatureUsage([]);
            setUsagePlanId(null);
            setUsagePlanName(null);
            setUsageLoading(false);
            setUsageError('No user session found for usage metrics.');
            return;
        }

        const loadUsage = async () => {
            setUsageLoading(true);
            setUsageError(null);
            try {
                const [usage, organizations] = await Promise.all([
                    fetchSubscriptionUsage(userId),
                    fetchUserOrganizations(),
                ]);

                const organizationsCount = organizations.length;
                const nextFeatureUsage = (usage.features || []).map((feature) => {
                    if (feature.key !== 'organizations') return feature;
                    const balance = feature.limit === null ? null : Math.max(feature.limit - organizationsCount, 0);
                    return { ...feature, used: organizationsCount, balance };
                });

                setFeatureUsage(nextFeatureUsage);
                setUsagePlanId(usage.planId || null);
                setUsagePlanName(usage.planName || null);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to load feature usage';
                setUsageError(message);
            } finally {
                setUsageLoading(false);
            }
        };

        void loadUsage();
    }, [user?.user_id]);

    const selectedPlan = useMemo(() => {
        const planKey = normalizePlanKey(usagePlanId || usagePlanName || data.plan);
        if (!planKey) return null;

        const aliasedPlanKey = PLAN_ALIASES[planKey] || planKey;

        return (
            plans.find((plan) => {
                const idKey = normalizePlanKey(plan.id);
                const nameKey = normalizePlanKey(plan.name);
                return idKey === aliasedPlanKey || nameKey === aliasedPlanKey || nameKey === planKey;
            }) ?? null
        );
    }, [plans, data.plan, usagePlanId, usagePlanName]);

    const planIndex = useMemo(() => {
        if (!selectedPlan) return 0;
        return plans.findIndex((p) => p.id === selectedPlan.id);
    }, [plans, selectedPlan]);

    const planTier = useMemo(
        () => (selectedPlan ? toPlanTier(selectedPlan, planIndex) : 'starter'),
        [selectedPlan, planIndex],
    );

    const planFeatureLabels = useMemo(
        () =>
            (selectedPlan?.features ?? [])
                .map(toFeatureLabel)
                .filter((l) => l.length > 0),
        [selectedPlan],
    );

    return (
        <div className="flex flex-col gap-6 w-full min-w-0">
            {/* Two-column layout: current plan (left) + feature usage & balance (right) side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,360px)_1fr] xl:grid-cols-[minmax(320px,380px)_1fr] gap-8 items-start w-full min-w-0">

                {/* ── LEFT: Current Plan Card ── */}
                {/* Exact same visual design as PricingCard on the subscription page */}
                <div className={`relative flex flex-col p-8 rounded-[2rem] border bg-white dark:bg-slate-800/80 backdrop-blur-sm shadow-xl transition-all duration-300 min-w-0
                    ${selectedPlan?.isPopular
                        ? 'border-blue-200 shadow-blue-500/10 dark:border-blue-900/50'
                        : 'border-gray-100 dark:border-slate-700/50 shadow-gray-200/20 dark:shadow-none'}
                `}>
                    {/* "Current Plan" badge using same PricingBadge atom */}
                    <PricingBadge label="Current Plan" />

                    {isLoading ? (
                        <div className="space-y-3 animate-pulse pt-6">
                            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-slate-700" />
                            <div className="h-5 w-32 rounded-lg bg-gray-100 dark:bg-slate-700" />
                            <div className="h-10 w-24 rounded-lg bg-gray-100 dark:bg-slate-700" />
                            <div className="space-y-2 pt-2">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-4 w-full rounded bg-gray-100 dark:bg-slate-700" />
                                ))}
                            </div>
                        </div>
                    ) : errorMessage ? (
                        <p className="text-sm text-red-500 font-semibold mt-6">{errorMessage}</p>
                    ) : selectedPlan ? (
                        <>
                            {/* Plan icon + name — same layout as PricingCard */}
                            <div className="flex flex-col gap-2 mb-4 mt-2">
                                <PlanIcon tier={planTier} />
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
                                        {selectedPlan.name}
                                    </h3>
                                    <p className="text-[13px] font-medium text-gray-400 dark:text-slate-500 mt-1">
                                        {selectedPlan.description}
                                    </p>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-gray-900 dark:text-white">
                                        ${selectedPlan.monthlyPrice}
                                    </span>
                                    <span className="text-[14px] font-bold text-gray-400 dark:text-slate-500">/mo</span>
                                </div>
                            </div>

                            {/* Feature list — same FeatureItem atom */}
                            {planFeatureLabels.length > 0 && (
                                <div className="flex-1 space-y-2 mb-5">
                                    <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                                        What's included
                                    </p>
                                    {planFeatureLabels.map((label, idx) => (
                                        <FeatureItem key={idx} label={label} />
                                    ))}
                                </div>
                            )}

                            {/* Change Plan CTA — same Button variant as PricingCard */}
                            <Button
                                variant="outline"
                                className="w-full py-5 text-sm uppercase tracking-widest"
                                onClick={() => navigate('/subscription')}
                            >
                                Change Plan
                            </Button>
                        </>
                    ) : (
                        <div className="mt-6 flex flex-col gap-4 items-start">
                            <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">No active plan found.</p>
                            <Button variant="primary" onClick={() => navigate('/subscription')}>
                                Choose a Plan
                            </Button>
                        </div>
                    )}
                </div>

                {/* ── RIGHT: Feature Usage & Balance ── */}
                <div className="flex flex-col gap-3 min-w-0 w-full">
                    <div>
                        <h3 className="text-sm font-black text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                            Feature Usage &amp; Balance
                        </h3>
                        <p className="text-[11px] text-gray-400 dark:text-slate-500 font-medium mt-0.5">
                            Track how much of your plan you're using
                        </p>
                    </div>

                    <div className="border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm w-full min-w-0">
                        {/* Table header */}
                        <div className="grid grid-cols-12 bg-gray-50 dark:bg-slate-800/60 text-[10px] uppercase tracking-widest font-black text-gray-400 dark:text-slate-500 px-5 py-3 border-b border-gray-100 dark:border-slate-700/50">
                            <div className="col-span-5">Feature</div>
                            <div className="col-span-2 text-right">Used</div>
                            <div className="col-span-2 text-right">Limit</div>
                            <div className="col-span-3 text-right">Balance</div>
                        </div>

                        {usageLoading ? (
                            <div className="space-y-3 p-5 animate-pulse">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="h-10 rounded-xl bg-gray-100 dark:bg-slate-700/60" />
                                ))}
                            </div>
                        ) : usageError ? (
                            <div className="px-5 py-4 text-sm text-red-500">{usageError}</div>
                        ) : featureUsage.length === 0 ? (
                            <div className="px-5 py-4 text-sm text-gray-500 dark:text-slate-400">
                                No usage data available for this plan.
                            </div>
                        ) : (
                            featureUsage.map((feature) => {
                                // Compute progress percentage for the bar
                                const usedNum = typeof feature.used === 'number' ? feature.used : 0;
                                const limitNum = typeof feature.limit === 'number' ? feature.limit : null;
                                const pct = limitNum && limitNum > 0 ? Math.min((usedNum / limitNum) * 100, 100) : 0;
                                const isNearLimit = pct >= 80;
                                const isAtLimit = pct >= 100;

                                return (
                                    <div
                                        key={feature.id}
                                        className="px-5 py-3 border-t border-gray-100 dark:border-slate-700/50 first:border-t-0 hover:bg-gray-50/60 dark:hover:bg-slate-700/20 transition-colors duration-150"
                                    >
                                        <div className="grid grid-cols-12 text-sm items-center">
                                            <div className="col-span-5 font-semibold text-gray-800 dark:text-slate-100">
                                                {feature.name}
                                            </div>
                                            <div className="col-span-2 text-right text-gray-600 dark:text-slate-300 font-medium">
                                                {feature.supportsLimit ? feature.used : '—'}
                                            </div>
                                            <div className="col-span-2 text-right text-gray-600 dark:text-slate-300 font-medium">
                                                {feature.supportsLimit
                                                    ? feature.limit === null
                                                        ? '∞'
                                                        : feature.limit
                                                    : '—'}
                                            </div>
                                            <div className={`col-span-3 text-right font-black text-[13px] ${
                                                isAtLimit
                                                    ? 'text-red-500 dark:text-red-400'
                                                    : isNearLimit
                                                    ? 'text-amber-500 dark:text-amber-400'
                                                    : 'text-[#4e80ee] dark:text-blue-400'
                                            }`}>
                                                {feature.supportsLimit
                                                    ? feature.balance === null
                                                        ? 'Unlimited'
                                                        : feature.balance
                                                    : 'Included'}
                                            </div>
                                        </div>
                                        {/* Progress bar — only for features with a limit */}
                                        {feature.supportsLimit && limitNum !== null && (
                                            <div className="mt-2 w-full h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${
                                                        isAtLimit
                                                            ? 'bg-red-400 dark:bg-red-500'
                                                            : isNearLimit
                                                            ? 'bg-amber-400 dark:bg-amber-500'
                                                            : 'bg-[#4e80ee] dark:bg-blue-500'
                                                    }`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Payment Method — kept below usage table */}
                    <div className="mt-2">
                        <h3 className="text-sm font-black text-gray-700 dark:text-slate-200 uppercase tracking-wider mb-3">
                            Payment Method
                        </h3>
                        <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 rounded-2xl">
                            <div className="flex items-center gap-4">
                                <div className="text-2xl drop-shadow-sm">💳</div>
                                <div className="flex flex-col">
                                    <div className="text-[13px] font-black tracking-tight text-gray-700 dark:text-gray-200">Visa ****1234</div>
                                    <div className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Expires 12/26</div>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={onPaymentEdit} className="text-[#4e80ee] active:scale-95">Edit</Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
