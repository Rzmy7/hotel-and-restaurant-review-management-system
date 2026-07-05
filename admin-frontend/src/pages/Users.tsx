import React, { useEffect, useMemo, useState } from 'react';
import { UsersSkeleton } from './UsersSkeleton';
import { UserStatsGrid } from '../components/UserStatsGrid';
import { UserFilters } from '../components/UserFilters';
import { UserTable } from '../components/UserTable';
import { AddUserModal } from '../components/AddUserModal';
import { createUser, deleteUser, fetchUserStats, fetchUsers, updateUser } from '../services/adminDataService';
import { fetchSubscriptionPlans } from '../services/subscriptionPlansService';
import type { User } from '../types';

export const UsersPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [stats, setStats] = useState({
        allActiveUsers: 0,
        todayActiveUsers: 0,
        todayRegistered: 0,
    });
    const [loading, setLoading] = useState(true);
    const [usersLoading, setUsersLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('All Roles');
    const [planFilter, setPlanFilter] = useState('All Plans');
    const [statusFilter, setStatusFilter] = useState('All Status');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [showAddModal, setShowAddModal] = useState(false);
    const [availablePlans, setAvailablePlans] = useState<string[]>([]);
    const [reloadCounter, setReloadCounter] = useState(0);
    const itemsPerPage = 8;

    // Load static filters and stats on mount
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const statsData = await fetchUserStats();
                setStats(statsData);
            } catch (error) {
                console.error('Failed to load user stats:', error);
            }

            try {
                const plans = await fetchSubscriptionPlans();
                const activePlanNames = plans
                    .filter(plan => plan.isActive)
                    .map(plan => plan.name)
                    .filter(planName => planName.toLowerCase() !== 'basic')
                    .filter((name, index, all) => all.indexOf(name) === index);
                setAvailablePlans(activePlanNames);
            } catch (error) {
                console.error('Failed to load subscription plans for filter:', error);
            }
        };
        loadInitialData();
    }, []);

    // Load paginated/filtered users
    useEffect(() => {
        const loadUsersData = async () => {
            setUsersLoading(true);
            try {
                const apiRole = roleFilter === 'All Roles' ? undefined : roleFilter;
                const apiPlan = planFilter === 'All Plans' ? undefined : planFilter;
                const apiStatus = statusFilter === 'All Status' ? undefined : statusFilter;

                const paginatedResponse = await fetchUsers(
                    currentPage,
                    itemsPerPage,
                    searchQuery,
                    apiRole,
                    apiPlan,
                    apiStatus
                );
                setUsers(paginatedResponse.data);
                setTotalItems(paginatedResponse.total);
            } catch (error) {
                console.error('Failed to load users:', error);
            } finally {
                setUsersLoading(false);
                setLoading(false);
            }
        };

        const timer = setTimeout(() => {
            loadUsersData();
        }, searchQuery ? 300 : 0);

        return () => clearTimeout(timer);
    }, [currentPage, searchQuery, roleFilter, planFilter, statusFilter, reloadCounter]);

    const planOptions = useMemo(() => {
        const assignedPlans = users
            .map(user => user.plan?.trim())
            .filter((plan): plan is string => Boolean(plan) && typeof plan === 'string' && plan.toLowerCase() !== 'basic');

        return [...new Set([...availablePlans, ...assignedPlans])];
    }, [availablePlans, users]);

    // Stats calculations
    const allActiveUsers = stats.allActiveUsers || users.filter(u => u.status === 'Active').length;
    const todayActiveUsers = stats.todayActiveUsers;
    const todayRegistered = stats.todayRegistered;

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const refreshStats = async () => {
        try {
            const latestStats = await fetchUserStats();
            setStats(latestStats);
        } catch (error) {
            console.error('Failed to refresh user stats:', error);
        }
    };

    const handleAddUser = async (newAdmin: { name: string; email: string; password: string }) => {
        try {
            await createUser({
                name: newAdmin.name,
                email: newAdmin.email,
                password: newAdmin.password,
                role: 'Admin',
                status: 'Active',
            });

            // Re-fetch current page or reset to first page on creation
            setCurrentPage(1);
            setReloadCounter(prev => prev + 1);
            await refreshStats();
        } catch (error) {
            console.error('Failed to add user:', error);
        }
    };

    const handleUserUpdate = async (updatedUser: User) => {
        try {
            const savedUser = await updateUser(updatedUser.id, {
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                status: updatedUser.status,
                plan: updatedUser.plan,
                organizations: updatedUser.organizations,
                groups: updatedUser.groups,
            });

            setUsers(prevUsers =>
                prevUsers.map(user =>
                    user.id === savedUser.id ? savedUser : user
                )
            );
            await refreshStats();
        } catch (error) {
            console.error('Failed to update user:', error);
        }
    };

    const handleUserDelete = async (userId: string) => {
        try {
            await deleteUser(userId);
            // Reload page to maintain count consistency
            setReloadCounter(prev => prev + 1);
            await refreshStats();
        } catch (error) {
            console.error('Failed to delete user:', error);
        }
    };

    if (loading) {
        return <UsersSkeleton />;
    }

    return (
        <div className="space-y-6 pt-4">
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
                planOptions={planOptions}
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
            <div className={usersLoading ? "opacity-50 pointer-events-none transition-opacity duration-200" : "transition-opacity duration-200"}>
                <UserTable
                    users={users}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    startIndex={startIndex}
                    onPageChange={handlePageChange}
                    onUserUpdate={handleUserUpdate}
                    onUserDelete={handleUserDelete}
                />
            </div>
        </div>
    );
};
