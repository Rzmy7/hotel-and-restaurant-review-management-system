import React, { useEffect, useState } from 'react';
import { Search, Plus, MoreVertical } from 'lucide-react';
import { fetchUsers } from '../services/mockService';
import type { User } from '../types';


export const UsersPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('All Roles');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        const loadData = async () => {
            const userData = await fetchUsers();
            setUsers(userData);
            setLoading(false);
        };
        loadData();
    }, []);

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2);
    };

    // Filter Logic
    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'All Roles' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="max-w-[1200px] mx-auto">
            <div className="mb-6 flex justify-between gap-4">
                <div className="flex-1 max-w-[600px] relative flex gap-4">
                    <div className="flex-1 max-w-none relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={18} />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="w-full py-2.5 px-4 pl-10 border border-gray-200 rounded-md text-sm outline-none bg-white"
                        />
                    </div>
                    <select
                        className="border border-gray-200 rounded-md px-4 bg-white text-gray-900 outline-none cursor-pointer min-w-[120px]"
                        value={roleFilter}
                        onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                    >
                        <option>All Roles</option>
                        <option>Admin</option>
                        <option>Manager</option>
                        <option>User</option>
                    </select>
                </div>
                <button className="bg-black text-white px-5 py-2.5 rounded-md text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity" onClick={() => alert('Add User Modal would open here')}>
                    <Plus size={18} />
                    Add User
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="text-left px-6 py-4 font-semibold text-gray-500 text-sm border-b border-gray-200 w-[30%]">Name</th>
                            <th className="text-left px-6 py-4 font-semibold text-gray-500 text-sm border-b border-gray-200 w-[30%]">Email</th>
                            <th className="text-left px-6 py-4 font-semibold text-gray-500 text-sm border-b border-gray-200 w-[15%]">Role</th>
                            <th className="text-left px-6 py-4 font-semibold text-gray-500 text-sm border-b border-gray-200 w-[15%]">Status</th>
                            <th className="text-left px-6 py-4 font-semibold text-gray-500 text-sm border-b border-gray-200 w-[10%]">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedUsers.map((user) => (
                            <tr key={user.id} className="last:border-b-0">
                                <td className="px-6 py-4 text-gray-900 text-sm border-b border-gray-200">
                                    <div className="flex items-center gap-4 font-medium">
                                        <div
                                            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-gray-900"
                                            style={{ backgroundColor: user.avatarColor || '#e5e7eb' }}
                                        >
                                            {getInitials(user.name)}
                                        </div>
                                        <span>{user.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-500 text-sm border-b border-gray-200">
                                    {user.email}
                                </td>
                                <td className="px-6 py-4 text-gray-900 text-sm border-b border-gray-200">
                                    <span className="px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-500 inline-block min-w-[80px] text-center">{user.role}</span>
                                </td>
                                <td className="px-6 py-4 text-gray-900 text-sm border-b border-gray-200">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium inline-block text-center ${user.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {user.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-900 text-sm border-b border-gray-200">
                                    <button className="text-gray-500 bg-transparent border-none cursor-pointer p-0 hover:text-gray-700">
                                        <MoreVertical size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                        Showing {filteredUsers.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
                    </div>
                    <div className="flex gap-2">
                        <button
                            className="px-3 py-1.5 border border-gray-200 rounded-md bg-white text-sm text-gray-900 disabled:opacity-50"
                            disabled={currentPage === 1}
                            onClick={() => handlePageChange(currentPage - 1)}
                        >
                            Previous
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                className={`px-3 py-1.5 border border-gray-200 rounded-md text-sm ${currentPage === page ? 'bg-black text-white border-black' : 'bg-white text-gray-900'}`}
                                onClick={() => handlePageChange(page)}
                            >
                                {page}
                            </button>
                        ))}
                        <button
                            className="px-3 py-1.5 border border-gray-200 rounded-md bg-white text-sm text-gray-900 disabled:opacity-50"
                            disabled={currentPage === totalPages || totalPages === 0}
                            onClick={() => handlePageChange(currentPage + 1)}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
