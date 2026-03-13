import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
    icon: LucideIcon;
    title: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ icon: Icon, title }) => {
    return (
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-slate-700/50">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-[#4e80ee] dark:text-blue-400 flex items-center justify-center">
                <Icon size={20} />
            </div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase m-0">{title}</h2>
        </div>
    );
};
