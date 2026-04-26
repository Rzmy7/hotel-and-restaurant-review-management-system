import React from 'react';
import { Search, Plus, ChevronDown } from 'lucide-react';

interface UserFiltersProps {
    searchQuery: string;
    roleFilter: string;
    planFilter: string;
    planOptions: string[];
    statusFilter: string;
    onSearchChange: (value: string) => void;
    onRoleChange: (value: string) => void;
    onPlanChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onAddClick: () => void;
}

export const UserFilters: React.FC<UserFiltersProps> = ({
    searchQuery,
    roleFilter,
    planFilter,
    planOptions,
    statusFilter,
    onSearchChange,
    onRoleChange,
    onPlanChange,
    onStatusChange,
    onAddClick
}) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-gray-100 dark:border-slate-700 p-6 flex items-center justify-between gap-4 hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-center gap-4 flex-1">
                {/* Search Input */}
                <div className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl px-4 py-3 flex-1 max-w-xl border border-gray-200 dark:border-slate-700 focus-within:border-blue-300 dark:focus-within:border-blue-500/50 focus-within:shadow-md transition-all duration-300">
                    <Search size={20} className="text-gray-400 dark:text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="bg-transparent border-none outline-none text-sm text-gray-700 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 w-full font-medium"
                    />
                </div>
                
                {/* Role Filter */}
                <div className="relative">
                    <select
                        value={roleFilter}
                        onChange={(e) => onRoleChange(e.target.value)}
                        className="appearance-none bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 pr-10 text-sm text-gray-700 dark:text-slate-200 font-medium cursor-pointer hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    >
                        <option>All Roles</option>
                        <option>Admin</option>
                        <option>User</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none" />
                </div>

                {/* Subscription Plan Filter */}
                <div className="relative">
                    <select
                        value={planFilter}
                        onChange={(e) => onPlanChange(e.target.value)}
                        className="appearance-none bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 pr-10 text-sm text-gray-700 dark:text-slate-200 font-medium cursor-pointer hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    >
                        <option>All Plans</option>
                        {planOptions.map((planName) => (
                            <option key={planName} value={planName}>{planName}</option>
                        ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none" />
                </div>

                {/* Status Filter */}
                <div className="relative">
                    <select
                        value={statusFilter}
                        onChange={(e) => onStatusChange(e.target.value)}
                        className="appearance-none bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 pr-10 text-sm text-gray-700 dark:text-slate-200 font-medium cursor-pointer hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    >
                        <option>All Status</option>
                        <option>Active</option>
                        <option>Suspended</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none" />
                </div>
            </div>

            {/* Add User Button */}
            <button 
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-sm font-semibold shadow-lg shadow-blue-200 dark:shadow-none hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                onClick={onAddClick}
            >
                <Plus size={20} />
                Add User
            </button>
        </div>
    );
};
