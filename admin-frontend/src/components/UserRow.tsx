import React from 'react';
import { MoreVertical } from 'lucide-react';
import type { User } from '../types';

interface UserRowProps {
    user: User;
}

export const UserRow: React.FC<UserRowProps> = ({ user }) => {
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
                <button className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
                    <MoreVertical size={18} />
                </button>
            </td>
        </tr>
    );
};
