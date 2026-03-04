import React from 'react';
import { CreditCard } from 'lucide-react';
import { Card } from '../../ui/Card';
import { SectionHeader } from '../molecules/SectionHeader';
import { FormField } from '../molecules/FormField';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { SubscriptionSettings } from '../../../types/settings';

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
    return (
        <Card className="p-6 md:p-8">
            <SectionHeader icon={CreditCard} title="Subscription & Billing" />
            <div className="flex flex-col">
                {/* Plan Selection */}
                <div className="flex gap-3 mb-4 py-2">
                    <Button
                        variant={data.plan === 'professional' ? 'primary' : 'outline'}
                        onClick={() => onChange({ plan: 'professional' })}
                    >
                        Professional Plan
                    </Button>
                    <Button
                        variant={data.plan === 'upgrade' ? 'primary' : 'outline'}
                        onClick={() => onChange({ plan: 'upgrade' })}
                    >
                        Upgrade Plan
                    </Button>
                </div>

                <div className="text-gray-400 font-bold text-[13px] mb-6 pb-6 border-b border-gray-100 uppercase tracking-widest">
                    2,500 reviews/month • 5 properties • AI responses
                </div>

                <FormField label="Billing Email">
                    <Input
                        type="email"
                        value={data.billingEmail}
                        onChange={(e) => onChange({ billingEmail: e.target.value })}
                    />
                </FormField>

                <FormField label="Payment Method">
                    <div className="flex items-center justify-between p-3.5 px-4 border border-gray-200 bg-gray-50/50 rounded-xl max-w-[400px]">
                        <div className="flex items-center gap-4">
                            <div className="text-2xl drop-shadow-sm">💳</div>
                            <div className="flex flex-col">
                                <div className="text-[13px] font-black tracking-tight text-gray-700">Visa ****1234</div>
                                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Expires 12/26</div>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onPaymentEdit} className="text-[#4e80ee] active:scale-95">Edit</Button>
                    </div>
                </FormField>
            </div>
        </Card>
    );
};
