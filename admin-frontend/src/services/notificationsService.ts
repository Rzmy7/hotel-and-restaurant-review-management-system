const DEFAULT_MAIN_BACKEND_URL = import.meta.env.VITE_MAIN_BACKEND_URL || 'http://localhost:8000';

const getBaseUrl = (): string => {
    const stored = localStorage.getItem('mainBackendUrl');
    return (stored || DEFAULT_MAIN_BACKEND_URL).replace(/\/$/, '');
};

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(`${getBaseUrl()}${path}`, {
        headers: {
            'Content-Type': 'application/json',
        },
        ...init,
    });

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
};

export interface AdminNotification {
    notification_id: string;
    user_id: string;
    title: string;
    message: string;
    notification_type: 'info' | 'success' | 'warning' | 'error' | 'maintenance' | 'announcement';
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
        params.append('limit', String(limit));
        return requestJson<AdminNotificationsResponse>(`/api/notifications/admin?${params.toString()}`, {
            method: 'GET',
        });
    },

    async getAdminUnreadCount(): Promise<UnreadCountResponse> {
        return requestJson<UnreadCountResponse>('/api/notifications/admin/unread-count', {
            method: 'GET',
        });
    },

    async markAsRead(notificationId: string): Promise<{ success: boolean; message: string }> {
        return requestJson<{ success: boolean; message: string }>(`/api/notifications/${encodeURIComponent(notificationId)}/read`, {
            method: 'POST',
        });
    },

    async markAllAsRead(): Promise<{ success: boolean; updated: number; message: string }> {
        return requestJson<{ success: boolean; updated: number; message: string }>('/api/notifications/admin/read-all', {
            method: 'POST',
        });
    },
};
