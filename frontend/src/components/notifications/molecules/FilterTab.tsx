import React from 'react';

interface FilterTabProps {
    label: string;
    count: number;
    isActive: boolean;
    onClick: () => void;
}

const FilterTab: React.FC<FilterTabProps> = ({ label, count, isActive, onClick }) => {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 rounded-xl text-[13px] font-bold cursor-pointer transition-all duration-300 border flex items-center gap-2.5 ${isActive
                ? 'bg-blue-50 text-[#4e80ee] border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30 shadow-sm'
                : 'bg-transparent text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-slate-800/50 dark:hover:text-gray-200'
                }`}
        >
            {label}
            <span
                className={`text-[10px] px-2 py-0.5 rounded-lg font-black tracking-widest transition-all duration-300 ${isActive
                    ? 'bg-[#4e80ee] text-white shadow-md shadow-blue-200'
                    : 'bg-gray-100 text-gray-400 dark:bg-slate-700 dark:text-slate-500'
                    }`}
            >
                {count}
            </span>
        </button>
    );
};

export default FilterTab;
