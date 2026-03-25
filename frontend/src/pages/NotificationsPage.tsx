import React, { useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import NotificationsTemplate from '../components/notifications/templates/NotificationsTemplate';
import type { Notification } from '../components/notifications/templates/NotificationsTemplate';
import { notificationsService } from '../services/notificationsService';

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

const getDateLabel = (value: string | null): string => {
    if (!value) return 'Unknown';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Unknown';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
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

/**
 * NotificationsPage Component.
 * 
 * This page serves as a centralized hub for all user notifications, including reviews,
 * system alerts, and analytics updates. It is built using an atomic design structure
 * for maximum maintainability and visual consistency.
 * 
 * @returns {React.FC} The redesigned Notifications Page.
 */
const NotificationsPage: React.FC = () => {
    const location = useLocation();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [activeFilter, setActiveFilter] = useState<string>('all');

    const loadNotifications = useCallback(async () => {
        try {
            const result = await notificationsService.getNotifications(100);
            setNotifications(
                (result.notifications || []).map((item) => ({
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

    /**
     * Synchronize filter state with URL query parameters.
     */
    React.useEffect(() => {
        const params = new URLSearchParams(location.search);
        const filterParam = params.get('filter');
        if (filterParam) {
            setActiveFilter(filterParam);
        }
    }, [location.search]);

    React.useEffect(() => {
        loadNotifications();
        const intervalId = window.setInterval(loadNotifications, 30000);
        return () => window.clearInterval(intervalId);
    }, [loadNotifications]);

    /**
     * Memoized calculation of notification counts for filtering tabs.
     */
    const counts = useMemo(() => ({
        all: notifications.length,
        unread: notifications.filter(n => !n.read).length,
        review: notifications.filter(n => n.type === 'review').length,
        alert: notifications.filter(n => n.type === 'alert').length,
        system: notifications.filter(n => n.type === 'system').length,
    }), [notifications]);

    /**
     * Memoized filtered notifications based on the currently active filter.
     */
    const filteredNotifications = useMemo(() => {
        if (activeFilter === 'all') return notifications;
        if (activeFilter === 'unread') return notifications.filter(n => !n.read);
        return notifications.filter(n => n.type === activeFilter);
    }, [notifications, activeFilter]);

    /**
     * Marks a specific notification as read.
     * @param {number} id - The unique identifier of the notification.
     */
    const handleMarkAsRead = useCallback(async (id: string) => {
        try {
            await notificationsService.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    }, []);

    /**
     * Removes a notification from the list.
     * @param {number} id - The unique identifier of the notification.
     */
    const handleDismiss = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    /**
     * Marks all currently filtered notifications as read.
     */
    const handleMarkAllRead = useCallback(async () => {
        try {
            await notificationsService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
        }
    }, []);

    /**
     * Clears all notifications from the system.
     */
    const handleClearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    const handleFilterChange = (filter: string) => {
        setActiveFilter(filter);
    };

    return (
        <NotificationsTemplate
            notifications={filteredNotifications}
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
            counts={counts}
            unreadCount={counts.unread}
            onMarkAsRead={handleMarkAsRead}
            onDismiss={handleDismiss}
            onMarkAllRead={handleMarkAllRead}
            onClearAll={handleClearAll}
        />
    );
};

export default NotificationsPage;
