import React, { useEffect, useMemo, useState } from 'react';
import {
    Check,
    ChevronDown,
    Crown,
    DollarSign,
    Pencil,
    Plus,
    Star,
    Trash2,
    X,
    Zap,
    Building2,
    ToggleLeft,
    ToggleRight,
    AlertTriangle,
} from 'lucide-react';

import { Alert } from '../components/Alert';
import { SubscriptionPlansSkeleton } from './SubscriptionPlansSkeleton';
import {
    createSubscriptionPlan,
    deleteSubscriptionPlan,
    fetchSubscriptionFeatures,
    fetchSubscriptionPlans,
    type PlanIconName,
    type SubscriptionFeature,
    type SubscriptionPlan,
    type SubscriptionPlanFeature,
    type SubscriptionPlanUpsertPayload,
    updateSubscriptionPlan,
} from '../services/subscriptionPlansService';

type BillingCycle = 'monthly' | 'annual';

type PlanDraft = Omit<SubscriptionPlan, 'id'>;

const PLAN_COLORS = [
    { label: 'Slate', value: 'from-slate-500 to-slate-600' },
    { label: 'Blue', value: 'from-blue-500 to-blue-600' },
    { label: 'Violet', value: 'from-violet-500 to-purple-600' },
    { label: 'Amber', value: 'from-amber-500 to-orange-600' },
    { label: 'Green', value: 'from-emerald-500 to-green-600' },
    { label: 'Rose', value: 'from-rose-500 to-pink-600' },
    { label: 'Cyan', value: 'from-cyan-500 to-sky-600' },
    { label: 'Indigo', value: 'from-indigo-500 to-indigo-600' },
];

const PlanIcon: React.FC<{ name: PlanIconName; className?: string }> = ({ name, className = '' }) => {
    const props = { size: 20, className };
    if (name === 'crown') return <Crown {...props} />;
    if (name === 'star') return <Star {...props} />;
    if (name === 'building') return <Building2 {...props} />;
    return <Zap {...props} />;
};

const createDraftFromFeatures = (featuresCatalog: SubscriptionFeature[]): PlanDraft => ({
    name: '',
    description: '',
    monthlyPrice: 0,
    annualPrice: 0,
    currency: 'USD',
    isPopular: false,
    isActive: true,
    color: 'from-blue-500 to-blue-600',
    iconName: 'star',
    features: featuresCatalog.map((feature) => ({
        ...feature,
        enabled: false,
        limit: null,
    })),
});

const ensureAllFeatures = (
    planFeatures: SubscriptionPlanFeature[],
    featuresCatalog: SubscriptionFeature[],
): SubscriptionPlanFeature[] => {
    const planFeatureMap = new Map(planFeatures.map((feature) => [feature.id, feature]));
    return featuresCatalog.map((feature) => {
        const existing = planFeatureMap.get(feature.id);
        if (existing) {
            return {
                ...feature,
                enabled: existing.enabled,
                limit: existing.limit,
            };
        }

        return {
            ...feature,
            enabled: false,
            limit: null,
        };
    });
};

const toPlanPayload = (data: PlanDraft): SubscriptionPlanUpsertPayload => ({
    name: data.name.trim(),
    description: data.description.trim(),
    monthlyPrice: Number.isFinite(data.monthlyPrice) ? data.monthlyPrice : 0,
    annualPrice: Number.isFinite(data.annualPrice) ? data.annualPrice : 0,
    currency: data.currency.trim() || 'USD',
    isPopular: data.isPopular,
    isActive: data.isActive,
    color: data.color,
    iconName: data.iconName,
    features: data.features.map((feature) => ({
        featureId: feature.id,
        enabled: feature.enabled,
        limit: feature.enabled && feature.supportsLimit ? feature.limit : null,
    })),
});

interface PlanCardProps {
    plan: SubscriptionPlan;
    billingCycle: BillingCycle;
    onEdit: (plan: SubscriptionPlan) => void;
    onDelete: (id: string) => void;
    onToggleActive: (plan: SubscriptionPlan) => void;
    isUpdating: boolean;
}

