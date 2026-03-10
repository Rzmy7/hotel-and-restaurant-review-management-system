import React, { useEffect, useState } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { UserStatsGrid } from '../components/UserStatsGrid';
import { UserFilters } from '../components/UserFilters';
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

    const handleUserUpdate = (updatedUser: User) => {
        setUsers(prevUsers => 
            prevUsers.map(user => 
                user.id === updatedUser.id ? updatedUser : user
            )
        );
    };

    if (loading) {
        return <LoadingSpinner size={32} />;
    }

    return (
        <div className="space-y-8 pt-4">
            {/* Stats Cards */}
            <UserStatsGrid
                allActiveUsers={allActiveUsers}
                todayActiveUsers={todayActiveUsers}
                todayRegistered={todayRegistered}
            />

            {/* Filters */}
            <UserFilters
                searchQuery={searchQuery}
                roleFilter={roleFilter}
                planFilter={planFilter}
                statusFilter={statusFilter}
                onSearchChange={(value) => { setSearchQuery(value); setCurrentPage(1); }}
                onRoleChange={(value) => { setRoleFilter(value); setCurrentPage(1); }}
                onPlanChange={(value) => { setPlanFilter(value); setCurrentPage(1); }}
                onStatusChange={(value) => { setStatusFilter(value); setCurrentPage(1); }}
                onAddClick={() => setShowAddModal(true)}
            />

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
                onUserUpdate={handleUserUpdate}
            />
        </div>
    );
};
