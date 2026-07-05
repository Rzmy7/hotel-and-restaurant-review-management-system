/**
 * Unit tests for useNotificationStore (Zustand store) and its merge/sort engine.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useNotificationStore, mergeAndSortNotifications } from '../../stores/useNotificationStore';
import { notificationsService, type BackendNotification } from '../../services/notificationsService';

vi.mock('../../services/notificationsService', () => {
    return {
        notificationsService: {
            getNotifications: vi.fn(),
            getUnreadCount: vi.fn(),
            markAsRead: vi.fn(),
            markAllAsRead: vi.fn(),
            deleteAllReadNotifications: vi.fn(),
            deleteNotification: vi.fn(),
        }
    };
});

const makeMockNotification = (id: string, overrides?: Partial<BackendNotification>): BackendNotification => ({
    notification_id: id,
    user_id: 'user-123',
    title: `Notification ${id}`,
    message: `Message ${id}`,
    notification_type: 'info',
    is_read: false,
    created_at: '2026-07-05T12:00:00.000Z',
    read_at: null,
    ...overrides,
});

describe('useNotificationStore & Merge Engine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        
        // Reset the store to initial states
        useNotificationStore.getState().clearCache();
    });

    // ── 1. Initial State ───────────────────────────────────────────
    describe('Initial State', () => {
        it('should have correct initial state values', () => {
            const state = useNotificationStore.getState();
            expect(state.notifications).toEqual([]);
            expect(state.unreadCount).toBe(0);
            expect(state.hasMore).toBe(true);
            expect(state.loading).toBe(false);
        });
    });

    // ── 2. Merge & Sort Engine (mergeAndSortNotifications) ─────────
    describe('Deterministic Merge Engine', () => {
        it('should deduplicate notifications based on notification_id', () => {
            const cached = [
                makeMockNotification('n1', { title: 'Old Title' }),
                makeMockNotification('n2'),
            ];
            const fresh = [
                makeMockNotification('n1', { title: 'New Title' }),
                makeMockNotification('n3'),
            ];

            const result = mergeAndSortNotifications(cached, fresh);

            expect(result).toHaveLength(3);
            const n1 = result.find(n => n.notification_id === 'n1');
            expect(n1?.title).toBe('New Title'); // Overwritten by fresh title
        });

        it('should sort notifications: unread first', () => {
            const cached = [
                makeMockNotification('n1', { is_read: true }),
                makeMockNotification('n2', { is_read: false }),
            ];
            const fresh = [
                makeMockNotification('n3', { is_read: true }),
                makeMockNotification('n4', { is_read: false }),
            ];

            const result = mergeAndSortNotifications(cached, fresh);

            // Expect unread ('n2', 'n4') to be first, followed by read ('n1', 'n3')
            expect(result[0].is_read).toBe(false);
            expect(result[1].is_read).toBe(false);
            expect(result[2].is_read).toBe(true);
            expect(result[3].is_read).toBe(true);
        });

        it('should sort notifications stably: timestamp descending for same read status', () => {
            const list = [
                makeMockNotification('n1', { created_at: '2026-07-05T10:00:00.000Z', is_read: false }),
                makeMockNotification('n2', { created_at: '2026-07-05T12:00:00.000Z', is_read: false }),
                makeMockNotification('n3', { created_at: '2026-07-05T11:00:00.000Z', is_read: false }),
            ];

            const result = mergeAndSortNotifications([], list);

            // Descending order of times: n2 (12:00), n3 (11:00), n1 (10:00)
            expect(result[0].notification_id).toBe('n2');
            expect(result[1].notification_id).toBe('n3');
            expect(result[2].notification_id).toBe('n1');
        });

        it('should sort stably with string fallback comparison for identical timestamp and status', () => {
            const list = [
                makeMockNotification('n1', { created_at: '2026-07-05T10:00:00.000Z', is_read: false }),
                makeMockNotification('n2', { created_at: '2026-07-05T10:00:00.000Z', is_read: false }),
            ];

            const result = mergeAndSortNotifications([], list);

            // Fallback descending check: n2 first because 'n2' > 'n1'
            expect(result[0].notification_id).toBe('n2');
            expect(result[1].notification_id).toBe('n1');
        });
    });

    // ── 3. Fetch Notifications with Guards ─────────────────────────
    describe('fetchNotifications Action', () => {
        it('should fetch from API and populate the store', async () => {
            const mockData = [
                makeMockNotification('n1', { created_at: '2026-07-05T13:00:00.000Z' }),
                makeMockNotification('n2', { created_at: '2026-07-05T12:00:00.000Z' }),
            ];
            vi.mocked(notificationsService.getNotifications).mockResolvedValue({
                userId: 'user-123',
                notifications: mockData,
            });

            await useNotificationStore.getState().fetchNotifications(5, 0);

            const state = useNotificationStore.getState();
            expect(state.notifications).toHaveLength(2);
            expect(state.notifications[0].notification_id).toBe('n1');
            expect(state.hasMore).toBe(false); // 2 fetched < 5 limit
            expect(state.loading).toBe(false);
        });

        it('should mark hasMore to true if fetched count equals limit', async () => {
            const mockData = [
                makeMockNotification('n1', { created_at: '2026-07-05T13:00:00.000Z' }),
                makeMockNotification('n2', { created_at: '2026-07-05T12:00:00.000Z' }),
            ];
            vi.mocked(notificationsService.getNotifications).mockResolvedValue({
                userId: 'user-123',
                notifications: mockData,
            });

            await useNotificationStore.getState().fetchNotifications(2, 0);

            const state = useNotificationStore.getState();
            expect(state.hasMore).toBe(true); // 2 fetched === 2 limit
        });

        it('should exit early and prevent dual fetches if store is already loading', async () => {
            vi.mocked(notificationsService.getNotifications).mockResolvedValue({
                userId: 'user-123',
                notifications: [makeMockNotification('n1')],
            });

            // Put store in loading state artificially
            useNotificationStore.setState({ loading: true });

            const result = await useNotificationStore.getState().fetchNotifications(5, 0);

            // Should exit early, return empty array, and NOT call notificationsService
            expect(result).toEqual([]);
            expect(notificationsService.getNotifications).not.toHaveBeenCalled();
        });
    });

    // ── 4. Unread Counts ───────────────────────────────────────────
    describe('fetchUnreadCount Action', () => {
        it('should retrieve unread count from service', async () => {
            vi.mocked(notificationsService.getUnreadCount).mockResolvedValue({
                userId: 'user-123',
                count: 14,
            });

            await useNotificationStore.getState().fetchUnreadCount();

            expect(useNotificationStore.getState().unreadCount).toBe(14);
        });
    });

    // ── 5. Mark and Delete Actions ─────────────────────────────────
    describe('Store Modification Actions', () => {
        it('should mark notification as read in store and re-sort', async () => {
            const initialList = [
                makeMockNotification('n1', { is_read: false }),
                makeMockNotification('n2', { is_read: false }),
            ];
            useNotificationStore.setState({ notifications: initialList, unreadCount: 2 });

            vi.mocked(notificationsService.markAsRead).mockResolvedValue({ success: true, message: 'Updated' });

            // Mark 'n1' as read
            await useNotificationStore.getState().markAsReadInStore('n1');

            const state = useNotificationStore.getState();
            expect(state.unreadCount).toBe(1);
            
            const n1 = state.notifications.find(n => n.notification_id === 'n1');
            expect(n1?.is_read).toBe(true);

            // Since unreads are sorted first, n2 (unread) must now precede n1 (read)
            expect(state.notifications[0].notification_id).toBe('n2');
            expect(state.notifications[1].notification_id).toBe('n1');
        });

        it('should mark all notifications as read', async () => {
            const initialList = [
                makeMockNotification('n1', { is_read: false }),
                makeMockNotification('n2', { is_read: false }),
            ];
            useNotificationStore.setState({ notifications: initialList, unreadCount: 2 });

            vi.mocked(notificationsService.markAllAsRead).mockResolvedValue({ success: true, updated: 2, message: 'All updated' });

            await useNotificationStore.getState().markAllAsReadInStore();

            const state = useNotificationStore.getState();
            expect(state.unreadCount).toBe(0);
            expect(state.notifications.every(n => n.is_read)).toBe(true);
        });

        it('should delete notification and decrement unreadCount if unread', async () => {
            const initialList = [
                makeMockNotification('n1', { is_read: false }),
                makeMockNotification('n2', { is_read: true }),
            ];
            useNotificationStore.setState({ notifications: initialList, unreadCount: 1 });

            vi.mocked(notificationsService.deleteNotification).mockResolvedValue({ success: true, message: 'Deleted' });

            // Delete 'n1' (unread)
            await useNotificationStore.getState().deleteNotificationInStore('n1');

            let state = useNotificationStore.getState();
            expect(state.notifications).toHaveLength(1);
            expect(state.unreadCount).toBe(0);

            // Delete 'n2' (read)
            await useNotificationStore.getState().deleteNotificationInStore('n2');

            state = useNotificationStore.getState();
            expect(state.notifications).toHaveLength(0);
            expect(state.unreadCount).toBe(0);
        });

        it('should delete all read notifications from store', async () => {
            const initialList = [
                makeMockNotification('n1', { is_read: false }),
                makeMockNotification('n2', { is_read: true }),
            ];
            useNotificationStore.setState({ notifications: initialList });

            vi.mocked(notificationsService.deleteAllReadNotifications).mockResolvedValue({ success: true, deleted: 1, message: 'Cleared' });

            await useNotificationStore.getState().deleteAllReadInStore();

            const state = useNotificationStore.getState();
            expect(state.notifications).toHaveLength(1);
            expect(state.notifications[0].notification_id).toBe('n1');
        });
    });

    // ── 6. Dynamic Scoped Persistence Isolation ─────────────────────
    describe('Dynamic Cache Key Scoping & Isolation', () => {
        it('should persist under dynamic userId-scoped local storage keys', () => {
            // Simulate user "john-doe" logged in
            localStorage.setItem('authUser', JSON.stringify({ user_id: 'john-doe', email: 'john@example.com' }));

            // Trigger some state mutation to force Zustand persist middleware to serialize
            useNotificationStore.setState({
                notifications: [makeMockNotification('n-john')],
                unreadCount: 5,
            });

            // Retrieve saved entry directly from localStorage using the expected user-scoped key
            const serialized = localStorage.getItem('notifications-cache:john-doe');
            expect(serialized).not.toBeNull();

            const parsed = JSON.parse(serialized!);
            expect(parsed.state.unreadCount).toBe(5);
            expect(parsed.state.notifications[0].notification_id).toBe('n-john');
        });

        it('should fallback to default key name if user is not logged in', () => {
            // No authUser in localStorage
            useNotificationStore.setState({
                notifications: [makeMockNotification('n-fallback')],
                unreadCount: 1,
            });

            const serialized = localStorage.getItem('notifications-cache');
            expect(serialized).not.toBeNull();

            const parsed = JSON.parse(serialized!);
            expect(parsed.state.unreadCount).toBe(1);
            expect(parsed.state.notifications[0].notification_id).toBe('n-fallback');
        });
    });
});
