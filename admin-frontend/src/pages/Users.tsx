import React, { useEffect, useState } from 'react';
import { Search, Plus, Loader, ChevronDown, Users, UserCheck, UserPlus } from 'lucide-react';
import { UserTable } from '../components/UserTable';
import { AddUserModal } from '../components/AddUserModal';
import { fetchUsers } from '../services/mockService';
import type { User } from '../types';

export const UsersPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('All Roles');
    const [planFilter, setPlanFilter] = useState('All Plans');
    const [statusFilter, setStatusFilter] = useState('All Status');
    const [currentPage, setCurrentPage] = useState(1);
    const [showAddModal, setShowAddModal] = useState(false);
    const itemsPerPage = 8;

    useEffect(() => {
        const loadData = async () => {
            const userData = await fetchUsers();
            setUsers(userData);
            setLoading(false);
        };
        loadData();
    }, []);

    // Stats calculations
    const allActiveUsers = users.filter(u => u.status === 'Active').length;
    const todayActiveUsers = 89; // Mock data
    const todayRegistered = 12; // Mock data

    // Filter Logic
    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'All Roles' || user.role === roleFilter;
        const matchesPlan = planFilter === 'All Plans' || user.plan === planFilter;
        const matchesStatus = statusFilter === 'All Status' || user.status === statusFilter;
        return matchesSearch && matchesRole && matchesPlan && matchesStatus;
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

    const handleAddUser = (newUser: Omit<User, 'id' | 'plan'>) => {
        const user: User = {
            ...newUser,
            id: String(users.length + 1),
        };
        setUsers([user, ...users]);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader size={32} className="animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pt-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Users size={24} className="text-blue-500" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">All Active Users</p>
                        <p className="text-2xl font-semibold text-gray-900">{allActiveUsers}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
                        <UserCheck size={24} className="text-green-500" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Today Active Users</p>
                        <p className="text-2xl font-semibold text-gray-900">{todayActiveUsers}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
                        <UserPlus size={24} className="text-purple-500" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Today Registered</p>
                        <p className="text-2xl font-semibold text-gray-900">{todayRegistered}</p>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                    {/* Search Input */}
                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2.5 flex-1 max-w-xl">
                        <Search size={18} className="text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="bg-transparent border-none outline-none text-sm text-gray-600 placeholder-gray-400 w-full"
                        />
                    </div>
                    
                    {/* Role Filter */}
                    <div className="relative">
                        <select
                            value={roleFilter}
                            onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm text-gray-600 cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option>All Roles</option>
                            <option>Admin</option>
                            <option>Manager</option>
                            <option>User</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Subscription Plan Filter */}
                    <div className="relative">
                        <select
                            value={planFilter}
                            onChange={(e) => { setPlanFilter(e.target.value); setCurrentPage(1); }}
                            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm text-gray-600 cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option>All Plans</option>
                            <option>Free</option>
                            <option>Basic</option>
                            <option>Pro</option>
                            <option>Enterprise</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Status Filter */}
                    <div className="relative">
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm text-gray-600 cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option>All Status</option>
                            <option>Active</option>
                            <option>Suspended</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* Add User Button */}
                <button 
                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    onClick={() => setShowAddModal(true)}
                >
                    <Plus size={18} />
                    Add User
                </button>
            </div>

            {/* Add User Modal */}
            <AddUserModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onAdd={handleAddUser}
            />

            {/* Users Table */}
            <UserTable
                users={paginatedUsers}
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredUsers.length}
                itemsPerPage={itemsPerPage}
                startIndex={startIndex}
                onPageChange={handlePageChange}
            />
        </div>
    );
};
