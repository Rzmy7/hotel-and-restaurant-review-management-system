import React, { useState } from 'react';
import {
    Bell,
    Star,
    AlertTriangle,
    CheckCircle2,
    RefreshCw,
    X,
    CheckCheck,
    Trash2,
    Filter,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import NotificationsHeader from '../components/shared/NotificationsHeader';

// ── Types ──────────────────────────────────────────────────────────
interface Notification {
    id: number;
    type: 'review' | 'alert' | 'success' | 'system';
    title: string;
    message: string;
    time: string;
    date: string;
    read: boolean;
}

type FilterTab = 'all' | 'unread' | 'review' | 'alert' | 'system';

// ── Mock data ──────────────────────────────────────────────────────
const mockNotifications: Notification[] = [
    {
        id: 1,
        type: 'review',
        title: 'New 5-Star Review',
        message:
            'A guest left a glowing review on TripAdvisor praising your staff service and room cleanliness. They specifically mentioned the exceptional breakfast selection.',
        time: '2 min ago',
        date: 'Today',
        read: false,
    },
    {
        id: 2,
        type: 'alert',
        title: 'Negative Review Detected',
        message:
            'A 1-star review on Booking.com mentions cleanliness issues in Room 402. The guest described finding hair in the bathroom and stains on the sheets.',
        time: '18 min ago',
        date: 'Today',
        read: false,
    },
    {
        id: 3,
        type: 'success',
        title: 'Source Sync Complete',
        message:
            'Google Reviews synced successfully — 12 new reviews imported. Your average rating increased to 4.5 stars.',
        time: '1 hour ago',
        date: 'Today',
        read: false,
    },
    {
        id: 4,
        type: 'system',
        title: 'Weekly Report Ready',
        message:
            'Your performance summary for Feb 10 – 16 is available. Click here to view comprehensive analytics and trends.',
        time: '3 hours ago',
        date: 'Today',
        read: true,
    },
    {
        id: 5,
        type: 'review',
        title: 'Review Response Needed',
        message:
            'A guest on Airbnb asked a follow-up question on their review about check-in procedures and late-checkout policy.',
        time: '5 hours ago',
        date: 'Today',
        read: true,
    },
    {
        id: 6,
        type: 'alert',
        title: 'Rating Drop Alert',
        message:
            'Your average rating on Google has dropped below 4.0 for the first time in 30 days. Consider reviewing recent negative feedback.',
        time: 'Yesterday',
        date: 'Yesterday',
        read: true,
    },
    {
        id: 7,
        type: 'success',
        title: 'Auto-Reply Sent',
        message:
            'AI-generated response was sent to 3 positive reviews on TripAdvisor. All responses matched your approved tone guidelines.',
        time: 'Yesterday',
        date: 'Yesterday',
        read: true,
    },
    {
        id: 8,
        type: 'system',
        title: 'Scheduled Scrape Completed',
        message:
            'Daily review scrape finished at 6:00 AM. 8 new reviews collected across all platforms with no errors.',
        time: '2 days ago',
        date: 'Feb 18',
        read: true,
    },
    {
        id: 9,
        type: 'review',
        title: 'New 4-Star Review',
        message:
            'A guest on Expedia praised the location and amenities but noted that the Wi-Fi speed could be improved in upper floors.',
        time: '2 days ago',
        date: 'Feb 18',
        read: true,
    },
    {
        id: 10,
        type: 'alert',
        title: 'Competitor Surpassed You',
        message:
            'Rival property "The Grand Suite" now has a higher average rating (4.6) on Booking.com compared to your current 4.3.',
        time: '3 days ago',
        date: 'Feb 17',
        read: true,
    },
    {
        id: 11,
        type: 'system',
        title: 'New Source Available',
        message:
            'Yelp integration is now available. Connect your Yelp Business page to start importing reviews automatically.',
        time: '4 days ago',
        date: 'Feb 16',
        read: true,
    },
    {
        id: 12,
        type: 'success',
        title: 'Monthly Milestone',
        message:
            'Congratulations! You responded to 100% of reviews this month. Your response rate is now best-in-class.',
        time: '5 days ago',
        date: 'Feb 15',
        read: true,
    },
];

// ── Icon map ───────────────────────────────────────────────────────
const iconMap: Record<
    Notification['type'],
    { icon: React.ReactNode; bg: string; color: string; ring: string }
> = {
    review: {
        icon: <Star size={18} />,
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        color: 'text-amber-500 dark:text-amber-400',
        ring: 'ring-amber-100 dark:ring-amber-800/30',
    },
    alert: {
        icon: <AlertTriangle size={18} />,
        bg: 'bg-red-50 dark:bg-red-900/20',
        color: 'text-red-500 dark:text-red-400',
        ring: 'ring-red-100 dark:ring-red-800/30',
    },
    success: {
        icon: <CheckCircle2 size={18} />,
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        color: 'text-emerald-500 dark:text-emerald-400',
        ring: 'ring-emerald-100 dark:ring-emerald-800/30',
    },
    system: {
        icon: <RefreshCw size={18} />,
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        color: 'text-blue-500 dark:text-blue-400',
        ring: 'ring-blue-100 dark:ring-blue-800/30',
    },
};

// ── Filter tabs ────────────────────────────────────────────────────
const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'review', label: 'Reviews' },
    { key: 'alert', label: 'Alerts' },
    { key: 'system', label: 'System' },
];

