import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, AlertCircle } from 'lucide-react';
import { fetchSettings } from '../services/mockService';
import { toggleMaintenanceMode } from '../services/mockService';
import { notificationsService } from '../services/notificationsService';
import type { AdminNotification } from '../services/notificationsService';

export const Header: React.FC = () => {
    const location = useLocation();
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const notificationsPanelRef = useRef<HTMLDivElement | null>(null);

    // Load maintenance status on mount
    useEffect(() => {
        const loadMaintenanceStatus = async () => {
            try {
                const settings = await fetchSettings();
                setMaintenanceMode(settings.maintenanceMode);
            } catch (err) {
                console.error('Failed to load maintenance status:', err);
            }
        };
        loadMaintenanceStatus();
    }, []);

    useEffect(() => {
        const refreshUnreadCount = async () => {
            try {
                const result = await notificationsService.getAdminUnreadCount();
                setUnreadCount(result.count || 0);
            } catch (err) {
                console.error('Failed to load unread notifications count:', err);
            }
        };

        refreshUnreadCount();
    }, []);

    useEffect(() => {
        if (!isNotificationsOpen) {
            return;
        }

        const onMouseDown = (event: MouseEvent) => {
            if (
                notificationsPanelRef.current &&
                event.target instanceof Node &&
                !notificationsPanelRef.current.contains(event.target)
            ) {
                setIsNotificationsOpen(false);
            }
        };

        document.addEventListener('mousedown', onMouseDown);
        return () => {
            document.removeEventListener('mousedown', onMouseDown);
        };
    }, [isNotificationsOpen]);

    const formatNotificationTime = (value: string | null): string => {
        if (!value) {
            return 'Unknown time';
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return value;
        }

        return parsed.toLocaleString();
    };

    const refreshNotifications = async () => {
        setIsNotificationsLoading(true);
        try {
            const [listResult, unreadResult] = await Promise.all([
                notificationsService.getAdminNotifications(20),
                notificationsService.getAdminUnreadCount(),
            ]);
            setNotifications(listResult.notifications || []);
            setUnreadCount(unreadResult.count || 0);
        } catch (err) {
            console.error('Failed to load notifications:', err);
        } finally {
            setIsNotificationsLoading(false);
        }
    };

    const handleBellClick = async () => {
        const nextOpen = !isNotificationsOpen;
        setIsNotificationsOpen(nextOpen);
        if (nextOpen) {
            await refreshNotifications();
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationsService.markAllAsRead();
            setNotifications(prev => prev.map(item => ({ ...item, is_read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to mark all notifications as read:', err);
        }
    };

    const handleMarkSingleRead = async (notificationId: string, alreadyRead: boolean) => {
        if (alreadyRead) {
            return;
        }

        try {
            await notificationsService.markAsRead(notificationId);
            setNotifications(prev =>
                prev.map(item =>
                    item.notification_id === notificationId
                        ? { ...item, is_read: true }
                        : item
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
        }
    };

    const handleMaintenanceToggle = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await toggleMaintenanceMode(!maintenanceMode);
            if (response.success) {
                setMaintenanceMode(response.maintenanceMode);
            } else {
                setError('Failed to toggle maintenance mode');
            }
        } catch (err) {
            setError('Error toggling maintenance mode');
            console.error('Maintenance toggle error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const getHeaderContent = () => {
        switch (location.pathname) {
            case '/':
                return { title: 'Admin Dashboard', subtitle: 'Monitor and manage your platform' };
            case '/organizations':
                return { title: 'Organizations', subtitle: 'Manage organizations and their settings' };
            case '/users':
                return { title: 'Users', subtitle: 'Manage user accounts and permissions' };
            case '/feature-flags':
                return { title: 'Feature Flags', subtitle: 'Enable or disable features across the platform' };
            case '/settings':
                return { title: 'Admin Settings', subtitle: 'Configure platform settings' };
            case '/embeddings':
                return { title: 'AI Configuration & Embeddings', subtitle: 'Manage embedding models, thresholds, and vector database connections.' };
            case '/scraping':
                return { title: 'Scraping Management', subtitle: '' };
            case '/api-manage':
                return { title: 'API Management', subtitle: 'Manage API credentials and service endpoints' };
            case '/monitoring':
                return { title: 'System Monitoring', subtitle: 'Real-time server status and performance metrics' };
            case '/subscription-plans':
                return { title: 'Subscription Plans', subtitle: 'Manage pricing tiers, features, and availability for your customers' };
            case '/broadcasting':
                return { title: 'Message Broadcasting', subtitle: 'Send announcements, alerts, and notifications to your user base' };
            default:
                return { title: 'Admin Panel', subtitle: 'Welcome back' };
        }
    };

    const { title, subtitle } = getHeaderContent();

    return (
        <header className="fixed top-0 left-64 right-0 h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 z-10">
            <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
                {subtitle && <p className="text-sm text-gray-500 hidden">{subtitle}</p>}
            </div>

            <div className="flex items-center gap-4">
                {/* Maintenance Mode Button */}
                <button
                    onClick={handleMaintenanceToggle}
                    disabled={isLoading}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        maintenanceMode
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 disabled:opacity-50'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50'
                    }`}
                    title={maintenanceMode ? 'Click to disable maintenance mode' : 'Click to enable maintenance mode'}
                >
                    <AlertCircle size={16} />
                    <span>{maintenanceMode ? 'Maintenance ON' : 'Maintenance OFF'}</span>
                    {isLoading && <span className="animate-spin">⏳</span>}
                </button>

                {/* Error indicator */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded px-2 py-1 text-xs text-red-700">
                        {error}
                    </div>
                )}

                {/* Bell notification */}
                <div className="relative" ref={notificationsPanelRef}>
                    <button
                        onClick={handleBellClick}
                        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {isNotificationsOpen && (
                        <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                                <button
                                    onClick={handleMarkAllRead}
                                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                                >
                                    Mark all read
                                </button>
                            </div>

                            <div className="max-h-96 overflow-y-auto">
                                {isNotificationsLoading ? (
                                    <div className="px-4 py-6 text-sm text-gray-500">Loading notifications...</div>
                                ) : notifications.length === 0 ? (
                                    <div className="px-4 py-6 text-sm text-gray-500">No notifications yet.</div>
                                ) : (
                                    notifications.map(notification => (
                                        <button
                                            key={notification.notification_id}
                                            onClick={() => handleMarkSingleRead(notification.notification_id, notification.is_read)}
                                            className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 transition-colors ${
                                                notification.is_read ? 'bg-white hover:bg-gray-50' : 'bg-indigo-50/40 hover:bg-indigo-50/60'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                                                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                                                </div>
                                                {!notification.is_read && (
                                                    <span className="mt-1 w-2 h-2 rounded-full bg-indigo-500" />
                                                )}
                                            </div>
                                            <p className="text-[11px] text-gray-400 mt-2">
                                                {formatNotificationTime(notification.created_at)}
                                            </p>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};
