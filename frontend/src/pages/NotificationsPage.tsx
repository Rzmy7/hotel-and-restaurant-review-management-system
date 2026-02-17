import React, { useState } from 'react';
import { Menu, Clock } from 'lucide-react';
import './NotificationsPage.css';

interface NotificationsPageProps {
    toggleSidebar: () => void;
}

interface Notification {
    id: number;
    title: string;
    description: string;
    time: string;
    read: boolean;
}

const initialNotifications: Notification[] = [
    {
        id: 1,
        title: 'New 5-star review received',
        description: 'John Smith left a positive review on Booking.com',
        time: '5 minutes ago',
        read: false,
    },
    {
        id: 2,
        title: 'Negative sentiment detected',
        description: 'A 2-star review mentions "noisy" and "WiFi issues"',
        time: '1 hour ago',
        read: false,
    },
    {
        id: 3,
        title: 'Review sync completed',
        description: 'Successfully synced 23 new reviews from all sources',
        time: '2 hours ago',
        read: false,
    },
    {
        id: 4,
        title: 'Weekly insights ready',
        description: 'Your weekly performance report is now available',
        time: '1 day ago',
        read: true,
    },
    {
        id: 5,
        title: 'New review requires response',
        description: 'Guest mentioned staff by name - consider responding',
        time: '2 days ago',
        read: true,
    },
];

const NotificationsPage: React.FC<NotificationsPageProps> = ({ toggleSidebar }) => {
    const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

    const unreadCount = notifications.filter((n) => !n.read).length;

    const markAllAsRead = () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    const toggleRead = (id: number) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
        );
    };

    return (
        <div className="notifications-page">
            {/* Header */}
            <div className="notifications-header">
                <button className="menu-btn" onClick={toggleSidebar}>
                    <Menu size={24} />
                </button>
                <div className="header-content">
                    <h1 className="notifications-title">Notifications</h1>
                    <p className="notifications-subtitle">Stay updated with your review activity</p>
                </div>
                {unreadCount > 0 && (
                    <button className="mark-all-read-btn" onClick={markAllAsRead}>
                        Mark all as read
                    </button>
                )}
            </div>

            {/* Notifications List */}
            <div className="notifications-content">
                <div className="notifications-list">
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`notification-card ${!notification.read ? 'unread' : ''}`}
                            onClick={() => toggleRead(notification.id)}
                        >
                            <div className="notification-body">
                                <h3 className="notification-card-title">{notification.title}</h3>
                                <p className="notification-description">{notification.description}</p>
                                <div className="notification-time">
                                    <Clock size={14} />
                                    <span>{notification.time}</span>
                                </div>
                            </div>
                            {!notification.read && <div className="unread-dot" />}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default NotificationsPage;
