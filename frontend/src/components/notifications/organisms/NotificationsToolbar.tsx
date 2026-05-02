import React from 'react';
import { Filter } from 'lucide-react';
import FilterTab from '../molecules/FilterTab';
import BulkActions from '../molecules/BulkActions';

interface NotificationsToolbarProps {
    activePrimaryFilter: 'all' | 'unread';
    activeCategoryFilter: 'all-types' | 'announcement' | 'alert' | 'success' | 'system';
    onPrimaryFilterChange: (filter: 'all' | 'unread') => void;
    onCategoryFilterChange: (filter: 'all-types' | 'announcement' | 'alert' | 'success' | 'system') => void;
    counts: Record<string, number>;
    unreadCount: number;
    totalCount: number;
    onMarkAllRead: () => void;
    onClearAll: () => void;
}

const primaryFilterTabs = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
];

const categoryFilterTabs = [
    { key: 'all-types', label: 'All Types' },
    { key: 'announcement', label: 'Announcements' },
    { key: 'alert', label: 'Alerts' },
    { key: 'success', label: 'Success' },
    { key: 'system', label: 'System' },
];

const NotificationsToolbar: React.FC<NotificationsToolbarProps> = ({
    activePrimaryFilter,
    activeCategoryFilter,
    onPrimaryFilterChange,
    onCategoryFilterChange,
    counts,
    unreadCount,
    totalCount,
    onMarkAllRead,
    onClearAll,
}) => {
    return (
        // full tool bar background 
        <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-300">
            <div className="flex items-center justify-between px-6 py-4 flex-wrap gap-4">
                {/* Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="w-9 h-9 grid place-items-center bg-gray-50 dark:bg-slate-800 rounded-xl text-gray-400 mr-2 border border-gray-100 dark:border-slate-700">
                        <Filter size={16} />
                    </div>
                    <div className="flex items-center gap-2">
                        {primaryFilterTabs.map((tab) => (
                            <FilterTab
                                key={tab.key}
                                label={tab.label}
                                count={counts[tab.key] || 0}
                                isActive={activePrimaryFilter === tab.key}
                                onClick={() => onPrimaryFilterChange(tab.key as 'all' | 'unread')}
                            />
                        ))}
                    </div>

                    <div className="h-6 w-px bg-gray-200 dark:bg-slate-700 mx-1" aria-hidden="true" />

                    <div className="flex items-center gap-2">
                        {categoryFilterTabs.map((tab) => (
                            <FilterTab
                                key={tab.key}
                                label={tab.label}
                                count={tab.key === 'all-types' ? (counts.all || 0) : (counts[tab.key] || 0)}
                                isActive={activeCategoryFilter === tab.key}
                                onClick={() => onCategoryFilterChange(tab.key as 'all-types' | 'announcement' | 'alert' | 'success' | 'system')}
                            />
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <BulkActions
                    unreadCount={unreadCount}
                    totalCount={totalCount}
                    onMarkAllRead={onMarkAllRead}
                    onClearAll={onClearAll}
                />
            </div>
        </div>
    );
};

export default NotificationsToolbar;
