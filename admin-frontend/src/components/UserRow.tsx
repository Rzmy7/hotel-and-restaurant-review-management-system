import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Eye, Edit, ArrowUp, ArrowDown, Ban, Trash2 } from 'lucide-react';
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

    const handlePromoteToAdmin = async () => {
        setIsMenuOpen(false);
        await updateUser({
            ...user,
            role: 'Admin',
            plan: undefined,
        });
    };

    const handleDemoteToUser = async () => {
        setIsMenuOpen(false);
        await updateUser({
            ...user,
            role: 'User',
            plan: user.plan || 'Basic',
        });
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
            <tr className="border-b border-gray-50 hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-transparent transition-all duration-200 group">
                <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold shadow-sm group-hover:scale-110 transition-transform duration-300 ${getAvatarColor(user.name)}`}>
                            {getInitials(user.name)}
                        </div>
                        <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{user.name}</span>
                    </div>
                </td>
                <td className="px-6 py-4 text-gray-600 font-medium">{user.email}</td>
                <td className="px-6 py-4 text-gray-700 font-semibold">{user.role}</td>
                <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
                        user.status === 'Active'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-red-100 text-red-500'
                    }`}>
                        {user.status}
                    </span>
                </td>
                <td className="px-6 py-4">
                    <div className="relative" ref={menuRef}>
                        <button 
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 hover:shadow-md"
                        >
                            <MoreVertical size={18} />
                        </button>
                        
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <button
                                    onClick={handleViewInfo}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors font-medium"
                                >
                                    <Eye size={16} />
                                    View User Info
                                </button>
                                <button
                                    onClick={handleEditInfo}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors font-medium"
                                >
                                    <Edit size={16} />
                                    Edit User Info
                                </button>
                                
                                {/* Role Management based on current role */}
                                {user.role === 'Admin' && (
                                    <button
                                        onClick={handleDemoteToUser}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors font-medium"
                                    >
                                        <ArrowDown size={16} />
                                        Demote to User
                                    </button>
                                )}
                                
                                {user.role === 'User' && (
                                    <button
                                        onClick={handlePromoteToAdmin}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors font-medium"
                                    >
                                        <ArrowUp size={16} />
                                        Promote to Admin
                                    </button>
                                )}
                                
                                <div className="border-t border-gray-100 my-2"></div>
                                <button
                                    onClick={handleSuspend}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 transition-colors font-medium"
                                >
                                    <Ban size={16} />
                                    {user.status === 'Active' ? 'Suspend User' : 'Activate User'}
                                </button>
                                <button
                                    onClick={handleRemove}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
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
