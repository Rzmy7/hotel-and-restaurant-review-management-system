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
    onUserUpdate?: (updatedUser: User) => Promise<void> | void;
    onUserDelete?: (userId: string) => Promise<void> | void;
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
    onUserDelete,
}) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-gray-100 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider" style={{ width: '25%' }}>Name</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider" style={{ width: '30%' }}>Email</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider" style={{ width: '15%' }}>Role</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider" style={{ width: '15%' }}>Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider" style={{ width: '15%' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => (
                        <UserRow
                            key={user.id}
                            user={user}
                            onUserUpdate={onUserUpdate}
                            onUserDelete={onUserDelete}
                        />
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
