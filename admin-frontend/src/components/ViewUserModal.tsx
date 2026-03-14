import React from 'react';
import { X, User, Mail, Shield, Calendar, Activity, Building2, Users } from 'lucide-react';
import type { User as UserType } from '../types';

interface ViewUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: UserType;
}

export const ViewUserModal: React.FC<ViewUserModalProps> = ({ isOpen, onClose, user }) => {
    if (!isOpen) return null;

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2);
    };

    const getAvatarColor = (name: string) => {
        const colors = [
            'bg-blue-100 text-blue-600',
            'bg-purple-100 text-purple-600',
            'bg-green-100 text-green-600',
            'bg-orange-100 text-orange-600',
            'bg-pink-100 text-pink-600',
            'bg-teal-100 text-teal-600',
        ];
        const index = name.charCodeAt(0) % colors.length;
        return colors[index];
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">User Information</h2>
                    <button 
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* User Avatar and Name */}
                    <div className="flex flex-col items-center mb-6">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-medium ${getAvatarColor(user.name)} mb-3`}>
                            {getInitials(user.name)}
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900">{user.name}</h3>
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium mt-2 ${
                            user.status === 'Active'
                                ? 'bg-green-100 text-green-600'
                                : 'bg-red-100 text-red-500'
                        }`}>
                            {user.status}
                        </span>
                    </div>

                    {/* User Details */}
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg">
                                <Mail size={18} className="text-gray-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-gray-500 mb-0.5">Email Address</p>
                                <p className="text-sm font-medium text-gray-900">{user.email}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg">
                                <Shield size={18} className="text-gray-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-gray-500 mb-0.5">Role</p>
                                <p className="text-sm font-medium text-gray-900">{user.role}</p>
                            </div>
                        </div>

                        {user.plan && (
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-gray-100 rounded-lg">
                                    <Activity size={18} className="text-gray-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 mb-0.5">Subscription Plan</p>
                                    <p className="text-sm font-medium text-gray-900">{user.plan}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg">
                                <User size={18} className="text-gray-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-gray-500 mb-0.5">User ID</p>
                                <p className="text-sm font-medium text-gray-900 font-mono">#{user.id}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg">
                                <Calendar size={18} className="text-gray-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-gray-500 mb-0.5">Member Since</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                </p>
                            </div>
                        </div>

                        {user.role === 'User' && user.organizations && user.organizations.length > 0 && (
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-gray-100 rounded-lg">
                                    <Building2 size={18} className="text-gray-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 mb-1">Owned Organizations</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {user.organizations.map((org, idx) => (
                                            <span key={idx} className="inline-flex px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                                                {org}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {user.role === 'User' && user.groups && user.groups.length > 0 && (
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-gray-100 rounded-lg">
                                    <Users size={18} className="text-gray-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 mb-1">Groups</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {user.groups.map((group, idx) => (
                                            <span key={idx} className="inline-flex px-2 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded">
                                                {group}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
