import React from 'react';
import { UserRow } from './UserRow';
import { Pagination } from './Pagination';
import type { User } from '../types';

interface UserTableProps {
    users: User[];
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    startIndex: number;
    onPageChange: (page: number) => void;
    onUserUpdate?: (updatedUser: User) => void;
}

export const UserTable: React.FC<UserTableProps> = ({
    users,
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    startIndex,
    onPageChange,
    onUserUpdate,
}) => {
    return (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100/30">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider" style={{ width: '25%' }}>Name</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider" style={{ width: '30%' }}>Email</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider" style={{ width: '15%' }}>Role</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider" style={{ width: '15%' }}>Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider" style={{ width: '15%' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => (
                        <UserRow key={user.id} user={user} onUserUpdate={onUserUpdate} />
                    ))}
                </tbody>
            </table>
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                startIndex={startIndex}
                onPageChange={onPageChange}
                itemLabel="users"
            />
        </div>
    );
};
