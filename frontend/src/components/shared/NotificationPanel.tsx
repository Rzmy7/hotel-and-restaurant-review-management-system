import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    X,
    Star,
    AlertTriangle,
    CheckCircle2,
    RefreshCw,
    Bell,
    ChevronRight,
} from 'lucide-react';
import { useNotificationStore } from '../../stores/useNotificationStore';

export interface Notification {
    id: string;
    type: 'review' | 'alert' | 'success' | 'system';
    title: string;
    message: string;
    time: string;
    read: boolean;
}

const mapNotificationType = (type: string): Notification['type'] => {
    switch (type) {
        case 'success':
            return 'success';
        case 'warning':
        case 'error':
            return 'alert';
        case 'maintenance':
        case 'announcement':
            return 'review';
        case 'info':
        default:
            return 'system';
    }
};

const formatNotificationTime = (value: string | null): string => {
    if (!value) return 'Unknown time';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Unknown time';
    return parsed.toLocaleString();
};

const iconMap: Record<Notification['type'], { icon: React.ReactNode; bg: string; color: string }> = {
    review: {
        icon: <Star size={16} />,
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        color: 'text-amber-500 dark:text-amber-400',
    },
    alert: {
        icon: <AlertTriangle size={16} />,
        bg: 'bg-red-50 dark:bg-red-900/20',
        color: 'text-red-500 dark:text-red-400',
    },
    success: {
        icon: <CheckCircle2 size={16} />,
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        color: 'text-emerald-500 dark:text-emerald-400',
    },
    system: {
        icon: <RefreshCw size={16} />,
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        color: 'text-blue-500 dark:text-blue-400',
    },
};

