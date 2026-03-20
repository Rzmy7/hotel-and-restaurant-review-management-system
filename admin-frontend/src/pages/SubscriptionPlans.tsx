import React, { useState } from 'react';
import {
    Plus,
    Pencil,
    Trash2,
    Check,
    X,
    Crown,
    Zap,
    Star,
    Building2,
    ChevronDown,
    AlertTriangle,
    DollarSign,
    ToggleLeft,
    ToggleRight,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlanFeature {
    id: string;
    name: string;
    included: boolean;
    limit?: string;
}

interface SubscriptionPlan {
    id: string;
    name: string;
    description: string;
    monthlyPrice: number;
    annualPrice: number;
    currency: string;
    isPopular: boolean;
    isActive: boolean;
    color: string;         // Tailwind gradient classes
    iconName: 'zap' | 'star' | 'crown' | 'building';
    features: PlanFeature[];
}

type BillingCycle = 'monthly' | 'annual';

// ─── Seed Data ────────────────────────────────────────────────────────────────

const INITIAL_PLANS: SubscriptionPlan[] = [
    {
        id: 'free',
        name: 'Free',
        description: 'Perfect for individuals getting started',
        monthlyPrice: 0,
        annualPrice: 0,
        currency: 'USD',
        isPopular: false,
        isActive: true,
        color: 'from-slate-500 to-slate-600',
        iconName: 'zap',
        features: [
            { id: 'f1', name: 'Up to 1 organization', included: true },
            { id: 'f2', name: 'Up to 5 users', included: true },
            { id: 'f3', name: 'Review scraping', included: true, limit: '100 / month' },
            { id: 'f4', name: 'API access', included: false },
            { id: 'f5', name: 'Embeddings', included: false },
            { id: 'f6', name: 'Priority support', included: false },
            { id: 'f7', name: 'Custom integrations', included: false },
        ],
    },
    {
        id: 'starter',
        name: 'Starter',
        description: 'Great for small teams and growing businesses',
        monthlyPrice: 29,
        annualPrice: 24,
        currency: 'USD',
        isPopular: false,
        isActive: true,
        color: 'from-blue-500 to-blue-600',
        iconName: 'star',
        features: [
            { id: 's1', name: 'Up to 3 organizations', included: true },
            { id: 's2', name: 'Up to 25 users', included: true },
            { id: 's3', name: 'Review scraping', included: true, limit: '2,000 / month' },
            { id: 's4', name: 'API access', included: true },
            { id: 's5', name: 'Embeddings', included: true, limit: '500 / month' },
            { id: 's6', name: 'Priority support', included: false },
            { id: 's7', name: 'Custom integrations', included: false },
        ],
    },
    {
        id: 'professional',
        name: 'Professional',
        description: 'Ideal for mid-sized businesses with advanced needs',
        monthlyPrice: 79,
        annualPrice: 65,
        currency: 'USD',
        isPopular: true,
        isActive: true,
        color: 'from-violet-500 to-purple-600',
        iconName: 'crown',
        features: [
            { id: 'p1', name: 'Up to 15 organizations', included: true },
            { id: 'p2', name: 'Unlimited users', included: true },
            { id: 'p3', name: 'Review scraping', included: true, limit: 'Unlimited' },
            { id: 'p4', name: 'API access', included: true },
            { id: 'p5', name: 'Embeddings', included: true, limit: 'Unlimited' },
            { id: 'p6', name: 'Priority support', included: true },
            { id: 'p7', name: 'Custom integrations', included: false },
        ],
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'Full-featured solution for large organizations',
        monthlyPrice: 199,
        annualPrice: 165,
        currency: 'USD',
        isPopular: false,
        isActive: true,
        color: 'from-amber-500 to-orange-600',
        iconName: 'building',
        features: [
            { id: 'e1', name: 'Unlimited organizations', included: true },
            { id: 'e2', name: 'Unlimited users', included: true },
            { id: 'e3', name: 'Review scraping', included: true, limit: 'Unlimited' },
            { id: 'e4', name: 'API access', included: true },
            { id: 'e5', name: 'Embeddings', included: true, limit: 'Unlimited' },
            { id: 'e6', name: 'Priority support', included: true },
            { id: 'e7', name: 'Custom integrations', included: true },
        ],
    },
];

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PlanIcon: React.FC<{ name: SubscriptionPlan['iconName']; className?: string }> = ({ name, className = '' }) => {
    const props = { size: 20, className };
    if (name === 'crown') return <Crown {...props} />;
    if (name === 'star') return <Star {...props} />;
    if (name === 'building') return <Building2 {...props} />;
    return <Zap {...props} />;
};

const generateId = () => `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const generateFeatureId = () => `feat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// ─── Empty form defaults ───────────────────────────────────────────────────────

const emptyPlan = (): Omit<SubscriptionPlan, 'id'> => ({
    name: '',
    description: '',
    monthlyPrice: 0,
    annualPrice: 0,
    currency: 'USD',
    isPopular: false,
    isActive: true,
    color: 'from-blue-500 to-blue-600',
    iconName: 'star',
    features: [
        { id: generateFeatureId(), name: '', included: true, limit: '' },
    ],
});

// ─── Plan Card ────────────────────────────────────────────────────────────────

interface PlanCardProps {
    plan: SubscriptionPlan;
    billingCycle: BillingCycle;
    onEdit: (plan: SubscriptionPlan) => void;
    onDelete: (id: string) => void;
    onToggleActive: (id: string) => void;
}

const PlanCard: React.FC<PlanCardProps> = ({ plan, billingCycle, onEdit, onDelete, onToggleActive }) => {
    const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;

    return (
        <div className={`relative bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col transition-all duration-200 hover:shadow-md ${!plan.isActive ? 'opacity-60' : ''}`}>
            {/* Colored top strip */}
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

                {/* Price */}
                <div className="mt-4">
                    {price === 0 ? (
                        <span className="text-3xl font-extrabold">Free</span>
                    ) : (
                        <div className="flex items-baseline gap-1">
                            <span className="text-sm font-medium opacity-90">{plan.currency === 'USD' ? '$' : plan.currency}</span>
                            <span className="text-3xl font-extrabold">{price}</span>
                            <span className="text-sm opacity-80">/ mo</span>
                        </div>
                    )}
                    {price > 0 && billingCycle === 'annual' && (
                        <p className="text-xs opacity-75 mt-0.5">Billed annually · Save ${(plan.monthlyPrice - plan.annualPrice) * 12}/yr</p>
                    )}
                </div>

                <p className="mt-2 text-sm opacity-80 leading-snug">{plan.description}</p>
            </div>

            {/* Features */}
            <div className="flex-1 p-5">
                <ul className="space-y-2.5">
                    {plan.features.map((feat) => (
                        <li key={feat.id} className="flex items-start gap-2.5">
                            <div className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${feat.included ? 'bg-green-100' : 'bg-gray-100'}`}>
                                {feat.included
                                    ? <Check size={10} className="text-green-600" strokeWidth={3} />
                                    : <X size={10} className="text-gray-400" strokeWidth={3} />
                                }
                            </div>
                            <span className={`text-sm leading-snug ${feat.included ? 'text-gray-700' : 'text-gray-400 line-through'}`}>
                                {feat.name}
                                {feat.included && feat.limit && (
                                    <span className="ml-1 text-xs text-gray-400 font-medium">({feat.limit})</span>
                                )}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 flex items-center gap-2 border-t border-gray-100 pt-4">
                <button
                    onClick={() => onEdit(plan)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
                >
                    <Pencil size={14} />
                    Edit
                </button>
                <button
                    onClick={() => onToggleActive(plan.id)}
                    title={plan.isActive ? 'Deactivate plan' : 'Activate plan'}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                    {plan.isActive
                        ? <ToggleRight size={18} className="text-green-500" />
                        : <ToggleLeft size={18} className="text-gray-400" />
                    }
                </button>
                <button
                    onClick={() => onDelete(plan.id)}
                    className="px-3 py-2 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-colors"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
};

// ─── Plan Modal ───────────────────────────────────────────────────────────────

interface PlanModalProps {
    mode: 'add' | 'edit';
    initial: Omit<SubscriptionPlan, 'id'> & { id?: string };
    onClose: () => void;
    onSave: (plan: Omit<SubscriptionPlan, 'id'> & { id?: string }) => void;
}

const PlanModal: React.FC<PlanModalProps> = ({ mode, initial, onClose, onSave }) => {
    const [form, setForm] = useState({ ...initial, features: initial.features.map(f => ({ ...f })) });

    const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
        setForm(prev => ({ ...prev, [key]: value }));

    const updateFeature = (id: string, key: keyof PlanFeature, value: string | boolean) =>
        setForm(prev => ({
            ...prev,
            features: prev.features.map(f => f.id === id ? { ...f, [key]: value } : f),
        }));

    const addFeature = () =>
        setForm(prev => ({
            ...prev,
            features: [...prev.features, { id: generateFeatureId(), name: '', included: true, limit: '' }],
        }));

    const removeFeature = (id: string) =>
        setForm(prev => ({ ...prev, features: prev.features.filter(f => f.id !== id) }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(form);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            {mode === 'add' ? 'Add New Plan' : `Edit "${initial.name}"`}
                        </h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {mode === 'add' ? 'Configure plan details and features' : 'Update plan pricing and features'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Modal Body */}
                <form id="plan-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                    {/* Basic Info */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Plan Info</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Plan Name *</label>
                                <input
                                    required
                                    type="text"
                                    value={form.name}
                                    onChange={e => updateField('name', e.target.value)}
                                    placeholder="e.g. Professional"
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                                <input
                                    type="text"
                                    value={form.description}
                                    onChange={e => updateField('description', e.target.value)}
                                    placeholder="Short description of the plan"
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* Icon */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Icon</label>
                                <div className="relative">
                                    <select
                                        value={form.iconName}
                                        onChange={e => updateField('iconName', e.target.value as SubscriptionPlan['iconName'])}
                                        className="w-full appearance-none px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                                    >
                                        <option value="zap">Zap</option>
                                        <option value="star">Star</option>
                                        <option value="crown">Crown</option>
                                        <option value="building">Building</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Color */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Card Color</label>
                                <div className="relative">
                                    <select
                                        value={form.color}
                                        onChange={e => updateField('color', e.target.value)}
                                        className="w-full appearance-none px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                                    >
                                        {PLAN_COLORS.map(c => (
                                            <option key={c.value} value={c.value}>{c.label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Toggles */}
                        <div className="mt-4 flex items-center gap-6">
                            <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={form.isPopular}
                                    onChange={e => updateField('isPopular', e.target.checked)}
                                    className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 font-medium">Mark as "Most Popular"</span>
                            </label>
                            <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={form.isActive}
                                    onChange={e => updateField('isActive', e.target.checked)}
                                    className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 font-medium">Plan is active</span>
                            </label>
                        </div>
                    </section>

                    {/* Pricing */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Pricing</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency</label>
                                <div className="relative">
                                    <select
                                        value={form.currency}
                                        onChange={e => updateField('currency', e.target.value)}
                                        className="w-full appearance-none px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                                    >
                                        <option value="USD">USD ($)</option>
                                        <option value="EUR">EUR (€)</option>
                                        <option value="GBP">GBP (£)</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Monthly Price</label>
                                <div className="relative">
                                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        value={form.monthlyPrice}
                                        onChange={e => updateField('monthlyPrice', parseFloat(e.target.value) || 0)}
                                        className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Annual Price <span className="text-xs text-gray-400 font-normal">(/ mo)</span></label>
                                <div className="relative">
                                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        value={form.annualPrice}
                                        onChange={e => updateField('annualPrice', parseFloat(e.target.value) || 0)}
                                        className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                            Set price to 0 to display "Free". Annual price is the per-month cost when billed yearly.
                        </p>
                    </section>

                    {/* Features */}
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Features</h3>
                            <button
                                type="button"
                                onClick={addFeature}
                                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                            >
                                <Plus size={13} />
                                Add Feature
                            </button>
                        </div>

                        <div className="space-y-2">
                            {form.features.map((feat, idx) => (
                                <div key={feat.id} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                                    {/* Included toggle */}
                                    <button
                                        type="button"
                                        onClick={() => updateFeature(feat.id, 'included', !feat.included)}
                                        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${feat.included ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}
                                        title="Toggle included"
                                    >
                                        {feat.included ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                                    </button>

                                    {/* Feature name */}
                                    <input
                                        type="text"
                                        value={feat.name}
                                        onChange={e => updateFeature(feat.id, 'name', e.target.value)}
                                        placeholder={`Feature ${idx + 1}`}
                                        className="flex-1 bg-transparent border-none text-sm text-gray-700 focus:outline-none placeholder-gray-400"
                                    />

                                    {/* Limit (only when included) */}
                                    {feat.included && (
                                        <input
                                            type="text"
                                            value={feat.limit ?? ''}
                                            onChange={e => updateFeature(feat.id, 'limit', e.target.value)}
                                            placeholder="Limit (optional)"
                                            className="w-32 bg-white border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                        />
                                    )}

                                    {/* Remove */}
                                    <button
                                        type="button"
                                        onClick={() => removeFeature(feat.id)}
                                        className="flex-shrink-0 p-1 text-gray-300 hover:text-red-400 transition-colors rounded"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>
                </form>

                {/* Modal Footer */}
                <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/70 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="plan-form"
                        className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        {mode === 'add' ? 'Create Plan' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Delete Confirmation Dialog ───────────────────────────────────────────────

interface DeleteDialogProps {
    planName: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const DeleteDialog: React.FC<DeleteDialogProps> = ({ planName, onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle size={20} className="text-red-600" />
                </div>
                <div>
                    <h3 className="text-base font-semibold text-gray-900">Delete Plan</h3>
                    <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete the <span className="font-semibold text-gray-900">"{planName}"</span> plan?
                Existing subscribers will not be affected immediately.
            </p>
            <div className="flex gap-3">
                <button
                    onClick={onCancel}
                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
                >
                    Delete Plan
                </button>
            </div>
        </div>
    </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

export const SubscriptionPlans: React.FC = () => {
    const [plans, setPlans] = useState<SubscriptionPlan[]>(INITIAL_PLANS);
    const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

    // Modal state
    const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
    const [editingPlan, setEditingPlan] = useState<(Omit<SubscriptionPlan, 'id'> & { id?: string }) | null>(null);

    // Delete confirmation
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const activePlans = plans.filter(p => p.isActive).length;
    const avgPrice = plans.length
        ? Math.round(plans.filter(p => p.monthlyPrice > 0).reduce((s, p) => s + p.monthlyPrice, 0) / Math.max(1, plans.filter(p => p.monthlyPrice > 0).length))
        : 0;

    // ── Handlers ──────────────────────────────────────────────────────────────

    const openAdd = () => {
        setEditingPlan(emptyPlan());
        setModalMode('add');
    };

    const openEdit = (plan: SubscriptionPlan) => {
        setEditingPlan({ ...plan, features: plan.features.map(f => ({ ...f })) });
        setModalMode('edit');
    };

    const closeModal = () => {
        setModalMode(null);
        setEditingPlan(null);
    };

    const handleSave = (data: Omit<SubscriptionPlan, 'id'> & { id?: string }) => {
        if (modalMode === 'add') {
            setPlans(prev => [...prev, { ...data, id: generateId() } as SubscriptionPlan]);
        } else if (modalMode === 'edit' && data.id) {
            setPlans(prev => prev.map(p => p.id === data.id ? (data as SubscriptionPlan) : p));
        }
        closeModal();
    };

    const handleDelete = (id: string) => setDeletingId(id);

    const confirmDelete = () => {
        if (deletingId) {
            setPlans(prev => prev.filter(p => p.id !== deletingId));
            setDeletingId(null);
        }
    };

    const handleToggleActive = (id: string) => {
        setPlans(prev => prev.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
    };

    const deletingPlan = plans.find(p => p.id === deletingId);

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="pt-4 space-y-6 max-w-7xl">

            {/* Stats Strip */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Plans', value: plans.length, sub: `${plans.length - activePlans} inactive` },
                    { label: 'Active Plans', value: activePlans, sub: 'visible to customers' },
                    { label: 'Avg. Monthly Price', value: avgPrice === 0 ? 'Free' : `$${avgPrice}`, sub: 'across paid plans' },
                ].map(stat => (
                    <div key={stat.label} className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{stat.sub}</div>
                    </div>
                ))}
            </div>

            {/* Billing Toggle & Add Plan Button */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 self-start bg-gray-100 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setBillingCycle('monthly')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${billingCycle === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setBillingCycle('annual')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${billingCycle === 'annual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Annual
                        <span className="ml-1.5 text-xs font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">Save up to 20%</span>
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

            {/* Plans Grid */}
            {plans.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
                        <Plus size={24} className="text-blue-500" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900">No plans yet</h3>
                    <p className="text-sm text-gray-500 mt-1 mb-5">Create your first subscription plan to get started</p>
                    <button
                        onClick={openAdd}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                        Add Plan
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {plans.map(plan => (
                        <PlanCard
                            key={plan.id}
                            plan={plan}
                            billingCycle={billingCycle}
                            onEdit={openEdit}
                            onDelete={handleDelete}
                            onToggleActive={handleToggleActive}
                        />
                    ))}
                </div>
            )}

            {/* Add / Edit Modal */}
            {modalMode && editingPlan && (
                <PlanModal
                    mode={modalMode}
                    initial={editingPlan}
                    onClose={closeModal}
                    onSave={handleSave}
                />
            )}

            {/* Delete Confirmation */}
            {deletingId && deletingPlan && (
                <DeleteDialog
                    planName={deletingPlan.name}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeletingId(null)}
                />
            )}
        </div>
    );
};
