import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import NotificationsHeader from '../organisms/NotificationsHeader';
import NotificationsToolbar from '../organisms/NotificationsToolbar';
import NotificationItem from '../organisms/NotificationItem';
import EmptyState from '../molecules/EmptyState';
import type { NotificationType } from '../atoms/NotificationIcon';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    time: string;
    date: string;
    read: boolean;
}

interface NotificationsTemplateProps {
    notifications: Notification[];
    activePrimaryFilter: 'all' | 'unread';
    activeCategoryFilter: 'all-types' | 'announcement' | 'alert' | 'system';
    onPrimaryFilterChange: (filter: 'all' | 'unread') => void;
    onCategoryFilterChange: (filter: 'all-types' | 'announcement' | 'alert' | 'system') => void;
    isFiltered: boolean;
    activeFilterLabel: string;
    counts: Record<string, number>;
    unreadCount: number;
    onMarkAsRead: (id: string) => void;
    onDismiss: (id: string) => void;
    onMarkAllRead: () => void;
    onClearAll: () => void;
}

const ITEMS_PER_PAGE = 10;

const NotificationsTemplate: React.FC<NotificationsTemplateProps> = ({
    notifications,
    activePrimaryFilter,
    activeCategoryFilter,
    onPrimaryFilterChange,
    onCategoryFilterChange,
    isFiltered,
    activeFilterLabel,
    counts,
    unreadCount,
    onMarkAsRead,
    onDismiss,
    onMarkAllRead,
    onClearAll,
}) => {
    const [currentPage, setCurrentPage] = useState(1);

    // Reset to page 1 when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [activePrimaryFilter, activeCategoryFilter]);

    const totalPages = Math.max(1, Math.ceil(notifications.length / ITEMS_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);

    const paginatedNotifications = useMemo(() => {
        const start = (safePage - 1) * ITEMS_PER_PAGE;
        return notifications.slice(start, start + ITEMS_PER_PAGE);
    }, [notifications, safePage]);

    // Group paginated items by date
    const grouped = paginatedNotifications.reduce<Record<string, Notification[]>>(
        (acc, n) => {
            (acc[n.date] ??= []).push(n);
            return acc;
        },
        {}
    );

    const startItem = (safePage - 1) * ITEMS_PER_PAGE + 1;
    const endItem = Math.min(safePage * ITEMS_PER_PAGE, notifications.length);

    // Generate compact page numbers with ellipsis
    const pageNumbers = useMemo(() => {
        const pages: (number | '...')[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (safePage > 3) pages.push('...');
            const rangeStart = Math.max(2, safePage - 1);
            const rangeEnd = Math.min(totalPages - 1, safePage + 1);
            for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
            if (safePage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    }, [totalPages, safePage]);

    return (
        <div className="min-h-screen bg-[#fcfcfd] dark:bg-slate-900 flex flex-col">
            <NotificationsHeader />

            <main className="flex-1 w-full max-w-[1200px] mx-auto px-8 py-8 space-y-8">
                <NotificationsToolbar
                    activePrimaryFilter={activePrimaryFilter}
                    activeCategoryFilter={activeCategoryFilter}
                    onPrimaryFilterChange={onPrimaryFilterChange}
                    onCategoryFilterChange={onCategoryFilterChange}
                    counts={counts}
                    unreadCount={unreadCount}
                    totalCount={notifications.length}
                    onMarkAllRead={onMarkAllRead}
                    onClearAll={onClearAll}
                />

                {notifications.length === 0 ? (
                    <EmptyState
                        isFiltered={isFiltered}
                        activeFilterLabel={activeFilterLabel}
                        onReset={() => {
                            onPrimaryFilterChange('all');
                            onCategoryFilterChange('all-types');
                        }}
                    />
                ) : (
                    <>
                        <div className="space-y-10">
                            {Object.entries(grouped).map(([date, items]) => (
                                <section key={date} className="space-y-4">
                                    <div className="flex items-center gap-4 px-2">
                                        <h5 className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[2px] whitespace-nowrap">
                                            {date}
                                        </h5>
                                        <div className="flex-1 h-px bg-gray-100 dark:bg-slate-800" />
                                    </div>

                                    <div className="grid gap-3">
                                        {items.map((notif) => (
                                            <NotificationItem
                                                key={notif.id}
                                                {...notif}
                                                onRead={onMarkAsRead}
                                                onDismiss={onDismiss}
                                            />
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>

                        {/* ── Pagination Controls ──────────────────────────── */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-6 border-t border-gray-100 dark:border-slate-800">
                                {/* Item range label */}
                                <p className="text-xs font-medium text-gray-400 dark:text-slate-500">
                                    Showing <span className="font-bold text-gray-600 dark:text-slate-300">{startItem}–{endItem}</span> of{' '}
                                    <span className="font-bold text-gray-600 dark:text-slate-300">{notifications.length}</span>
                                </p>

                                {/* Page buttons */}
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={safePage === 1}
                                        className="w-8 h-8 grid place-items-center rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 transition-all hover:border-blue-400 hover:text-blue-500 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-gray-200 dark:disabled:hover:border-slate-700"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>

                                    {pageNumbers.map((page, idx) =>
                                        page === '...' ? (
                                            <span key={`ellipsis-${idx}`} className="w-8 h-8 grid place-items-center text-xs text-gray-400 dark:text-slate-600 select-none">
                                                …
                                            </span>
                                        ) : (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-8 h-8 grid place-items-center rounded-lg text-xs font-bold transition-all ${
                                                    page === safePage
                                                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-200 dark:shadow-blue-900/30'
                                                        : 'border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-500'
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        )
                                    )}

                                    <button
                                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={safePage === totalPages}
                                        className="w-8 h-8 grid place-items-center rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 transition-all hover:border-blue-400 hover:text-blue-500 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-gray-200 dark:disabled:hover:border-slate-700"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Subtle Footer for spacing */}
            <div className="h-20 shrink-0" />
        </div>
    );
};

export default NotificationsTemplate;
