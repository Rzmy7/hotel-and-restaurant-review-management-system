import React, { useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import NotificationsTemplate from '../components/notifications/templates/NotificationsTemplate';
import type { Notification } from '../components/notifications/templates/NotificationsTemplate';
import { notificationsService, type BackendNotification } from '../services/notificationsService';
import { respondToInvitation } from '../services/groupService';
import { Check, X, Users } from 'lucide-react';

const mapNotificationType = (type: string): Notification['type'] => {
    switch (type) {
        case 'success':      return 'success';
        case 'warning':
        case 'error':        return 'alert';
        case 'maintenance':
        case 'announcement': return 'announcement';
        case 'group_invite': return 'system';
        case 'info':
        default:             return 'system';
    }
};

const getDateLabel = (value: string | null): string => {
    if (!value) return 'Unknown';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Unknown';
    const now = new Date();
    const today  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    const diffDays = Math.floor((today.getTime() - target.getTime()) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return parsed.toLocaleDateString();
};

const getTimeLabel = (value: string | null): string => {
    if (!value) return 'Unknown time';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Unknown time';
    return parsed.toLocaleString();
};

// ── Group Invite Card ───────────────────────────────────────────────────────
interface InviteCardProps {
    notification: BackendNotification;
    onResponded: () => void;
}

const GroupInviteCard: React.FC<InviteCardProps> = ({ notification, onResponded }) => {
    const [responding, setResponding] = useState<'accept' | 'reject' | null>(null);
    const [done, setDone] = useState<'accepted' | 'rejected' | null>(null);

    let meta: { invitation_id?: string; group_id?: string; group_name?: string; role?: string } = {};
    try {
        if (notification.extra_data) meta = JSON.parse(notification.extra_data);
    } catch { /* ignore */ }

    const handleRespond = async (action: 'accept' | 'reject') => {
        if (!meta.group_id || !meta.invitation_id) return;
        setResponding(action);
        try {
            await respondToInvitation(meta.group_id, meta.invitation_id, action);
            setDone(action === 'accept' ? 'accepted' : 'rejected');
            onResponded();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to respond');
        } finally {
            setResponding(null);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-800/40 rounded-xl p-4 shadow-sm mb-3">
            <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <Users size={18} className="text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{notification.title}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{notification.message}</p>
                    {done ? (
                        <p className={`mt-2 text-xs font-semibold ${done === 'accepted' ? 'text-green-600' : 'text-gray-500'}`}>
                            {done === 'accepted' ? '✓ Joined the group!' : 'Invitation declined'}
                        </p>
                    ) : (
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={() => handleRespond('accept')}
                                disabled={!!responding}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4e80ee] text-white text-xs font-semibold rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                            >
                                <Check size={13} />
                                {responding === 'accept' ? 'Joining…' : 'Accept'}
                            </button>
                            <button
                                onClick={() => handleRespond('reject')}
                                disabled={!!responding}
                                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 text-xs font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                            >
                                <X size={13} />
                                {responding === 'reject' ? 'Declining…' : 'Decline'}
                            </button>
                        </div>
                    )}
                </div>
                <p className="text-[10px] text-gray-400 dark:text-slate-500 flex-shrink-0">{getDateLabel(notification.created_at)}</p>
            </div>
        </div>
    );
};

// ── Main Page ───────────────────────────────────────────────────────────────
const NotificationsPage: React.FC = () => {
    const location = useLocation();
    const [rawNotifications, setRawNotifications] = useState<BackendNotification[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [activePrimaryFilter, setActivePrimaryFilter] = useState<'all' | 'unread'>('all');
    const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all-types' | 'announcement' | 'alert' | 'system'>('all-types');

    const loadNotifications = useCallback(async () => {
        try {
            const result = await notificationsService.getNotifications(100);
            const items = result.notifications || [];
            setRawNotifications(items);
            setNotifications(
                items.map((item) => ({
                    id: item.notification_id,
                    type: mapNotificationType(item.notification_type),
                    title: item.title || 'Notification',
                    message: item.message || '',
                    time: getTimeLabel(item.created_at),
                    date: getDateLabel(item.created_at),
                    read: !!item.is_read,
                }))
            );
        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    }, []);

    React.useEffect(() => {
        const params = new URLSearchParams(location.search);
        const filterParam = params.get('filter');
        if (!filterParam) return;
        if (filterParam === 'all' || filterParam === 'unread') setActivePrimaryFilter(filterParam);
        if (filterParam === 'announcement' || filterParam === 'alert' || filterParam === 'system') setActiveCategoryFilter(filterParam);
    }, [location.search]);

    React.useEffect(() => {
        loadNotifications();
        const intervalId = window.setInterval(loadNotifications, 30000);
        return () => window.clearInterval(intervalId);
    }, [loadNotifications]);

    // Split: group invites vs regular
    const inviteNotifications = useMemo(
        () => rawNotifications.filter(n => n.notification_type === 'group_invite' && !n.is_read),
        [rawNotifications]
    );
    const regularNotifications = useMemo(
        () => notifications.filter(n => {
            // Find the raw record to check if it's a group_invite
            const raw = rawNotifications.find(r => r.notification_id === n.id);
            return raw?.notification_type !== 'group_invite';
        }),
        [notifications, rawNotifications]
    );

    const counts = useMemo(() => ({
        all:          regularNotifications.length,
        unread:       regularNotifications.filter(n => !n.read).length,
        announcement: regularNotifications.filter(n => n.type === 'announcement').length,
        alert:        regularNotifications.filter(n => n.type === 'alert').length,
        system:       regularNotifications.filter(n => n.type === 'system').length,
    }), [regularNotifications]);

    const filteredNotifications = useMemo(() => {
        let scoped = regularNotifications;
        if (activePrimaryFilter === 'unread')          scoped = scoped.filter(n => !n.read);
        if (activeCategoryFilter !== 'all-types')      scoped = scoped.filter(n => n.type === activeCategoryFilter);
        return scoped;
    }, [regularNotifications, activePrimaryFilter, activeCategoryFilter]);

    const isFiltered = activePrimaryFilter !== 'all' || activeCategoryFilter !== 'all-types';

    const activeFilterLabel = useMemo(() => {
        if (!isFiltered) return 'all';
        const primary  = activePrimaryFilter === 'all' ? 'all' : 'unread';
        const category = activeCategoryFilter === 'all-types' ? 'all types'
            : activeCategoryFilter === 'announcement' ? 'announcements' : activeCategoryFilter;
        if (activePrimaryFilter === 'all')   return category;
        if (activeCategoryFilter === 'all-types') return primary;
        return `${primary} ${category}`;
    }, [activePrimaryFilter, activeCategoryFilter, isFiltered]);

    const handleMarkAsRead = useCallback(async (id: string) => {
        try {
            await notificationsService.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (err) { console.error(err); }
    }, []);

    const handleDismiss = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const handleMarkAllRead = useCallback(async () => {
        try {
            await notificationsService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (err) { console.error(err); }
    }, []);

    const handleClearAll = useCallback(async () => {
        try {
            await notificationsService.deleteAllReadNotifications();
            setNotifications(prev => prev.filter(n => !n.read));
        } catch (err) { console.error(err); }
    }, []);

    return (
        <div>
            {/* Group invite cards shown above the main list */}
            {inviteNotifications.length > 0 && (
                <div className="px-8 pt-6 max-w-[900px] mx-auto">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-blue-500 dark:text-blue-400 mb-3">
                        Group Invitations ({inviteNotifications.length})
                    </p>
                    {inviteNotifications.map(n => (
                        <GroupInviteCard key={n.notification_id} notification={n} onResponded={loadNotifications} />
                    ))}
                </div>
            )}

            <NotificationsTemplate
                notifications={filteredNotifications}
                activePrimaryFilter={activePrimaryFilter}
                activeCategoryFilter={activeCategoryFilter}
                onPrimaryFilterChange={setActivePrimaryFilter}
                onCategoryFilterChange={setActiveCategoryFilter}
                isFiltered={isFiltered}
                activeFilterLabel={activeFilterLabel}
                counts={counts}
                unreadCount={counts.unread}
                onMarkAsRead={handleMarkAsRead}
                onDismiss={handleDismiss}
                onMarkAllRead={handleMarkAllRead}
                onClearAll={handleClearAll}
            />
        </div>
    );
};

export default NotificationsPage;
