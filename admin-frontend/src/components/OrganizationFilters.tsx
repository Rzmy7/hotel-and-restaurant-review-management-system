import React from 'react';
import { Search } from 'lucide-react';

interface OrganizationFiltersProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
}

export const OrganizationFilters: React.FC<OrganizationFiltersProps> = ({
    searchQuery,
    onSearchChange,
}) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-gray-100 dark:border-slate-700 p-6 flex items-center justify-between gap-4 hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-center gap-4 flex-1">
                {/* Search Input */}
                <div className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl px-4 py-3 flex-1 max-w-xl border border-gray-200 dark:border-slate-700 focus-within:border-blue-300 dark:focus-within:border-blue-500/50 focus-within:shadow-md transition-all duration-300">
                    <Search size={20} className="text-gray-400 dark:text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search organizations..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="bg-transparent border-none outline-none text-sm text-gray-700 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 w-full font-medium"
                    />
                </div>
            </div>
        </div>
    );
};
