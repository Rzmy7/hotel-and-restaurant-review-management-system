import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { notificationsService, type BackendNotification } from '../services/notificationsService';

interface NotificationStore {
    notifications: BackendNotification[];
    unreadCount: number;
    hasMore: boolean;
    loading: boolean;

    // Actions
    fetchNotifications: (limit: number, offset: number, replace?: boolean, unreadOnly?: boolean) => Promise<BackendNotification[]>;
    markAsReadInStore: (id: string) => Promise<void>;
    markAllAsReadInStore: () => Promise<void>;
    deleteNotificationInStore: (id: string) => Promise<void>;
    deleteAllReadInStore: () => Promise<void>;
    clearCache: () => void;
    fetchUnreadCount: () => Promise<void>;
}

// Scopes cache dynamically under notifications-cache:${userId} to prevent cross-user leak
const getCurrentUserId = (): string | null => {
    try {
        const raw = localStorage.getItem('authUser');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed.user_id || parsed.id || null;
    } catch {
        return null;
    }
};

const userScopedStorage = createJSONStorage(() => ({
    getItem: (name: string): string | null => {
        const userId = getCurrentUserId();
        const key = userId ? `${name}:${userId}` : name;
        return localStorage.getItem(key);
    },
    setItem: (name: string, value: string): void => {
        const userId = getCurrentUserId();
        const key = userId ? `${name}:${userId}` : name;
        localStorage.setItem(key, value);
    },
    removeItem: (name: string): void => {
        const userId = getCurrentUserId();
        const key = userId ? `${name}:${userId}` : name;
        localStorage.removeItem(key);
    },
}));

// Map-based deduplication and stable sorting: unread first, then created_at DESC, then notification_id DESC
export const mergeAndSortNotifications = (cached: BackendNotification[], fresh: BackendNotification[]): BackendNotification[] => {
    const map = new Map<string, BackendNotification>();
    
    // Add existing cache, then overwrite with fresh items to receive the newest read/write/type statuses
    cached.forEach(n => map.set(n.notification_id, n));
    fresh.forEach(n => map.set(n.notification_id, n));
    
    return Array.from(map.values()).sort((a, b) => {
        // Unread first
        if (a.is_read !== b.is_read) {
            return a.is_read ? 1 : -1;
        }
        
        // Timestamp ordering DESC
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (timeA !== timeB) {
            return timeB - timeA;
        }
        
        // Stable fallback DESC
        return b.notification_id.localeCompare(a.notification_id);
    });
};

export const useNotificationStore = create<NotificationStore>()(
    persist(
        (set, get) => ({
            notifications: [],
            unreadCount: 0,
            hasMore: true,
            loading: false,

            fetchNotifications: async (limit: number, offset: number, replace = false, unreadOnly = false) => {
                // Early guardrails to prevent async race conditions or duplicate fetch bursts
                if (get().loading) return [];
                
                set({ loading: true });
                try {
                    const listResult = await notificationsService.getNotifications(limit, offset, unreadOnly);
                    const fetched = listResult.notifications || [];

                    set((state) => {
                        const mergedList = replace
                            ? mergeAndSortNotifications([], fetched)
                            : mergeAndSortNotifications(state.notifications, fetched);

                        return {
                            notifications: mergedList,
                            hasMore: fetched.length === limit,
                            loading: false,
                        };
                    });
                    return fetched;
                } catch (error) {
                    console.error('Failed to fetch notifications in store:', error);
                    set({ loading: false });
                    return [];
                }
            },

            fetchUnreadCount: async () => {
                try {
                    const unreadResult = await notificationsService.getUnreadCount();
                    set({ unreadCount: unreadResult.count || 0 });
                } catch (error) {
                    console.error('Failed to fetch unread count in store:', error);
                }
            },

            markAsReadInStore: async (id: string) => {
                try {
                    await notificationsService.markAsRead(id);
                    set((state) => {
                        const updatedNotifications = state.notifications.map((n) =>
                            n.notification_id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
                        );
                        // Sort again after read status changes (since we prioritize unread first, read items should slide down)
                        const sortedNotifications = mergeAndSortNotifications(updatedNotifications, []);
                        return {
                            notifications: sortedNotifications,
                            unreadCount: Math.max(0, state.unreadCount - 1),
                        };
                    });
                } catch (error) {
                    console.error('Failed to mark notification as read in store:', error);
                }
            },

            markAllAsReadInStore: async () => {
                try {
                    await notificationsService.markAllAsRead();
                    set((state) => {
                        const updatedNotifications = state.notifications.map((n) => ({
                            ...n,
                            is_read: true,
                            read_at: new Date().toISOString()
                        }));
                        const sortedNotifications = mergeAndSortNotifications(updatedNotifications, []);
                        return {
                            notifications: sortedNotifications,
                            unreadCount: 0,
                        };
                    });
                } catch (error) {
                    console.error('Failed to mark all notifications as read in store:', error);
                }
            },

            deleteNotificationInStore: async (id: string) => {
                try {
                    await notificationsService.deleteNotification(id);
                    set((state) => {
                        const target = state.notifications.find(n => n.notification_id === id);
                        const wasUnread = target ? !target.is_read : false;
                        return {
                            notifications: state.notifications.filter((n) => n.notification_id !== id),
                            unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
                        };
                    });
                } catch (error) {
                    console.error('Failed to delete notification in store:', error);
                }
            },

            deleteAllReadInStore: async () => {
                try {
                    await notificationsService.deleteAllReadNotifications();
                    set((state) => ({
                        notifications: state.notifications.filter((n) => !n.is_read),
                    }));
                } catch (error) {
                    console.error('Failed to delete all read notifications in store:', error);
                }
            },

            clearCache: () => {
                set({
                    notifications: [],
                    unreadCount: 0,
                    hasMore: true,
                    loading: false,
                });
            },
        }),
        {
            name: 'notifications-cache',
            storage: userScopedStorage,
            partialize: (state) => ({
                notifications: state.notifications,
                unreadCount: state.unreadCount,
                hasMore: state.hasMore,
            }),
        }
    )
);
