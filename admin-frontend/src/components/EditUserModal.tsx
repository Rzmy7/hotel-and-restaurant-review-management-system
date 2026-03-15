import React, { useState } from 'react';
import { X, Plus, Building2, Users, ChevronDown } from 'lucide-react';
import type { User } from '../types';

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
        organizations: user.organizations || [],
        groups: user.groups || [],
    });
    const [newOrg, setNewOrg] = useState('');
    const [saving, setSaving] = useState(false);

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

    const handleAddOrganization = () => {
        if (newOrg.trim() && !formData.organizations.includes(newOrg.trim())) {
            setFormData({
                ...formData,
                organizations: [...formData.organizations, newOrg.trim()]
            });
            setNewOrg('');
        }
    };

    const handleRemoveOrganization = (org: string) => {
        setFormData({
            ...formData,
            organizations: formData.organizations.filter(o => o !== org)
        });
    };

    const handleRemoveFromGroup = (group: string) => {
        setFormData({
            ...formData,
            groups: formData.groups.filter(g => g !== group)
        });
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
                                    onChange={(e) => setFormData({ ...formData, plan: e.target.value as 'Free' | 'Basic' | 'Pro' | 'Enterprise' })}
                                    className="w-full appearance-none px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                                >
                                    <option value="Free">Free</option>
                                    <option value="Basic">Basic</option>
                                    <option value="Pro">Pro</option>
                                    <option value="Enterprise">Enterprise</option>
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    )}

                    {/* Organizations - Only for regular users */}
                    {user.role === 'User' && (
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                <Building2 size={16} />
                                Organizations
                            </label>
                            
                            {/* Add new organization */}
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={newOrg}
                                    onChange={(e) => setNewOrg(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddOrganization();
                                        }
                                    }}
                                    placeholder="Add organization"
                                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddOrganization}
                                    className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                            
                            {/* Organization badges */}
                            {formData.organizations.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                    {formData.organizations.map((org) => (
                                        <span
                                            key={org}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium"
                                        >
                                            {org}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveOrganization(org)}
                                                className="hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                                            >
                                                <X size={12} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No organizations</p>
                            )}
                        </div>
                    )}

                    {/* Groups - Only for regular users */}
                    {user.role === 'User' && (
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                <Users size={16} />
                                Groups
                            </label>
                            
                            {/* Group badges */}
                            {formData.groups.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                    {formData.groups.map((group) => (
                                        <span
                                            key={group}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-medium"
                                        >
                                            {group}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveFromGroup(group)}
                                                className="hover:bg-purple-100 rounded-full p-0.5 transition-colors"
                                            >
                                                <X size={12} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No groups</p>
                            )}
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
