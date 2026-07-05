import { isAdminRole } from '../utils/authRole';
import { getApiBaseUrl } from '../config/api';

const getBaseUrl = (): string => getApiBaseUrl();

type CurrentUser = {
    userId: string | null;
    email: string | null;
    role: string | null;
};

const getCurrentUser = (): CurrentUser => {
    const raw = localStorage.getItem('authUser');
    if (!raw) {
        return {
            userId: null,
            email: null,
            role: null,
        };
    }

    try {
        const parsed = JSON.parse(raw) as {
            user_id?: string;
            id?: string;
            email?: string;
            role?: string;
            roles?: string[] | string;
        };

        return {
            userId: parsed.user_id || parsed.id || null,
            email: parsed.email || null,
            role: parsed.role ||
                (Array.isArray(parsed.roles) ? parsed.roles[0] : parsed.roles) ||
                null,
        };
    } catch {
        return {
            userId: null,
            email: null,
            role: null,
        };
    }
};

class ApiRequestError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const headers = new Headers(init?.headers);
    headers.set('Content-Type', 'application/json');

    const response = await fetch(`${getBaseUrl()}${path}`, {
        ...init,
        headers,
        credentials: 'include'
    });

    if (!response.ok) {
        throw new ApiRequestError(response.status, `Request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
};

const requestJsonWithFallback = async <T>(paths: string[], init?: RequestInit): Promise<T> => {
    let lastError: unknown;

    for (const path of paths) {
        try {
            return await requestJson<T>(path, init);
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError;
};

export interface BackendNotification {
    notification_id: string;
    user_id: string;
    title: string;
    message: string;
    notification_type: 'info' | 'success' | 'warning' | 'error' | 'maintenance' | 'announcement';
    is_read: boolean;
    created_at: string | null;
    read_at: string | null;
}

interface NotificationsResponse {
    userId: string;
    notifications: BackendNotification[];
}

interface UnreadCountResponse {
    userId: string;
    count: number;
}

const buildQuery = (extraParams?: Record<string, string>): string => {
    const currentUser = getCurrentUser();
    const params = new URLSearchParams();

    if (currentUser.userId) {
        params.set('userId', currentUser.userId);
    } else if (currentUser.email) {
        params.set('email', currentUser.email);
    }

    Object.entries(extraParams || {}).forEach(([key, value]) => {
        params.set(key, value);
    });

    const query = params.toString();
    return query ? `?${query}` : '';
};

const isAdmin = (): boolean => {
    const role = getCurrentUser().role || '';
    return isAdminRole(role);
};

const buildPaths = (adminPath: string, userPath: string, query = ''): string[] => {
    const preferred = isAdmin() ? adminPath : userPath;
    const fallback = isAdmin() ? userPath : adminPath;
    const unique = new Set([preferred, fallback]);
    return Array.from(unique).map((base) => `${base}${query}`);
};

export const notificationsService = {
    async getNotifications(limit = 20, offset = 0, unreadOnly = false): Promise<NotificationsResponse> {
        const extraParams: Record<string, string> = {
            limit: String(limit),
            offset: String(offset),
        };
        if (unreadOnly) {
            extraParams.unreadOnly = 'true';
        }
        const query = buildQuery(extraParams);
        return requestJsonWithFallback<NotificationsResponse>(
            buildPaths('/api/admin/notifications/', '/api/notifications/me', query),
            { method: 'GET' }
        );
    },

    async getUnreadCount(): Promise<UnreadCountResponse> {
        const query = buildQuery();
        return requestJsonWithFallback<UnreadCountResponse>(
            buildPaths('/api/admin/notifications/unread-count', '/api/notifications/me/unread-count', query),
            {
            method: 'GET',
            }
        );
    },

    async markAsRead(notificationId: string): Promise<{ success: boolean; message: string }> {
        const query = buildQuery();
        return requestJsonWithFallback<{ success: boolean; message: string }>(
            buildPaths(
                `/api/admin/notifications/${encodeURIComponent(notificationId)}/read`,
                `/api/notifications/${encodeURIComponent(notificationId)}/read`,
                query
            ),
            { method: 'POST' }
        );
    },

    async markAllAsRead(): Promise<{ success: boolean; updated: number; message: string }> {
        const query = buildQuery();
        return requestJsonWithFallback<{ success: boolean; updated: number; message: string }>(
            buildPaths('/api/admin/notifications/read-all', '/api/notifications/read-all', query),
            { method: 'POST' }
        );
    },

    async deleteAllReadNotifications(): Promise<{ success: boolean; deleted: number; message: string }> {
        const query = buildQuery();
        return requestJsonWithFallback<{ success: boolean; deleted: number; message: string }>(
            buildPaths('/api/admin/notifications/read-all', '/api/notifications/read-all', query),
            { method: 'DELETE' }
        );
    },

    async deleteNotification(notificationId: string): Promise<{ success: boolean; message: string }> {
        const query = buildQuery();
        return requestJsonWithFallback<{ success: boolean; message: string }>(
            buildPaths(
                `/api/admin/notifications/${encodeURIComponent(notificationId)}`,
                `/api/notifications/${encodeURIComponent(notificationId)}`,
                query
            ),
            { method: 'DELETE' }
        );
    },
};