// ── Page ───────────────────────────────────────────────────────────
const NotificationsPage: React.FC = () => {
    const location = useLocation();
    const [notifications, setNotifications] =
        useState<Notification[]>(mockNotifications);
    const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

    // Handle filter from URL query param
    React.useEffect(() => {
        const params = new URLSearchParams(location.search);
        const filterParam = params.get('filter') as FilterTab;
        if (filterParam && filterTabs.some(tab => tab.key === filterParam)) {
            setActiveFilter(filterParam);
        }
    }, [location.search]);

    const unreadCount = notifications.filter((n) => !n.read).length;

    // ── Filtering ──────────────────────────────────────────────────
    const filtered = notifications.filter((n) => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'unread') return !n.read;
        return n.type === activeFilter;
    });

    // Group by date
    const grouped = filtered.reduce<Record<string, Notification[]>>(
        (acc, n) => {
            (acc[n.date] ??= []).push(n);
            return acc;
        },
        {}
    );

    // ── Actions ────────────────────────────────────────────────────
    const markAsRead = (id: number) =>
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );

    const dismiss = (id: number) =>
        setNotifications((prev) => prev.filter((n) => n.id !== id));

    const markAllRead = () =>
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    const clearAll = () => setNotifications([]);

    // ── Render ─────────────────────────────────────────────────────
    return (
        <div className="min-h-full bg-gray-50 dark:bg-slate-900">
            <NotificationsHeader />

            <div className="flex-1 flex flex-col gap-6 p-4 md:px-8 md:py-6">
                {/* Toolbar — filters + bulk actions */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 mb-6">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex-wrap gap-3">
                        {/* Filter tabs */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Filter
                                size={15}
                                className="text-gray-400 dark:text-slate-500 mr-1"
                            />
                            {filterTabs.map((tab) => {
                                const isActive = activeFilter === tab.key;
                                const count =
                                    tab.key === 'all'
                                        ? notifications.length
                                        : tab.key === 'unread'
                                            ? unreadCount
                                            : notifications.filter(
                                                (n) => n.type === tab.key
                                            ).length;
                                return (
                                    <button
                                        key={tab.key}
                                        onClick={() =>
                                            setActiveFilter(tab.key)
                                        }
                                        className={`px-3.5 py-1.5 rounded-lg text-sm font-medium cursor-pointer border transition-all ${isActive
                                            ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30'
                                            : 'bg-transparent text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-slate-700/50 dark:hover:text-gray-200'
                                            }`}
                                    >
                                        {tab.label}
                                        <span
                                            className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full font-bold ${isActive
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-100 text-gray-400 dark:bg-slate-700 dark:text-slate-400'
                                                }`}
                                        >
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Bulk actions */}
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllRead}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-500 bg-transparent border border-blue-200 rounded-lg cursor-pointer transition-all hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:border-blue-800/50 dark:hover:bg-blue-900/20 dark:hover:text-blue-300"
                                >
                                    <CheckCheck size={14} />
                                    Mark All Read
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    onClick={clearAll}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-400 bg-transparent border border-gray-200 rounded-lg cursor-pointer transition-all hover:bg-red-50 hover:text-red-500 hover:border-red-200 dark:text-gray-400 dark:border-slate-700 dark:hover:bg-red-900/20 dark:hover:text-red-400 dark:hover:border-red-800/50"
                                >
                                    <Trash2 size={14} />
                                    Clear All
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Summary bar */}
                    <div className="px-5 py-2.5 text-xs text-gray-400 bg-gray-50/60 dark:text-slate-500 dark:bg-slate-900/50">
                        {unreadCount > 0 ? (
                            <>
                                <span className="font-semibold text-blue-500 dark:text-blue-400">
                                    {unreadCount}
                                </span>{' '}
                                unread notification
                                {unreadCount !== 1 && 's'} ·{' '}
                                {notifications.length} total
                            </>
                        ) : (
                            <>{notifications.length} notification{notifications.length !== 1 && 's'}</>
                        )}
                    </div>
                </div>

                {/* Notification list */}
                {filtered.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col items-center justify-center py-20 px-6 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-700 grid place-items-center mb-4">
                            <Bell size={28} className="text-gray-300 dark:text-slate-500" />
                        </div>
                        <p className="text-base font-medium text-gray-500 dark:text-gray-400 m-0">
                            {activeFilter === 'all'
                                ? "You're all caught up!"
                                : `No ${activeFilter} notifications`}
                        </p>
                        <p className="text-sm text-gray-400 dark:text-slate-500 m-0 mt-1.5 max-w-[280px]">
                            {activeFilter === 'all'
                                ? 'All your notifications have been cleared. New ones will appear here.'
                                : 'Try switching to a different filter to see more notifications.'}
                        </p>
                        {activeFilter !== 'all' && (
                            <button
                                onClick={() => setActiveFilter('all')}
                                className="mt-4 px-4 py-2 text-sm font-medium text-blue-500 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer transition-all hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800/50 dark:hover:bg-blue-900/40"
                            >
                                View All Notifications
                            </button>
                        )}
                    </div>
                ) : (
                    Object.entries(grouped).map(([date, items]) => (
                        <div key={date} className="mb-6">
                            {/* Date group header */}
                            <div className="flex items-center gap-3 mb-3 px-1">
                                <span className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">
                                    {date}
                                </span>
                                <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
                            </div>

                            {/* Cards */}
                            <div className="flex flex-col gap-2.5">
                                {items.map((notif) => {
                                    const style = iconMap[notif.type];
                                    return (
                                        <div
                                            key={notif.id}
                                            onClick={() =>
                                                markAsRead(notif.id)
                                            }
                                            className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border cursor-pointer transition-all group relative overflow-hidden ${notif.read
                                                ? 'border-gray-100 hover:border-gray-200 dark:border-slate-700 dark:hover:border-slate-600'
                                                : 'border-blue-100 hover:border-blue-200 ring-1 ring-blue-50 dark:border-blue-800/50 dark:hover:border-blue-700/50 dark:ring-blue-900/20'
                                                }`}
                                        >
                                            {/* Unread indicator bar */}
                                            {!notif.read && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-xl" />
                                            )}

                                            <div className="flex items-start gap-4 p-5 max-md:p-4">
                                                {/* Icon */}
                                                <div
                                                    className={`w-10 h-10 rounded-xl ${style.bg} ${style.color} grid place-items-center shrink-0 ring-1 ${style.ring}`}
                                                >
                                                    {style.icon}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p
                                                            className={`text-sm m-0 truncate ${notif.read
                                                                ? 'font-medium text-gray-700 dark:text-gray-300'
                                                                : 'font-semibold text-gray-900 dark:text-white'
                                                                }`}
                                                        >
                                                            {notif.title}
                                                        </p>
                                                        {!notif.read && (
                                                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                                        )}
                                                        <span className="ml-auto text-[11px] text-gray-400 dark:text-slate-500 shrink-0 whitespace-nowrap">
                                                            {notif.time}
                                                        </span>
                                                    </div>
                                                    <p className="text-[13px] text-gray-500 dark:text-slate-400 m-0 leading-relaxed line-clamp-2">
                                                        {notif.message}
                                                    </p>

                                                    {/* Type tag */}
                                                    <div className="mt-2.5 flex items-center gap-2">
                                                        <span
                                                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wide ${style.bg} ${style.color}`}
                                                        >
                                                            {notif.type}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Dismiss button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        dismiss(notif.id);
                                                    }}
                                                    className="w-8 h-8 grid place-items-center rounded-lg text-gray-300 hover:bg-gray-100 hover:text-gray-500 dark:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300 bg-transparent border-none cursor-pointer opacity-0 group-hover:opacity-100 transition-all shrink-0 mt-0.5"
                                                    title="Dismiss"
                                                >
                                                    <X size={15} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;
