import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Bell, AlertCircle, Moon, Sun } from "lucide-react";
import {
  emitMaintenanceModeUpdated,
  maintenanceService,
  onMaintenanceModeUpdated,
} from "../services/maintenanceService";
import { notificationsService } from "../services/notificationsService";
import type { AdminNotification } from "../services/notificationsService";
import { useSystemTimezone } from "../hooks/useSystemTimezone";
import { formatDateTime } from "../utils/dateTime";
import { useTheme } from "../contexts/ThemeContext";

export const Header: React.FC = () => {
  const location = useLocation();
  const { setTheme, resolvedTheme } = useTheme();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationsPanelRef = useRef<HTMLDivElement | null>(null);
  const systemTimezone = useSystemTimezone();

  // Load maintenance status on mount
  useEffect(() => {
    const loadMaintenanceStatus = async () => {
      try {
        const result = await maintenanceService.getStatus();
        setMaintenanceMode(!!result.maintenanceMode);
      } catch (err) {
        console.error("Failed to load maintenance status:", err);
      }
    };
    loadMaintenanceStatus();

    const unsubscribe = onMaintenanceModeUpdated((nextMode) => {
      setMaintenanceMode(nextMode);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const refreshUnreadCount = async () => {
      try {
        const result = await notificationsService.getAdminUnreadCount();
        setUnreadCount(result.count || 0);
      } catch (err) {
        console.error("Failed to load unread notifications count:", err);
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

    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [isNotificationsOpen]);

  const formatNotificationTime = (value: string | null): string => {
    return formatDateTime(value, systemTimezone);
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
      console.error("Failed to load notifications:", err);
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
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, is_read: true })),
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  const handleMarkSingleRead = async (
    notificationId: string,
    alreadyRead: boolean,
  ) => {
    if (alreadyRead) {
      return;
    }

    try {
      await notificationsService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((item) =>
          item.notification_id === notificationId
            ? { ...item, is_read: true }
            : item,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMaintenanceToggle = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await maintenanceService.setStatus(!maintenanceMode);
      if (response.success) {
        setMaintenanceMode(response.maintenanceMode);
        emitMaintenanceModeUpdated(response.maintenanceMode);
      } else {
        setError("Failed to toggle maintenance mode");
      }
    } catch (err) {
      setError("Error toggling maintenance mode");
      console.error("Maintenance toggle error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemeToggle = () => {
    // Simple toggle: if currently dark, go light; if light, go dark
    // System preference is only settable from Settings page
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const getHeaderContent = () => {
    switch (location.pathname) {
      case "/":
        return {
          title: "Admin Dashboard",
          subtitle: "Monitor and manage your platform",
        };
      case "/organizations":
        return {
          title: "Organizations",
          subtitle: "Manage organizations and their settings",
        };
      case "/users":
        return {
          title: "Users",
          subtitle: "Manage user accounts and permissions",
        };
      case "/feature-flags":
        return {
          title: "Feature Flags",
          subtitle: "Enable or disable features across the platform",
        };
      case "/settings":
        return {
          title: "Admin Settings",
          subtitle: "Configure platform settings",
        };
      case "/embeddings":
        return {
          title: "AI Configuration & Embeddings",
          subtitle:
            "Manage embedding models, thresholds, and vector database connections.",
        };
      case "/scraping":
        return { title: "Scraping Management", subtitle: "" };

      case "/monitoring":
        return {
          title: "System Monitoring",
          subtitle: "Real-time server status and performance metrics",
        };
      case "/subscription-plans":
        return {
          title: "Subscription Plans",
          subtitle:
            "Manage pricing tiers, features, and availability for your customers",
        };
      case "/broadcasting":
        return {
          title: "Message Broadcasting",
          subtitle:
            "Send announcements, alerts, and notifications to your user base",
        };
      case "/reply-generation":
        return {
          title: "Reply Generation",
          subtitle:
            "Configure AI provider, API keys, and embedding context settings",
        };
      default:
        return { title: "Admin Panel", subtitle: "Welcome back" };
    }
  };

  const { title, subtitle } = getHeaderContent();

  return (
    <header className="fixed top-0 left-64 right-0 h-20 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-8 z-10 transition-colors duration-200">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-slate-400 hidden">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Maintenance Mode Button */}
        <button
          onClick={handleMaintenanceToggle}
          disabled={isLoading}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            maintenanceMode
              ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 disabled:opacity-50 dark:bg-yellow-900/30 dark:text-yellow-300 dark:hover:bg-yellow-900/50"
              : "bg-gray-100 text-gray-700 dark:text-slate-200 hover:bg-gray-200 disabled:opacity-50 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
          }`}
          title={
            maintenanceMode
              ? "Click to disable maintenance mode"
              : "Click to enable maintenance mode"
          }
        >
          <AlertCircle size={16} />
          <span>{maintenanceMode ? "Maintenance ON" : "Maintenance OFF"}</span>
          {isLoading && <span className="animate-spin">⏳</span>}
        </button>

        {/* Error indicator */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded px-2 py-1 text-xs text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Dark Mode Toggle Button */}
        <button
          onClick={handleThemeToggle}
          className="relative w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-all duration-300 text-gray-600 dark:text-slate-300"
          title={
            resolvedTheme === "dark"
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
          aria-label="Toggle dark mode"
        >
          <Sun
            size={18}
            className={`absolute transition-all duration-300 ${
              resolvedTheme === "dark"
                ? "opacity-0 rotate-90 scale-0"
                : "opacity-100 rotate-0 scale-100"
            }`}
          />
          <Moon
            size={18}
            className={`absolute transition-all duration-300 ${
              resolvedTheme === "dark"
                ? "opacity-100 rotate-0 scale-100"
                : "opacity-0 -rotate-90 scale-0"
            }`}
          />
        </button>

        {/* Bell notification */}
        <div className="relative" ref={notificationsPanelRef}>
          <button
            onClick={handleBellClick}
            className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-600 dark:text-slate-300"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-20">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Notifications
                </h3>
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                >
                  Mark all read
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {isNotificationsLoading ? (
                  <div className="px-4 py-6 text-sm text-gray-500 dark:text-slate-400">
                    Loading notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-gray-500 dark:text-slate-400">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.notification_id}
                      onClick={() =>
                        handleMarkSingleRead(
                          notification.notification_id,
                          notification.is_read,
                        )
                      }
                      className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-slate-700 last:border-b-0 transition-colors ${
                        notification.is_read
                          ? "bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                          : "bg-indigo-50/40 hover:bg-indigo-50/60 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-slate-400 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <span className="mt-1 w-2 h-2 rounded-full bg-indigo-500" />
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-2">
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
