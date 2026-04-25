import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Eye, Edit, Ban, Trash2 } from 'lucide-react';
import { ViewUserModal } from './ViewUserModal';
import { EditUserModal } from './EditUserModal';
import type { User } from '../types';

interface UserRowProps {
    user: User;
    onUserUpdate?: (updatedUser: User) => Promise<void> | void;
    onUserDelete?: (userId: string) => Promise<void> | void;
}

export const UserRow: React.FC<UserRowProps> = ({ user, onUserUpdate, onUserDelete }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]);

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2);
    };

    const getAvatarColor = () => {
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
    };

    const handleViewInfo = () => {
        setIsMenuOpen(false);
        setShowViewModal(true);
    };

    const handleEditInfo = () => {
        setIsMenuOpen(false);
        setShowEditModal(true);
    };

    const updateUser = async (nextUser: User) => {
        if (!onUserUpdate) {
            return;
        }

        try {
            await Promise.resolve(onUserUpdate(nextUser));
        } catch (error) {
            console.error('Failed to update user:', error);
        }
    };

    const handleSaveUser = async (updatedUser: User) => {
        await updateUser(updatedUser);
    };

    const handleSuspend = async () => {
        setIsMenuOpen(false);
        await updateUser({
            ...user,
            status: user.status === 'Active' ? 'Suspended' : 'Active',
        });
    };

    const handleRemove = async () => {
        setIsMenuOpen(false);

        if (!onUserDelete) {
            return;
        }

        const confirmed = window.confirm(`Remove ${user.name}?`);
        if (!confirmed) {
            return;
        }

        try {
            await Promise.resolve(onUserDelete(user.id));
        } catch (error) {
            console.error('Failed to remove user:', error);
        }
    };

    return (
        <>
            <tr className="border-b border-gray-50 dark:border-slate-700 hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-all duration-200 group">
                <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold shadow-sm group-hover:scale-110 transition-transform duration-300 ${getAvatarColor()}`}>
                            {getInitials(user.name)}
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{user.name}</span>
                    </div>
                </td>
                <td className="px-6 py-4 text-gray-600 dark:text-slate-300 font-medium">{user.email}</td>
                <td className="px-6 py-4 text-gray-700 dark:text-slate-200 font-semibold">{user.role}</td>
                <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
                        user.status === 'Active'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400'
                    }`}>
                        {user.status}
                    </span>
                </td>
                <td className="px-6 py-4">
                    <div className="relative" ref={menuRef}>
                        <button 
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="p-2 text-gray-400 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg transition-all duration-200 hover:shadow-md"
                        >
                            <MoreVertical size={18} />
                        </button>
                        
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <button
                                    onClick={handleViewInfo}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
                                >
                                    <Eye size={16} />
                                    View User Info
                                </button>
                                <button
                                    onClick={handleEditInfo}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
                                >
                                    <Edit size={16} />
                                    Edit User Info
                                </button>
                                
                                <div className="border-t border-gray-100 dark:border-slate-700 my-2"></div>
                                <button
                                    onClick={handleSuspend}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors font-medium"
                                >
                                    <Ban size={16} />
                                    {user.status === 'Active' ? 'Suspend User' : 'Activate User'}
                                </button>
                                <button
                                    onClick={handleRemove}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors font-medium"
                                >
                                    <Trash2 size={16} />
                                    Remove User
                                </button>
                            </div>
                        )}
                    </div>
                </td>
            </tr>

            {/* Modals */}
            <ViewUserModal
                isOpen={showViewModal}
                onClose={() => setShowViewModal(false)}
                user={user}
            />
            <EditUserModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                user={user}
                onSave={handleSaveUser}
            />
        </>
    );
};
