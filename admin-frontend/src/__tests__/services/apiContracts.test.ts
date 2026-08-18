/**
 * Unit tests for service API call contracts.
 *
 * Verifies that each service function calls the correct endpoint
 * with the correct HTTP method by mocking the apiClient.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';


// Helper: mock fetch globally
const setupFetchMock = (responseBody: any = {}) => {
    const fetchSpy = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(responseBody), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        })
    );
    vi.stubGlobal('fetch', fetchSpy);
    return fetchSpy;
};


describe('dashboardService', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('fetchDashboardStats calls /admin/dashboard/stats', async () => {
        const fetchSpy = setupFetchMock({ totalOrganizations: 5 });
        const { fetchDashboardStats } = await import('../../services/dashboardService');
        await fetchDashboardStats();
        expect(fetchSpy.mock.calls[0][0]).toContain('/admin/dashboard/stats');
    });

    it('fetchUsageData calls /admin/dashboard/usage', async () => {
        const fetchSpy = setupFetchMock([]);
        const { fetchUsageData } = await import('../../services/dashboardService');
        await fetchUsageData();
        expect(fetchSpy.mock.calls[0][0]).toContain('/admin/dashboard/usage');
    });

    it('fetchReviewData calls /admin/dashboard/reviews', async () => {
        const fetchSpy = setupFetchMock([]);
        const { fetchReviewData } = await import('../../services/dashboardService');
        await fetchReviewData();
        expect(fetchSpy.mock.calls[0][0]).toContain('/admin/dashboard/reviews');
    });

    it('fetchSystemAlerts calls /admin/dashboard/alerts', async () => {
        const fetchSpy = setupFetchMock([]);
        const { fetchSystemAlerts } = await import('../../services/dashboardService');
        await fetchSystemAlerts();
        expect(fetchSpy.mock.calls[0][0]).toContain('/admin/dashboard/alerts');
    });

    it('fetchRecentActivity calls /admin/dashboard/activities', async () => {
        const fetchSpy = setupFetchMock([]);
        const { fetchRecentActivity } = await import('../../services/dashboardService');
        await fetchRecentActivity();
        expect(fetchSpy.mock.calls[0][0]).toContain('/admin/dashboard/activities');
    });

    it('dismissAlert calls POST with alert ID', async () => {
        const fetchSpy = setupFetchMock({});
        const { dismissAlert } = await import('../../services/dashboardService');
        await dismissAlert('alert-123');
        expect(fetchSpy.mock.calls[0][0]).toContain('/admin/dashboard/alerts/alert-123/dismiss');
        expect(fetchSpy.mock.calls[0][1].method).toBe('POST');
    });

    it('dismissAllAlerts calls POST dismiss-all', async () => {
        const fetchSpy = setupFetchMock({});
        const { dismissAllAlerts } = await import('../../services/dashboardService');
        await dismissAllAlerts();
        expect(fetchSpy.mock.calls[0][0]).toContain('/admin/dashboard/alerts/dismiss-all');
    });
});


describe('adminDataService', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('fetchOrganizations calls GET /admin/organizations', async () => {
        const fetchSpy = setupFetchMock([]);
        const { fetchOrganizations } = await import('../../services/adminDataService');
        await fetchOrganizations();
        expect(fetchSpy.mock.calls[0][0]).toContain('/admin/organizations');
        expect(fetchSpy.mock.calls[0][1].method).toBe('GET');
    });

    it('fetchUsers calls GET /admin/users', async () => {
        const fetchSpy = setupFetchMock([]);
        const { fetchUsers } = await import('../../services/adminDataService');
        await fetchUsers();
        expect(fetchSpy.mock.calls[0][0]).toContain('/admin/users');
    });

    it('createUser calls POST /admin/users', async () => {
        const fetchSpy = setupFetchMock({ id: 'u1' });
        const { createUser } = await import('../../services/adminDataService');
        await createUser({ name: 'John', email: 'john@test.com', role: 'User', status: 'Active' });
        expect(fetchSpy.mock.calls[0][0]).toContain('/admin/users');
        expect(fetchSpy.mock.calls[0][1].method).toBe('POST');
    });

    it('deleteUser calls DELETE /admin/users/:id', async () => {
        const fetchSpy = setupFetchMock({});
        const { deleteUser } = await import('../../services/adminDataService');
        await deleteUser('user-42');
        expect(fetchSpy.mock.calls[0][0]).toContain('/admin/users/user-42');
        expect(fetchSpy.mock.calls[0][1].method).toBe('DELETE');
    });

    it('deleteOrganization calls DELETE /admin/organizations/:id', async () => {
        const fetchSpy = setupFetchMock({ status: 'deleted' });
        const { deleteOrganization } = await import('../../services/adminDataService');
        await deleteOrganization('org-99');
        expect(fetchSpy.mock.calls[0][0]).toContain('/admin/organizations/org-99');
        expect(fetchSpy.mock.calls[0][1].method).toBe('DELETE');
    });

    it('updateOrganization calls PATCH with name', async () => {
        const fetchSpy = setupFetchMock({ id: 'org-1', name: 'New Name' });
        const { updateOrganization } = await import('../../services/adminDataService');
        await updateOrganization('org-1', 'New Name');
        expect(fetchSpy.mock.calls[0][1].method).toBe('PATCH');
        expect(fetchSpy.mock.calls[0][1].body).toContain('New Name');
    });

    it('triggerPendingEmbeddings calls POST', async () => {
        const fetchSpy = setupFetchMock({ triggered_sources_count: 3, message: 'ok' });
        const { triggerPendingEmbeddings } = await import('../../services/adminDataService');
        await triggerPendingEmbeddings();
        expect(fetchSpy.mock.calls[0][0]).toContain('/admin/embeddings/trigger-pending');
        expect(fetchSpy.mock.calls[0][1].method).toBe('POST');
    });

    it('reEmbedAllReviews calls POST to /admin/embeddings/re-embed-all', async () => {
        const fetchSpy = setupFetchMock({ triggered_sources_count: 5, message: 'ok' });
        const { reEmbedAllReviews } = await import('../../services/adminDataService');
        await reEmbedAllReviews();
        expect(fetchSpy.mock.calls[0][0]).toContain('/admin/embeddings/re-embed-all');
        expect(fetchSpy.mock.calls[0][1].method).toBe('POST');
    });
});


describe('notificationsService', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('getAdminNotifications calls GET with limit param', async () => {
        const fetchSpy = setupFetchMock({ userId: 'u1', notifications: [] });
        const { notificationsService } = await import('../../services/notificationsService');
        await notificationsService.getAdminNotifications(10);
        expect(fetchSpy.mock.calls[0][0]).toContain('/admin/notifications/');
        expect(fetchSpy.mock.calls[0][0]).toContain('limit=10');
    });

    it('getAdminUnreadCount calls correct endpoint', async () => {
        const fetchSpy = setupFetchMock({ userId: 'u1', count: 5 });
        const { notificationsService } = await import('../../services/notificationsService');
        await notificationsService.getAdminUnreadCount();
        expect(fetchSpy.mock.calls[0][0]).toContain('/admin/notifications/unread-count');
    });

    it('markAsRead calls POST with notification ID', async () => {
        const fetchSpy = setupFetchMock({ success: true, message: 'ok' });
        const { notificationsService } = await import('../../services/notificationsService');
        await notificationsService.markAsRead('notif-42');
        expect(fetchSpy.mock.calls[0][0]).toContain('/admin/notifications/notif-42/read');
        expect(fetchSpy.mock.calls[0][1].method).toBe('POST');
    });

    it('markAllAsRead calls POST read-all', async () => {
        const fetchSpy = setupFetchMock({ success: true, updated: 3, message: 'ok' });
        const { notificationsService } = await import('../../services/notificationsService');
        await notificationsService.markAllAsRead();
        expect(fetchSpy.mock.calls[0][0]).toContain('/admin/notifications/read-all');
    });
});


describe('featureFlagsService', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('getFeatureFlags calls GET /admin/settings/feature-flags', async () => {
        const fetchSpy = setupFetchMock([]);
        const { featureFlagsService } = await import('../../services/featureFlagsService');
        await featureFlagsService.getFeatureFlags();
        expect(fetchSpy.mock.calls[0][0]).toContain('/admin/settings/feature-flags');
    });

    it('updateFeatureFlag calls PATCH with key and payload', async () => {
        const fetchSpy = setupFetchMock({ id: '1', key: 'dark_mode', status: 'Enabled' });
        const { featureFlagsService } = await import('../../services/featureFlagsService');
        await featureFlagsService.updateFeatureFlag('dark_mode', { status: 'Enabled', limit: 100 });
        expect(fetchSpy.mock.calls[0][0]).toContain('/admin/settings/feature-flags/dark_mode');
        expect(fetchSpy.mock.calls[0][1].method).toBe('PATCH');
    });
});
