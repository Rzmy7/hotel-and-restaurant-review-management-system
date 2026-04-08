import React, { useEffect, useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import type { User } from '../types';
import { fetchSubscriptionPlans } from '../services/subscriptionPlansService';

interface EditUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    onSave: (updatedUser: User) => Promise<void> | void;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, user, onSave }) => {
    const [formData, setFormData] = useState({
        name: user.name,
        email: user.email,
        plan: user.plan || 'Free',
    });
    const [saving, setSaving] = useState(false);
    const [availablePlans, setAvailablePlans] = useState<string[]>([]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const loadPlans = async () => {
            try {
                const plans = await fetchSubscriptionPlans();
                const activePlanNames = plans
                    .filter((plan) => plan.isActive)
                    .map((plan) => plan.name)
                    .filter((name) => name.toLowerCase() !== 'basic')
                    .filter((name, index, all) => all.indexOf(name) === index);

                if (formData.plan && formData.plan.toLowerCase() !== 'basic' && !activePlanNames.includes(formData.plan)) {
                    activePlanNames.unshift(formData.plan);
                }

                if (activePlanNames.length > 0) {
                    setAvailablePlans(activePlanNames);
                } else {
                    setAvailablePlans(['Free', 'Pro', 'Business', 'Enterprise']);
                }
            } catch {
                setAvailablePlans(['Free', 'Pro', 'Business', 'Enterprise']);
            }
        };

        void loadPlans();
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            await Promise.resolve(
                onSave({
                    ...user,
                    ...formData,
                })
            );
            onClose();
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Edit User Information</h2>
                    <button 
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Enter full name"
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="Enter email address"
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Subscription Plan - Only for regular users */}
                    {user.role === 'User' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Subscription Plan</label>
                            <div className="relative">
                                <select
                                    value={formData.plan}
                                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                                    className="w-full appearance-none px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                                >
                                    {availablePlans.length > 0 ? (
                                        availablePlans.map((planName) => (
                                            <option key={planName} value={planName}>{planName}</option>
                                        ))
                                    ) : (
                                        <option value={formData.plan}>{formData.plan}</option>
                                    )}
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
