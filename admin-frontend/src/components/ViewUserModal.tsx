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

    const getAvatarColor = () => {
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">User Information</h2>
                    <button 
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-gray-500 dark:text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* User Avatar and Name */}
                    <div className="flex flex-col items-center mb-6">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-medium ${getAvatarColor()} mb-3`}>
                            {getInitials(user.name)}
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{user.name}</h3>
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium mt-2 ${
                            user.status === 'Active'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400'
                        }`}>
                            {user.status}
                        </span>
                    </div>

                    {/* User Details */}
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-gray-100 dark:bg-slate-700 rounded-lg">
                                <Mail size={18} className="text-gray-600 dark:text-slate-300" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">Email Address</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{user.email}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-gray-100 dark:bg-slate-700 rounded-lg">
                                <Shield size={18} className="text-gray-600 dark:text-slate-300" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">Role</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{user.role}</p>
                            </div>
                        </div>

                        {user.plan && (
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-gray-100 dark:bg-slate-700 rounded-lg">
                                    <Activity size={18} className="text-gray-600 dark:text-slate-300" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">Subscription Plan</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user.plan}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-gray-100 dark:bg-slate-700 rounded-lg">
                                <User size={18} className="text-gray-600 dark:text-slate-300" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">User ID</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white font-mono">#{user.id}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-gray-100 dark:bg-slate-700 rounded-lg">
                                <Calendar size={18} className="text-gray-600 dark:text-slate-300" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">Member Since</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                </p>
                            </div>
                        </div>

                        {user.role === 'User' && user.organizations && user.organizations.length > 0 && (
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-gray-100 dark:bg-slate-700 rounded-lg">
                                    <Building2 size={18} className="text-gray-600 dark:text-slate-300" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Owned Organizations</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {user.organizations.map((org, idx) => (
                                            <span key={idx} className="inline-flex px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded">
                                                {org}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {user.role === 'User' && user.groups && user.groups.length > 0 && (
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-gray-100 dark:bg-slate-700 rounded-lg">
                                    <Users size={18} className="text-gray-600 dark:text-slate-300" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Groups</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {user.groups.map((group, idx) => (
                                            <span key={idx} className="inline-flex px-2 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-medium rounded">
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
                <div className="flex gap-3 p-6 border-t border-gray-100 dark:border-slate-700">
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
