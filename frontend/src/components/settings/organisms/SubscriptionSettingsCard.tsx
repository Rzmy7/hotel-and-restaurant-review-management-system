import React, { useEffect, useMemo, useState } from 'react';
import { FormField } from '../molecules/FormField';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { useNavigate } from 'react-router-dom';
import type { SubscriptionSettings } from '../../../types/settings';
import { fetchSubscriptionPlans, type SubscriptionPlan } from '../../../services/subscriptionPlansService';

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

    const selectedPlan = useMemo(
        () => plans.find((plan) => plan.id === data.plan) ?? null,
        [plans, data.plan],
    );

    const selectedPlanSummary = useMemo(() => {
        if (!selectedPlan) {
            return 'Select a plan to view limits and included features';
        }
        const enabledFeatureCount = selectedPlan.features.filter((feature) => feature.enabled).length;
        return `${selectedPlan.name} • ${enabledFeatureCount} enabled features`;
    }, [selectedPlan]);

    return (
        <div className="flex flex-col">
            {/* Plan Selection */}
            <div className="flex gap-3 mb-4 py-2">
                {isLoading ? (
                    <div className="text-sm text-gray-400 font-semibold">Loading plans...</div>
                ) : errorMessage ? (
                    <div className="text-sm text-red-500 font-semibold">{errorMessage}</div>
                ) : plans.length === 0 ? (
                    <div className="text-sm text-gray-400 font-semibold">No active plans available.</div>
                ) : (
                    plans.map((plan) => (
                        <Button
                            key={plan.id}
                            variant={data.plan === plan.id ? 'primary' : 'outline'}
                            onClick={() => onChange({ plan: plan.id })}
                        >
                            {plan.name}
                        </Button>
                    ))
                )}
                <Button
                    variant="outline"
                    onClick={() => navigate('/subscription')}
                >
                    Manage Plans
                </Button>
            </div>

            <div className="text-gray-400 dark:text-gray-500 font-bold text-[13px] mb-6 pb-6 border-b border-gray-100 dark:border-slate-700/50 uppercase tracking-widest">
                {selectedPlanSummary}
            </div>

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