interface NotificationPanelProps {
    onClose: () => void;
    onUnreadCountChange?: (count: number) => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ onClose, onUnreadCountChange }) => {
    const navigate = useNavigate();
    const {
        notifications: rawNotifications,
        hasMore,
        loading: isStoreLoading,
        fetchNotifications,
        markAsReadInStore,
        deleteNotificationInStore,
        markAllAsReadInStore,
        deleteAllReadInStore,
        unreadCount,
        fetchUnreadCount,
    } = useNotificationStore();

    const [limit, setLimit] = useState(5);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const panelLockRef = useRef(false);

    // Sync store unreadCount to parent header
    useEffect(() => {
        onUnreadCountChange?.(unreadCount);
    }, [unreadCount, onUnreadCountChange]);

    // Initial fetch of unread count and first 5 notifications (stale-while-revalidate)
    useEffect(() => {
        fetchUnreadCount();
        fetchNotifications(5, 0, rawNotifications.length <= 5);
    }, []);

    const mappedNotifications = useMemo(() => {
        return rawNotifications.map((item) => ({
            id: item.notification_id,
            type: mapNotificationType(item.notification_type),
            title: item.title || 'Notification',
            message: item.message || '',
            time: formatNotificationTime(item.created_at),
            read: !!item.is_read,
        }));
    }, [rawNotifications]);

    const displayedNotifications = useMemo(() => {
        return mappedNotifications.slice(0, limit);
    }, [mappedNotifications, limit]);

    // IntersectionObserver scroll-to-load sentinel
    useEffect(() => {
        if (!sentinelRef.current || isStoreLoading) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !panelLockRef.current) {
                    panelLockRef.current = true;
                    
                    if (mappedNotifications.length > limit) {
                        // Slice more from existing cached memory array
                        setLimit((prev) => prev + 5);
                        panelLockRef.current = false;
                    } else if (hasMore) {
                        // Fetch next 5 notifications from backend
                        fetchNotifications(5, rawNotifications.length).then(() => {
                            setLimit((prev) => prev + 5);
                            panelLockRef.current = false;
                        });
                    } else {
                        panelLockRef.current = false;
                    }
                }
            },
            { threshold: 0.1, rootMargin: '50px' }
        );

        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [mappedNotifications.length, limit, hasMore, isStoreLoading, fetchNotifications, rawNotifications.length]);

    const handleMarkAsRead = async (id: string) => {
        await markAsReadInStore(id);
    };

    const handleDismiss = async (id: string) => {
        await deleteNotificationInStore(id);
    };

    const handleMarkAllRead = async () => {
        await handleMarkAllReadInStore();
    };

    const handleMarkAllReadInStore = async () => {
        await markAllAsReadInStore();
    };

    const handleClearAll = async () => {
        await deleteAllReadInStore();
    };

    const handleViewAll = () => {
        onClose();
        navigate('/notifications');
    };

    return (
        <div
            className="absolute right-0 top-[calc(100%+8px)] w-[400px] max-h-[520px] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 flex flex-col z-50 overflow-hidden"
            style={{ animation: 'fadeIn 0.15s ease-out' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                    <Bell size={18} className="text-gray-700 dark:text-slate-300" />
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white m-0">Notifications</h3>
                    {unreadCount > 0 && (
                        <span className="ml-1 bg-blue-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full leading-none animate-pulse">
                            {unreadCount}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <button
                            className="text-xs text-blue-500 font-medium bg-transparent border-none cursor-pointer hover:text-blue-700 dark:hover:text-blue-400 transition-colors px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            onClick={handleMarkAllRead}
                        >
                            Mark all read
                        </button>
                    )}
                    <button
                        className="w-7 h-7 grid place-items-center rounded-md text-gray-400 bg-transparent border-none cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-600 dark:hover:text-gray-300 transition"
                        onClick={onClose}
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto">
                {displayedNotifications.length === 0 && !isStoreLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-700 grid place-items-center mb-3">
                            <Bell size={22} className="text-gray-300 dark:text-slate-500" />
                        </div>
                        <p className="text-sm text-gray-400 dark:text-slate-500 m-0">You're all caught up!</p>
                        <p className="text-xs text-gray-300 dark:text-slate-600 m-0 mt-1">No new notifications</p>
                    </div>
                ) : (
                    <>
                        {displayedNotifications.map((notif) => {
                            const style = iconMap[notif.type];
                            return (
                                <div
                                    key={notif.id}
                                    className={`flex items-start gap-3 px-5 py-3.5 border-b border-gray-50 dark:border-slate-700/50 cursor-pointer transition-colors group ${
                                        notif.read ? 'bg-white dark:bg-slate-800' : 'bg-blue-50/40 dark:bg-blue-950/10'
                                    } hover:bg-gray-50 dark:hover:bg-slate-700/30`}
                                    onClick={() => handleMarkAsRead(notif.id)}
                                >
                                    {/* Icon */}
                                    <div
                                        className={`w-8 h-8 rounded-lg ${style.bg} ${style.color} grid place-items-center shrink-0 mt-0.5`}
                                    >
                                        {style.icon}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white m-0 truncate">
                                                {notif.title}
                                            </p>
                                            {!notif.read && (
                                                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-slate-400 m-0 mt-0.5 line-clamp-2 leading-relaxed">
                                            {notif.message}
                                        </p>
                                        <p className="text-[11px] text-gray-400 dark:text-slate-500 m-0 mt-1">{notif.time}</p>
                                    </div>

                                    {/* Dismiss */}
                                    <button
                                        className="w-6 h-6 grid place-items-center rounded text-gray-300 bg-transparent border-none cursor-pointer opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-slate-700 hover:text-gray-500 dark:hover:text-gray-300 transition-all shrink-0 mt-0.5"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDismiss(notif.id);
                                        }}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            );
                        })}

                        {/* Sentinel for lazy loading */}
                        {hasMore && (
                            <div ref={sentinelRef} className="py-4 flex justify-center items-center border-t border-gray-50 dark:border-slate-700/30">
                                {isStoreLoading ? (
                                    <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500">
                                        <span className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                                        Loading more...
                                    </div>
                                ) : (
                                    <span className="text-[10px] text-gray-400 dark:text-slate-500 tracking-[1px] uppercase animate-pulse">Scroll for more</span>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer */}
            {displayedNotifications.length > 0 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
                    <button
                        className="text-xs text-gray-400 dark:text-slate-500 font-medium bg-transparent border-none cursor-pointer hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20"
                        onClick={handleClearAll}
                    >
                        Clear All
                    </button>
                    <button 
                        className="flex items-center gap-1 text-xs text-blue-500 font-medium bg-transparent border-none cursor-pointer hover:text-blue-700 dark:hover:text-blue-400 transition-colors px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        onClick={handleViewAll}
                    >
                        View All Notifications
                        <ChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default NotificationPanel;
