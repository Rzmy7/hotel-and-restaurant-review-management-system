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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-gray-100">
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500" style={{ width: '25%' }}>Name</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500" style={{ width: '30%' }}>Email</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500" style={{ width: '15%' }}>Role</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500" style={{ width: '15%' }}>Status</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500" style={{ width: '15%' }}>Actions</th>
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
