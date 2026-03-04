import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Eye, Edit, UserCog, ArrowUp, ArrowDown, Ban, Trash2 } from 'lucide-react';
import { ViewUserModal } from './ViewUserModal';
import { EditUserModal } from './EditUserModal';
import type { User } from '../types';

interface UserRowProps {
    user: User;
    onUserUpdate?: (updatedUser: User) => void;
}

export const UserRow: React.FC<UserRowProps> = ({ user, onUserUpdate }) => {
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

    const handleSaveUser = (updatedUser: User) => {
        if (onUserUpdate) {
            onUserUpdate(updatedUser);
        }
        console.log('User updated:', updatedUser);
    };

    const handlePromoteToAdmin = () => {
        console.log('Promote user to Admin:', user);
        setIsMenuOpen(false);
        // TODO: Implement promote to admin functionality
    };

    const handlePromoteToManager = () => {
        console.log('Promote user to Manager:', user);
        setIsMenuOpen(false);
        // TODO: Implement promote to manager functionality
    };

    const handleDemoteToManager = () => {
        console.log('Demote admin to Manager:', user);
        setIsMenuOpen(false);
        // TODO: Implement demote to manager functionality
    };

    const handleSuspend = () => {
        console.log('Suspend user:', user);
        setIsMenuOpen(false);
        // TODO: Implement suspend user functionality
    };

    const handleRemove = () => {
        console.log('Remove user:', user);
        setIsMenuOpen(false);
        // TODO: Implement remove user confirmation
    };

    return (
        <>
            <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium ${getAvatarColor(user.name)}`}>
                            {getInitials(user.name)}
                        </div>
                        <span className="font-medium text-gray-900">{user.name}</span>
                    </div>
                </td>
                <td className="px-6 py-4 text-gray-500">{user.email}</td>
                <td className="px-6 py-4 text-gray-600">{user.role}</td>
                <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
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
                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        >
                            <MoreVertical size={18} />
                        </button>
                        
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                                <button
                                    onClick={handleViewInfo}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    <Eye size={16} />
                                    View User Info
                                </button>
                                <button
                                    onClick={handleEditInfo}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    <Edit size={16} />
                                    Edit User Info
                                </button>
                                
                                {/* Role Management based on current role */}
                                {user.role === 'Admin' && (
                                    <button
                                        onClick={handleDemoteToManager}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        <ArrowDown size={16} />
                                        Demote to Manager
                                    </button>
                                )}
                                
                                {user.role === 'Manager' && (
                                    <button
                                        onClick={handlePromoteToAdmin}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        <ArrowUp size={16} />
                                        Promote to Admin
                                    </button>
                                )}
                                
                                {user.role === 'User' && (
                                    <>
                                        <button
                                            onClick={handlePromoteToAdmin}
                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            <ArrowUp size={16} />
                                            Promote to Admin
                                        </button>
                                        <button
                                            onClick={handlePromoteToManager}
                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            <UserCog size={16} />
                                            Promote to Manager
                                        </button>
                                    </>
                                )}
                                
                                <div className="border-t border-gray-100 my-1"></div>
                                <button
                                    onClick={handleSuspend}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 transition-colors"
                                >
                                    <Ban size={16} />
                                    {user.status === 'Active' ? 'Suspend User' : 'Activate User'}
                                </button>
                                <button
                                    onClick={handleRemove}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
