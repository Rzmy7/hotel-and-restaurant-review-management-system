import React, { useEffect, useMemo, useState } from "react";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { UserStatsGrid } from "../components/UserStatsGrid";
import { UserFilters } from "../components/UserFilters";
import { UserTable } from "../components/UserTable";
import { AddUserModal } from "../components/AddUserModal";
import {
  createUser,
  deleteUser,
  fetchUserStats,
  fetchUsers,
  updateUser,
} from "../services/adminDataService";
import { fetchSubscriptionPlans } from "../services/subscriptionPlansService";
import type { User } from "../types";

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState({
    allActiveUsers: 0,
    todayActiveUsers: 0,
    todayRegistered: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [planFilter, setPlanFilter] = useState("All Plans");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<string[]>([]);
  const itemsPerPage = 8;

  useEffect(() => {
    const loadData = async () => {
      try {
        const [userData, statsData] = await Promise.all([
          fetchUsers(),
          fetchUserStats(),
        ]);
        setUsers(userData);
        setStats(statsData);

        try {
          const plans = await fetchSubscriptionPlans();
          const activePlanNames = plans
            .filter((plan) => plan.isActive)
            .map((plan) => plan.name)
            .filter((planName) => planName.toLowerCase() !== "basic")
            .filter((name, index, all) => all.indexOf(name) === index);
          setAvailablePlans(activePlanNames);
        } catch (error) {
          console.error("Failed to load subscription plans for filter:", error);
        }
      } catch (error) {
        console.error("Failed to load users data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const planOptions = useMemo(() => {
    const assignedPlans = users
      .map((user) => user.plan?.trim())
      .filter(
        (plan): plan is string =>
          Boolean(plan) &&
          typeof plan === "string" &&
          plan.toLowerCase() !== "basic",
      );

    return [...new Set([...availablePlans, ...assignedPlans])];
  }, [availablePlans, users]);

  // Stats calculations
  const allActiveUsers =
    stats.allActiveUsers || users.filter((u) => u.status === "Active").length;
  const todayActiveUsers = stats.todayActiveUsers;
  const todayRegistered = stats.todayRegistered;

  // Filter Logic
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "All Roles" || user.role === roleFilter;
    const matchesPlan = planFilter === "All Plans" || user.plan === planFilter;
    const matchesStatus =
      statusFilter === "All Status" || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesPlan && matchesStatus;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

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
      console.error("Failed to refresh user stats:", error);
    }
  };

  const handleAddUser = async (newAdmin: {
    name: string;
    email: string;
    password: string;
  }) => {
    try {
      const createdUser = await createUser({
        name: newAdmin.name,
        email: newAdmin.email,
        password: newAdmin.password,
        role: "Admin",
        status: "Active",
      });

      setUsers((prevUsers) => [createdUser, ...prevUsers]);
      await refreshStats();
    } catch (error) {
      console.error("Failed to add user:", error);
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

      setUsers((prevUsers) =>
        prevUsers.map((user) => (user.id === savedUser.id ? savedUser : user)),
      );
      await refreshStats();
    } catch (error) {
      console.error("Failed to update user:", error);
    }
  };

  const handleUserDelete = async (userId: string) => {
    try {
      await deleteUser(userId);
      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));
      await refreshStats();
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  };

  if (loading) {
    return <LoadingSpinner size={32} />;
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
        onSearchChange={(value) => {
          setSearchQuery(value);
          setCurrentPage(1);
        }}
        onRoleChange={(value) => {
          setRoleFilter(value);
          setCurrentPage(1);
        }}
        onPlanChange={(value) => {
          setPlanFilter(value);
          setCurrentPage(1);
        }}
        onStatusChange={(value) => {
          setStatusFilter(value);
          setCurrentPage(1);
        }}
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
        onUserDelete={handleUserDelete}
      />
    </div>
  );
};
