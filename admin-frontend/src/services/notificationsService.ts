import { apiClient } from "../api/client";

export interface AdminNotification {
  notification_id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type:
    | "info"
    | "success"
    | "warning"
    | "error"
    | "maintenance"
    | "announcement";
  is_read: boolean;
  created_at: string | null;
  read_at: string | null;
}

interface AdminNotificationsResponse {
  userId: string;
  notifications: AdminNotification[];
}

interface UnreadCountResponse {
  userId: string;
  count: number;
}

export const notificationsService = {
  async getAdminNotifications(limit = 20): Promise<AdminNotificationsResponse> {
    const params = new URLSearchParams();
    params.append("limit", String(limit));
    // Path is now /api/admin/notifications/ (trailing slash or empty for @router.get("/"))
    return apiClient.get<AdminNotificationsResponse>(
      `/admin/notifications/?${params.toString()}`,
    );
  },

  async getAdminUnreadCount(): Promise<UnreadCountResponse> {
    return apiClient.get<UnreadCountResponse>(
      "/admin/notifications/unread-count",
    );
  },

  async markAsRead(
    notificationId: string,
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>(
      `/admin/notifications/${encodeURIComponent(notificationId)}/read`,
      {},
    );
  },

  async markAllAsRead(): Promise<{
    success: boolean;
    updated: number;
    message: string;
  }> {
    return apiClient.post<{
      success: boolean;
      updated: number;
      message: string;
    }>("/admin/notifications/read-all", {});
  },
};
