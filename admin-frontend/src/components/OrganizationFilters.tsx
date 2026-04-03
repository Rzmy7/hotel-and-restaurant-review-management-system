import React from 'react';
import { Search, ChevronDown } from 'lucide-react';

interface OrganizationFiltersProps {
    searchQuery: string;
    statusFilter: string;
    onSearchChange: (value: string) => void;
    onStatusChange: (value: string) => void;
}

export const OrganizationFilters: React.FC<OrganizationFiltersProps> = ({
    searchQuery,
    statusFilter,
    onSearchChange,
    onStatusChange,
}) => {
    return (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 flex items-center justify-between gap-4 hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-center gap-4 flex-1">
                {/* Search Input */}
                <div className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl px-4 py-3 flex-1 max-w-xl border border-gray-200/50 focus-within:border-blue-300 focus-within:bg-white focus-within:shadow-md transition-all duration-300">
                    <Search size={20} className="text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search organizations..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="bg-transparent border-none outline-none text-sm text-gray-700 placeholder-gray-400 w-full font-medium"
                    />
                </div>
                
                {/* Status Filter */}
                <div className="relative">
                    <select
                        value={statusFilter}
                        onChange={(e) => onStatusChange(e.target.value)}
                        className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm text-gray-700 font-medium cursor-pointer hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    >
                        <option>All Status</option>
                        <option>Active</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
            </div>
        </div>
    );
};
