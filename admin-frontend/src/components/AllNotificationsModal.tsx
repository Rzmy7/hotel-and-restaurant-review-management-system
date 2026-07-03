import React, { useEffect, useState } from 'react';
import { X, Bell, CheckCircle2 } from 'lucide-react';
import type { AdminNotification } from '../services/notificationsService';
import { notificationsService } from '../services/notificationsService';
import { Pagination } from './Pagination';
import Skeleton from './shared/Skeleton';
import { formatDateTime } from '../utils/dateTime';

interface AllNotificationsModalProps {
    isOpen: boolean;
    onClose: () => void;
    timezone: string;
    onMarkAllRead: () => void;
    onMarkSingleRead: (id: string, alreadyRead: boolean) => void;
}

/**
 * Format an ISO timestamp string into a human-friendly relative label.
 */
function formatRelativeTime(timestamp: string | null, timezone: string): string {
    if (!timestamp) return 'Unknown time';
    try {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffSec < 60) return 'Just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHour < 24) return `${diffHour}h ago`;
        if (diffDay < 7) return `${diffDay}d ago`;
        return formatDateTime(timestamp, timezone);
    } catch {
        return timestamp;
    }
}

export const AllNotificationsModal: React.FC<AllNotificationsModalProps> = ({ 
    isOpen, 
    onClose, 
    timezone,
    onMarkAllRead,
    onMarkSingleRead 
}) => {
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const limit = 10;

    const loadNotifications = async () => {
        setLoading(true);
        try {
            const response = await notificationsService.getPaginatedNotifications(page, limit);
            setNotifications(response.data);
            setTotal(response.total);
        } catch (error) {
            console.error('Failed to load paginated notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isOpen) return;
        loadNotifications();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, page]);

    const handleMarkAllRead = async () => {
        await onMarkAllRead();
        setNotifications(prev => prev.map(item => ({ ...item, is_read: true })));
    };

    const handleMarkSingleRead = async (id: string, alreadyRead: boolean) => {
        if (alreadyRead) return;
        await onMarkSingleRead(id, alreadyRead);
        setNotifications(prev => prev.map(item => 
            item.notification_id === id ? { ...item, is_read: true } : item
        ));
    };

    if (!isOpen) return null;

    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-100 dark:border-slate-700">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
                            <Bell size={20} className="text-indigo-500 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All Notifications</h2>
                            <p className="text-sm text-gray-500 dark:text-slate-400">System announcements and alerts</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleMarkAllRead}
                            className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium transition-colors"
                        >
                            Mark all as read
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="divide-y divide-gray-50 dark:divide-slate-700/50 animate-shimmer">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="p-4 flex items-start gap-4 mx-2 my-1">
                                    <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
                                    <div className="flex-1 space-y-2 pt-0.5">
                                        <Skeleton className="h-4 w-48 rounded" />
                                        <Skeleton className="h-3.5 w-3/4 rounded" />
                                        <Skeleton className="h-3 w-24 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="py-20 text-center text-gray-400 dark:text-slate-500">
                            <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-300 dark:text-emerald-500" />
                            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">All caught up</p>
                            <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">No notifications to display</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50 dark:divide-slate-700/50">
                            {notifications.map((notification) => (
                                <button
                                    key={notification.notification_id}
                                    onClick={() => handleMarkSingleRead(notification.notification_id, notification.is_read)}
                                    className={`w-full text-left p-4 flex items-start gap-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors rounded-lg mx-2 my-1 border-l-2 ${
                                        notification.is_read
                                            ? 'bg-opacity-0 border-l-transparent'
                                            : 'bg-indigo-50/40 border-l-indigo-400 dark:bg-indigo-900/20'
                                    }`}
                                >
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p
                                                    className={`text-sm text-gray-900 dark:text-white ${!notification.is_read ? 'font-semibold' : 'font-medium'}`}
                                                >
                                                    {notification.title}
                                                </p>
                                            </div>
                                            {!notification.is_read && (
                                                <span className="flex-shrink-0 mt-1 w-2 h-2 rounded-full bg-indigo-500" />
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                                            {notification.message}
                                        </p>
                                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
                                            {formatRelativeTime(notification.created_at, timezone)}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer with Pagination */}
                <div className="mt-auto">
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        totalItems={total}
                        itemsPerPage={limit}
                        startIndex={startIndex}
                        onPageChange={setPage}
                        itemLabel="notifications"
                    />
                </div>
            </div>
        </div>
    );
};
