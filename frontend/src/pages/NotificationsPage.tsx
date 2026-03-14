import React, { useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import NotificationsTemplate from '../components/notifications/templates/NotificationsTemplate';
import type { Notification } from '../components/notifications/templates/NotificationsTemplate';

/**
 * Mock data for the notification system.
 * In a real application, this would be fetched from an API.
 */
const MOCK_NOTIFICATIONS: Notification[] = [
    {
        id: 1,
        type: 'review',
        title: 'New 5-Star Review',
        message: 'A guest left a glowing review on TripAdvisor praising your staff service and room cleanliness.',
        time: '2 min ago',
        date: 'Today',
        read: false,
    },
    {
        id: 2,
        type: 'alert',
        title: 'Negative Review Detected',
        message: 'A 1-star review on Booking.com mentions cleanliness issues in Room 402. High priority.',
        time: '18 min ago',
        date: 'Today',
        read: false,
    },
    {
        id: 3,
        type: 'success',
        title: 'Source Sync Complete',
        message: 'Google Reviews synced successfully — 12 new reviews imported into your analytics engine.',
        time: '1 hour ago',
        date: 'Today',
        read: false,
    },
    {
        id: 4,
        type: 'system',
        title: 'Weekly Report Ready',
        message: 'Your performance summary for Feb 10 – 16 is available for download.',
        time: '3 hours ago',
        date: 'Today',
        read: true,
    },
    {
        id: 5,
        type: 'review',
        title: 'Review Response Needed',
        message: 'A guest on Airbnb asked a follow-up question on their review about check-in procedures.',
        time: '5 hours ago',
        date: 'Today',
        read: true,
    },
    {
        id: 6,
        type: 'alert',
        title: 'Rating Drop Alert',
        message: 'Your average rating on Google has dropped below 4.0 for the first time in 30 days.',
        time: 'Yesterday',
        date: 'Yesterday',
        read: true,
    },
    {
        id: 7,
        type: 'success',
        title: 'Auto-Reply Sent',
        message: 'AI-generated response was sent to 3 positive reviews on TripAdvisor.',
        time: 'Yesterday',
        date: 'Yesterday',
        read: true,
    },
    {
        id: 8,
        type: 'system',
        title: 'Scheduled Scrape Completed',
        message: 'Daily review scrape finished at 6:00 AM. 8 new reviews collected.',
        time: '2 days ago',
        date: 'Feb 18',
        read: true,
    },
];

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
    const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
    const [activeFilter, setActiveFilter] = useState<string>('all');

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
    const handleMarkAsRead = useCallback((id: number) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }, []);

    /**
     * Removes a notification from the list.
     * @param {number} id - The unique identifier of the notification.
     */
    const handleDismiss = useCallback((id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    /**
     * Marks all currently filtered notifications as read.
     */
    const handleMarkAllRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
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
