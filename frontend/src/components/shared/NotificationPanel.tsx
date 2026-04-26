import React, { useState } from "react";
import { useEffect } from "react";
import {
  X,
  Star,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Bell,
  ChevronRight,
} from "lucide-react";
import { notificationsService } from "../../services/notificationsService";

export interface Notification {
  id: string;
  type: "review" | "alert" | "success" | "system";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const mapNotificationType = (type: string): Notification["type"] => {
  switch (type) {
    case "success":
      return "success";
    case "warning":
    case "error":
      return "alert";
    case "maintenance":
    case "announcement":
      return "review";
    case "info":
    default:
      return "system";
  }
};

const formatNotificationTime = (value: string | null): string => {
  if (!value) return "Unknown time";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown time";
  return parsed.toLocaleString();
};

const iconMap: Record<
  Notification["type"],
  { icon: React.ReactNode; bg: string; color: string }
> = {
  review: {
    icon: <Star size={16} />,
    bg: "bg-amber-50",
    color: "text-amber-500",
  },
  alert: {
    icon: <AlertTriangle size={16} />,
    bg: "bg-red-50",
    color: "text-red-500",
  },
  success: {
    icon: <CheckCircle2 size={16} />,
    bg: "bg-emerald-50",
    color: "text-emerald-500",
  },
  system: {
    icon: <RefreshCw size={16} />,
    bg: "bg-blue-50",
    color: "text-blue-500",
  },
};

interface NotificationPanelProps {
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  onClose,
  onUnreadCountChange,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const updateNotifications = (next: Notification[]) => {
    setNotifications(next);
    onUnreadCountChange?.(next.filter((n) => !n.read).length);
  };

  const refreshNotifications = async () => {
    try {
      const [listResult, unreadResult] = await Promise.all([
        notificationsService.getNotifications(20),
        notificationsService.getUnreadCount(),
      ]);

      const mapped = (listResult.notifications || []).map((item) => ({
        id: item.notification_id,
        type: mapNotificationType(item.notification_type),
        title: item.title || "Notification",
        message: item.message || "",
        time: formatNotificationTime(item.created_at),
        read: !!item.is_read,
      }));

      setNotifications(mapped);
      onUnreadCountChange?.(unreadResult.count || 0);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  };

  useEffect(() => {
    refreshNotifications();
    const intervalId = window.setInterval(refreshNotifications, 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await notificationsService.markAsRead(id);
      updateNotifications(
        notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const dismiss = (id: string) => {
    updateNotifications(notifications.filter((n) => n.id !== id));
  };

  const markAllRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      updateNotifications(notifications.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const clearAll = () => {
    updateNotifications([]);
  };

  return (
    <div
      className="absolute right-0 top-[calc(100%+8px)] w-[400px] max-h-[520px] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden"
      style={{ animation: "fadeIn 0.15s ease-out" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-gray-700" />
          <h3 className="text-base font-semibold text-gray-900 m-0">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="ml-1 bg-blue-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full leading-none">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              className="text-xs text-blue-500 font-medium bg-transparent border-none cursor-pointer hover:text-blue-700 transition-colors px-2 py-1 rounded hover:bg-blue-50"
              onClick={markAllRead}
            >
              Mark all read
            </button>
          )}
          <button
            className="w-7 h-7 grid place-items-center rounded-md text-gray-400 bg-transparent border-none cursor-pointer hover:bg-gray-100 hover:text-gray-600 transition"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 grid place-items-center mb-3">
              <Bell size={22} className="text-gray-300" />
            </div>
            <p className="text-sm text-gray-400 m-0">You're all caught up!</p>
            <p className="text-xs text-gray-300 m-0 mt-1">
              No new notifications
            </p>
          </div>
        ) : (
          notifications.map((notif) => {
            const style = iconMap[notif.type];
            return (
              <div
                key={notif.id}
                className={`flex items-start gap-3 px-5 py-3.5 border-b border-gray-50 cursor-pointer transition-colors group ${
                  notif.read ? "bg-white" : "bg-blue-50/40"
                } hover:bg-gray-50`}
                onClick={() => markAsRead(notif.id)}
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
                    <p className="text-sm font-medium text-gray-900 m-0 truncate">
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 m-0 mt-0.5 line-clamp-2 leading-relaxed">
                    {notif.message}
                  </p>
                  <p className="text-[11px] text-gray-400 m-0 mt-1">
                    {notif.time}
                  </p>
                </div>

                {/* Dismiss */}
                <button
                  className="w-6 h-6 grid place-items-center rounded text-gray-300 bg-transparent border-none cursor-pointer opacity-0 group-hover:opacity-100 hover:bg-gray-200 hover:text-gray-500 transition-all shrink-0 mt-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismiss(notif.id);
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <button
            className="text-xs text-gray-400 font-medium bg-transparent border-none cursor-pointer hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50"
            onClick={clearAll}
          >
            Clear All
          </button>
          <button className="flex items-center gap-1 text-xs text-blue-500 font-medium bg-transparent border-none cursor-pointer hover:text-blue-700 transition-colors px-2 py-1 rounded hover:bg-blue-50">
            View All Notifications
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
