import React, { useEffect, useMemo, useState } from 'react';
import { FormField } from '../molecules/FormField';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { useNavigate } from 'react-router-dom';
import type { SubscriptionSettings } from '../../../types/settings';
import { useAuth } from '../../../context/AuthContext';
import {
    fetchSubscriptionPlans,
    fetchSubscriptionUsage,
    type SubscriptionFeatureUsage,
    type SubscriptionPlan,
} from '../../../services/subscriptionPlansService';

interface SubscriptionSettingsCardProps {
    data: SubscriptionSettings;
    onChange: (updates: Partial<SubscriptionSettings>) => void;
    onPaymentEdit: () => void;
}

export const SubscriptionSettingsCard: React.FC<SubscriptionSettingsCardProps> = ({
    data,
    onChange,
    onPaymentEdit
}) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [featureUsage, setFeatureUsage] = useState<SubscriptionFeatureUsage[]>([]);
    const [usageLoading, setUsageLoading] = useState(true);
    const [usageError, setUsageError] = useState<string | null>(null);

    useEffect(() => {
        const loadPlans = async () => {
            setIsLoading(true);
            setErrorMessage(null);
            try {
                const loadedPlans = await fetchSubscriptionPlans();
                setPlans(loadedPlans);
                if (loadedPlans.length > 0 && !loadedPlans.some((plan) => plan.id === data.plan)) {
                    onChange({ plan: loadedPlans[0].id });
                }
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
            setUsageLoading(false);
            setUsageError('No user session found for usage metrics.');
            return;
        }

        const loadUsage = async () => {
            setUsageLoading(true);
            setUsageError(null);
            try {
                const usage = await fetchSubscriptionUsage(userId);
                setFeatureUsage(usage.features || []);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to load feature usage';
                setUsageError(message);
            } finally {
                setUsageLoading(false);
            }
        };

        void loadUsage();
    }, [user?.user_id]);

    const selectedPlan = useMemo(
        () => plans.find((plan) => plan.id === data.plan) ?? null,
        [plans, data.plan],
    );

    return (
        <div className="flex flex-col">
            {/* Current plan + action */}
            <div className="flex items-center justify-between gap-3 mb-4 py-2">
                <div>
                    <p className="text-xs text-gray-500 mb-1 uppercase tracking-widest font-bold">Current Plan</p>
                    {isLoading ? (
                        <p className="text-sm text-gray-400 font-semibold">Loading plans...</p>
                    ) : errorMessage ? (
                        <p className="text-sm text-red-500 font-semibold">{errorMessage}</p>
                    ) : (
                        <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                            {selectedPlan?.name || 'Unknown'}
                        </p>
                    )}
                </div>
                <Button
                    variant="outline"
                    onClick={() => navigate('/subscription')}
                >
                    Change Plan
                </Button>
            </div>

            <div className="mb-6 pb-6 border-b border-gray-100 dark:border-slate-700/50" />

            <FormField label="Feature Usage & Balance">
                <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden max-w-[680px]">
                    <div className="grid grid-cols-12 bg-gray-50 dark:bg-slate-800/60 text-xs uppercase tracking-widest font-bold text-gray-500 dark:text-slate-400 px-4 py-2">
                        <div className="col-span-5">Feature</div>
                        <div className="col-span-2 text-right">Used</div>
                        <div className="col-span-2 text-right">Limit</div>
                        <div className="col-span-3 text-right">Balance</div>
                    </div>

                    {usageLoading ? (
                        <div className="px-4 py-3 text-sm text-gray-500">Loading usage...</div>
                    ) : usageError ? (
                        <div className="px-4 py-3 text-sm text-red-500">{usageError}</div>
                    ) : featureUsage.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500">No usage data available for this plan.</div>
                    ) : (
                        featureUsage.map((feature) => (
                            <div
                                key={feature.id}
                                className="grid grid-cols-12 px-4 py-2.5 text-sm border-t border-gray-100 dark:border-slate-700/50"
                            >
                                <div className="col-span-5 font-medium text-gray-800 dark:text-slate-100">{feature.name}</div>
                                <div className="col-span-2 text-right text-gray-700 dark:text-slate-300">{feature.used}</div>
                                <div className="col-span-2 text-right text-gray-700 dark:text-slate-300">
                                    {feature.limit === null ? 'Unlimited' : feature.limit}
                                </div>
                                <div className="col-span-3 text-right font-semibold text-blue-600 dark:text-blue-400">
                                    {feature.balance === null ? 'Unlimited' : feature.balance}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </FormField>

            <FormField label="Billing Email">
                <Input
                    type="email"
                    value={data.billingEmail}
                    onChange={(e) => onChange({ billingEmail: e.target.value })}
                />
            </FormField>

            <FormField label="Payment Method">
                <div className="flex items-center justify-between p-3.5 px-4 border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 rounded-xl max-w-[400px]">
                    <div className="flex items-center gap-4">
                        <div className="text-2xl drop-shadow-sm">💳</div>
                        <div className="flex flex-col">
                            <div className="text-[13px] font-black tracking-tight text-gray-700 dark:text-gray-200">Visa ****1234</div>
                            <div className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Expires 12/26</div>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onPaymentEdit} className="text-[#4e80ee] active:scale-95">Edit</Button>
                </div>
            </FormField>
        </div>
    );
};