const PlanCard: React.FC<PlanCardProps> = ({
    plan,
    billingCycle,
    onEdit,
    onDelete,
    onToggleActive,
    isUpdating,
}) => {
    const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;

    return (
        <div className={`relative bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col transition-all duration-200 hover:shadow-md ${!plan.isActive ? 'opacity-60' : ''}`}>
            <div className={`bg-gradient-to-r ${plan.color} p-5 text-white`}>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                            <PlanIcon name={plan.iconName} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold leading-tight">{plan.name}</h3>
                            {plan.isPopular && (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-white/25 px-2 py-0.5 rounded-full mt-0.5">
                                    <Star size={10} fill="currentColor" /> Most Popular
                                </span>
                            )}
                        </div>
                    </div>
                    {!plan.isActive && (
                        <span className="text-xs font-medium bg-black/20 px-2 py-0.5 rounded-full">Inactive</span>
                    )}
                </div>

                <div className="mt-4">
                    {price === 0 ? (
                        <span className="text-3xl font-extrabold">Free</span>
                    ) : (
                        <div className="flex items-baseline gap-1">
                            <span className="text-sm font-medium opacity-90">
                                {plan.currency === 'USD' ? '$' : plan.currency}
                            </span>
                            <span className="text-3xl font-extrabold">{price}</span>
                            <span className="text-sm opacity-80">/ mo</span>
                        </div>
                    )}
                    {price > 0 && billingCycle === 'annual' && (
                        <p className="text-xs opacity-75 mt-0.5">
                            Billed annually · Save ${(plan.monthlyPrice - plan.annualPrice) * 12}/yr
                        </p>
                    )}
                </div>

                <p className="mt-2 text-sm opacity-80 leading-snug">{plan.description}</p>
            </div>

            <div className="flex-1 p-5">
                <ul className="space-y-2.5">
                    {plan.features.map((feature) => (
                        <li key={`${plan.id}-${feature.id}`} className="flex items-start gap-2.5">
                            <div className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${feature.enabled ? 'bg-green-100' : 'bg-gray-100 dark:bg-slate-700'}`}>
                                {feature.enabled ? (
                                    <Check size={10} className="text-green-600" strokeWidth={3} />
                                ) : (
                                    <X size={10} className="text-gray-400 dark:text-slate-500" strokeWidth={3} />
                                )}
                            </div>
                            <span className={`text-sm leading-snug ${feature.enabled ? 'text-gray-700 dark:text-slate-200' : 'text-gray-400 dark:text-slate-500 line-through'}`}>
                                {feature.name}
                                {feature.enabled && feature.supportsLimit && feature.limit !== null && (
                                    <span className="ml-1 text-xs text-gray-400 dark:text-slate-500 font-medium">(Limit: {feature.limit})</span>
                                )}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="px-5 pb-5 flex items-center gap-2 border-t border-gray-100 dark:border-slate-700 pt-4">
                <button
                    onClick={() => onEdit(plan)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 hover:border-gray-300 dark:hover:border-slate-600 transition-all"
                    disabled={isUpdating}
                >
                    <Pencil size={14} />
                    Edit
                </button>
                <button
                    onClick={() => onToggleActive(plan)}
                    title={plan.isActive ? 'Deactivate plan' : 'Activate plan'}
                    className="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors disabled:opacity-60"
                    disabled={isUpdating}
                >
                    {plan.isActive ? (
                        <ToggleRight size={18} className="text-green-500" />
                    ) : (
                        <ToggleLeft size={18} className="text-gray-400 dark:text-slate-500" />
                    )}
                </button>
                <button
                    onClick={() => onDelete(plan.id)}
                    className="px-3 py-2 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-60"
                    disabled={isUpdating}
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
};

interface PlanModalProps {
    mode: 'add' | 'edit';
    initial: PlanDraft & { id?: string };
    onClose: () => void;
    onSave: (plan: PlanDraft & { id?: string }) => Promise<void>;
    isSaving: boolean;
}

const PlanModal: React.FC<PlanModalProps> = ({ mode, initial, onClose, onSave, isSaving }) => {
    const [form, setForm] = useState<PlanDraft & { id?: string }>({
        ...initial,
        features: initial.features.map((feature) => ({ ...feature })),
    });

    const updateField = <K extends keyof (PlanDraft & { id?: string })>(
        key: K,
        value: (PlanDraft & { id?: string })[K],
    ) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const updateFeature = (featureId: string, patch: Partial<SubscriptionPlanFeature>) => {
        setForm((prev) => ({
            ...prev,
            features: prev.features.map((feature) => {
                if (feature.id !== featureId) {
                    return feature;
                }
                const updated = { ...feature, ...patch };
                if (!updated.enabled || !updated.supportsLimit) {
                    updated.limit = null;
                }
                return updated;
            }),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(form);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={isSaving ? undefined : onClose} />
            <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-slate-700">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {mode === 'add' ? 'Add New Plan' : `Edit "${initial.name}"`}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                            Configure plan pricing and feature availability
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
                        disabled={isSaving}
                    >
                        <X size={20} className="text-gray-500 dark:text-slate-400" />
                    </button>
                </div>

                <form id="plan-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                    <section>
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Plan Info</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">Plan Name *</label>
                                <input
                                    required
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => updateField('name', e.target.value)}
                                    placeholder="e.g. Professional"
                                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">Description</label>
                                <input
                                    type="text"
                                    value={form.description}
                                    onChange={(e) => updateField('description', e.target.value)}
                                    placeholder="Short description of the plan"
                                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">Icon</label>
                                <div className="relative">
                                    <select
                                        value={form.iconName}
                                        onChange={(e) => updateField('iconName', e.target.value as PlanIconName)}
                                        className="w-full appearance-none px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                                    >
                                        <option value="zap">Zap</option>
                                        <option value="star">Star</option>
                                        <option value="crown">Crown</option>
                                        <option value="building">Building</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">Card Color</label>
                                <div className="relative">
                                    <select
                                        value={form.color}
                                        onChange={(e) => updateField('color', e.target.value)}
                                        className="w-full appearance-none px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                                    >
                                        {PLAN_COLORS.map((color) => (
                                            <option key={color.value} value={color.value}>
                                                {color.label}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center gap-6">
                            <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={form.isPopular}
                                    onChange={(e) => updateField('isPopular', e.target.checked)}
                                    className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 dark:text-slate-200 font-medium">Mark as "Most Popular"</span>
                            </label>
                            <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={form.isActive}
                                    onChange={(e) => updateField('isActive', e.target.checked)}
                                    className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 dark:text-slate-200 font-medium">Plan is active</span>
                            </label>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Pricing</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">Currency</label>
                                <div className="relative">
                                    <select
                                        value={form.currency}
                                        onChange={(e) => updateField('currency', e.target.value)}
                                        className="w-full appearance-none px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                                    >
                                        <option value="USD">USD ($)</option>
                                        <option value="EUR">EUR (€)</option>
                                        <option value="GBP">GBP (£)</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">Monthly Price</label>
                                <div className="relative">
                                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                                    <input
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        value={form.monthlyPrice}
                                        onChange={(e) => updateField('monthlyPrice', parseFloat(e.target.value) || 0)}
                                        className="w-full pl-8 pr-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">
                                    Annual Price <span className="text-xs text-gray-400 dark:text-slate-500 font-normal">(/ mo)</span>
                                </label>
                                <div className="relative">
                                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                                    <input
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        value={form.annualPrice}
                                        onChange={(e) => updateField('annualPrice', parseFloat(e.target.value) || 0)}
                                        className="w-full pl-8 pr-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
                            Set price to 0 to display "Free". Annual price is the per-month cost when billed yearly.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Features</h3>
                        <div className="space-y-2">
                            {form.features.map((feature) => (
                                <div key={feature.id} className="p-3 bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => updateFeature(feature.id, { enabled: !feature.enabled })}
                                            className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${feature.enabled ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400 dark:text-slate-500'}`}
                                            title="Toggle feature"
                                        >
                                            {feature.enabled ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                                        </button>

                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium ${feature.enabled ? 'text-gray-700 dark:text-slate-200' : 'text-gray-400 dark:text-slate-500'}`}>
                                                {feature.name}
                                            </p>
                                            {feature.description && (
                                                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{feature.description}</p>
                                            )}
                                        </div>

                                        {feature.supportsLimit && (
                                            <div className="w-36">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={feature.limit ?? ''}
                                                    onChange={(e) => {
                                                        const value = e.target.value.trim();
                                                        updateFeature(feature.id, {
                                                            limit: value === '' ? null : Math.max(0, Number.parseInt(value, 10) || 0),
                                                        });
                                                    }}
                                                    disabled={!feature.enabled}
                                                    placeholder="Limit"
                                                    className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md px-2 py-1.5 text-xs text-gray-600 dark:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400 dark:text-slate-500"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </form>

                <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50/70 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-xl text-sm font-medium hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors disabled:opacity-60"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="plan-form"
                        className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-60"
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving...' : mode === 'add' ? 'Create Plan' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface DeleteDialogProps {
    planName: string;
    onConfirm: () => Promise<void>;
    onCancel: () => void;
    isDeleting: boolean;
}

const DeleteDialog: React.FC<DeleteDialogProps> = ({ planName, onConfirm, onCancel, isDeleting }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={isDeleting ? undefined : onCancel} />
        <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle size={20} className="text-red-600" />
                </div>
                <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">Delete Plan</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">This action cannot be undone</p>
                </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
                Are you sure you want to delete the <span className="font-semibold text-gray-900 dark:text-white">"{planName}"</span> plan?
            </p>
            <div className="flex gap-3">
                <button
                    onClick={onCancel}
                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors disabled:opacity-60"
                    disabled={isDeleting}
                >
                    Cancel
                </button>
                <button
                    onClick={() => {
                        void onConfirm();
                    }}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-60"
                    disabled={isDeleting}
                >
                    {isDeleting ? 'Deleting...' : 'Delete Plan'}
                </button>
            </div>
        </div>
    </div>
);

export const SubscriptionPlans: React.FC = () => {
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [featuresCatalog, setFeaturesCatalog] = useState<SubscriptionFeature[]>([]);
    const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
    const [editingPlan, setEditingPlan] = useState<(PlanDraft & { id?: string }) | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [updatingPlanId, setUpdatingPlanId] = useState<string | null>(null);

    const activePlans = useMemo(() => plans.filter((plan) => plan.isActive).length, [plans]);
    const avgPrice = useMemo(() => {
        const paidPlans = plans.filter((plan) => plan.monthlyPrice > 0);
        if (paidPlans.length === 0) {
            return 0;
        }
        const total = paidPlans.reduce((sum, plan) => sum + plan.monthlyPrice, 0);
        return Math.round(total / paidPlans.length);
    }, [plans]);

    const loadData = async () => {
        setIsLoading(true);
        setErrorMessage(null);
        try {
            const [features, loadedPlans] = await Promise.all([
                fetchSubscriptionFeatures(),
                fetchSubscriptionPlans(),
            ]);

            setFeaturesCatalog(features);
            setPlans(
                loadedPlans.map((plan) => ({
                    ...plan,
                    features: ensureAllFeatures(plan.features, features),
                })),
            );
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load subscription plans.';
            setErrorMessage(message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadData();
    }, []);

    const closeModal = () => {
        setModalMode(null);
        setEditingPlan(null);
    };

    const openAdd = () => {
        setEditingPlan(createDraftFromFeatures(featuresCatalog));
        setModalMode('add');
    };

    const openEdit = (plan: SubscriptionPlan) => {
        setEditingPlan({
            ...plan,
            features: ensureAllFeatures(plan.features, featuresCatalog).map((feature) => ({ ...feature })),
        });
        setModalMode('edit');
    };

    const handleSave = async (data: PlanDraft & { id?: string }) => {
        if (!data.name.trim()) {
            setErrorMessage('Plan name is required.');
            return;
        }

        setIsSaving(true);
        setErrorMessage(null);
        try {
            const payload = toPlanPayload(data);
            if (modalMode === 'add') {
                const created = await createSubscriptionPlan(payload);
                setPlans((prev) => [...prev, { ...created, features: ensureAllFeatures(created.features, featuresCatalog) }]);
            } else if (modalMode === 'edit' && data.id) {
                const updated = await updateSubscriptionPlan(data.id, payload);
                setPlans((prev) =>
                    prev.map((plan) =>
                        plan.id === data.id
                            ? { ...updated, features: ensureAllFeatures(updated.features, featuresCatalog) }
                            : plan,
                    ),
                );
            }
            closeModal();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to save subscription plan.';
            setErrorMessage(message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleActive = async (plan: SubscriptionPlan) => {
        setUpdatingPlanId(plan.id);
        setErrorMessage(null);
        try {
            const payload = toPlanPayload({
                ...plan,
                isActive: !plan.isActive,
            });
            const updated = await updateSubscriptionPlan(plan.id, payload);
            setPlans((prev) => prev.map((existing) => (existing.id === plan.id ? updated : existing)));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update plan status.';
            setErrorMessage(message);
        } finally {
            setUpdatingPlanId(null);
        }
    };

    const confirmDelete = async () => {
        if (!deletingId) {
            return;
        }

        setIsDeleting(true);
        setErrorMessage(null);
        try {
            await deleteSubscriptionPlan(deletingId);
            setPlans((prev) => prev.filter((plan) => plan.id !== deletingId));
            setDeletingId(null);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete plan.';
            setErrorMessage(message);
        } finally {
            setIsDeleting(false);
        }
    };

    const deletingPlan = plans.find((plan) => plan.id === deletingId);

    if (isLoading) {
        return <SubscriptionPlansSkeleton />;
    }

    return (
        <div className="space-y-6 pt-4">
            {errorMessage && <Alert type="error" message={errorMessage} onClose={() => setErrorMessage(null)} />}

            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Plans', value: plans.length, sub: `${plans.length - activePlans} inactive` },
                    { label: 'Active Plans', value: activePlans, sub: 'visible to customers' },
                    {
                        label: 'Avg. Monthly Price',
                        value: avgPrice === 0 ? 'Free' : `$${avgPrice}`,
                        sub: 'across paid plans',
                    },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm px-5 py-4">
                        <div className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{stat.label}</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</div>
                        <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{stat.sub}</div>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 self-start bg-gray-100 dark:bg-slate-700 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setBillingCycle('monthly')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${billingCycle === 'monthly' ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setBillingCycle('annual')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${billingCycle === 'annual' ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
                    >
                        Annual
                        <span className="ml-1.5 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full">
                            Save up to 20%
                        </span>
                    </button>
                </div>
                <button
                    onClick={openAdd}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Plus size={16} />
                    Add Plan
                </button>
            </div>

            {plans.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
                        <Plus size={24} className="text-blue-500" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">No plans yet</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 mb-5">Create your first subscription plan to get started</p>
                    <button
                        onClick={openAdd}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                        Add Plan
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {plans.map((plan) => (
                        <PlanCard
                            key={plan.id}
                            plan={plan}
                            billingCycle={billingCycle}
                            onEdit={openEdit}
                            onDelete={setDeletingId}
                            onToggleActive={handleToggleActive}
                            isUpdating={updatingPlanId === plan.id}
                        />
                    ))}
                </div>
            )}

            {modalMode && editingPlan && (
                <PlanModal
                    mode={modalMode}
                    initial={editingPlan}
                    onClose={closeModal}
                    onSave={handleSave}
                    isSaving={isSaving}
                />
            )}

            {deletingId && deletingPlan && (
                <DeleteDialog
                    planName={deletingPlan.name}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeletingId(null)}
                    isDeleting={isDeleting}
                />
            )}
        </div>
    );
};
