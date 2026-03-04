import React from 'react';
import { Search, Plus, ChevronDown } from 'lucide-react';

interface UserFiltersProps {
    searchQuery: string;
    roleFilter: string;
    planFilter: string;
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
    statusFilter,
    onSearchChange,
    onRoleChange,
    onPlanChange,
    onStatusChange,
    onAddClick
}) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
                {/* Search Input */}
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2.5 flex-1 max-w-xl">
                    <Search size={18} className="text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="bg-transparent border-none outline-none text-sm text-gray-600 placeholder-gray-400 w-full"
                    />
                </div>
                
                {/* Role Filter */}
                <div className="relative">
                    <select
                        value={roleFilter}
                        onChange={(e) => onRoleChange(e.target.value)}
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
                        onChange={(e) => onPlanChange(e.target.value)}
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
                        onChange={(e) => onStatusChange(e.target.value)}
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
                onClick={onAddClick}
            >
                <Plus size={18} />
                Add User
            </button>
        </div>
    );
};
