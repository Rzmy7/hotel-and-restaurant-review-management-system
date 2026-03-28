import React from 'react';
import { Filter } from 'lucide-react';
import FilterTab from '../molecules/FilterTab';
import BulkActions from '../molecules/BulkActions';

interface NotificationsToolbarProps {
    activeFilter: string;
    onFilterChange: (filter: any) => void;
    counts: Record<string, number>;
    unreadCount: number;
    totalCount: number;
    onMarkAllRead: () => void;
    onClearAll: () => void;
}

const filterTabs = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'announcement', label: 'Announcements' },
    { key: 'alert', label: 'Alerts' },
    { key: 'system', label: 'System' },
];

const NotificationsToolbar: React.FC<NotificationsToolbarProps> = ({
    activeFilter,
    onFilterChange,
    counts,
    unreadCount,
    totalCount,
    onMarkAllRead,
    onClearAll,
}) => {
    return (
        <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-300">
            <div className="flex items-center justify-between px-6 py-4 flex-wrap gap-4">
                {/* Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="w-9 h-9 grid place-items-center bg-gray-50 dark:bg-slate-800 rounded-xl text-gray-400 mr-2 border border-gray-100 dark:border-slate-700">
                        <Filter size={16} />
                    </div>
                    {filterTabs.map((tab) => (
                        <FilterTab
                            key={tab.key}
                            label={tab.label}
                            count={counts[tab.key] || 0}
                            isActive={activeFilter === tab.key}
                            onClick={() => onFilterChange(tab.key)}
                        />
                    ))}
                </div>

                {/* Actions */}
                <BulkActions
                    unreadCount={unreadCount}
                    totalCount={totalCount}
                    onMarkAllRead={onMarkAllRead}
                    onClearAll={onClearAll}
                />
            </div>

            {/* Dynamic Status Bar */}
            <div className="px-6 py-2.5 bg-gray-50/50 dark:bg-slate-900/50 border-t border-gray-50 dark:border-slate-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${unreadCount > 0 ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`} />
                    <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                        {unreadCount > 0 ? `${unreadCount} Pending Actions` : 'System Optimal'}
                    </span>
                </div>
                <span className="text-[10px] font-black text-gray-300 dark:text-slate-600 uppercase tracking-widest">
                    {totalCount} Notifications Logged
                </span>
            </div>
        </div>
    );
};

export default NotificationsToolbar;
