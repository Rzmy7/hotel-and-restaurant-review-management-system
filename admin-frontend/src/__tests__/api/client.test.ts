/**
 * Unit tests for admin API client.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';


describe('admin apiClient', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    const mockFetch = (status: number, body: any = {}) => {
        const fetchSpy = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(body), {
                status,
                headers: { 'Content-Type': 'application/json' },
            })
        );
        vi.stubGlobal('fetch', fetchSpy);
        return fetchSpy;
    };


    // ── URL construction ─────────────────────────────────────────

    describe('URL construction', () => {
        it('auto-prepends /api for non-special routes', async () => {
            const fetchSpy = mockFetch(200, {});
            const { apiClient } = await import('../../api/client');
            await apiClient.get('/admin/dashboard/stats');
            expect(fetchSpy.mock.calls[0][0]).toContain('/api/admin/dashboard/stats');
        });

        it('does not double-prepend /api', async () => {
            const fetchSpy = mockFetch(200, {});
            const { apiClient } = await import('../../api/client');
            await apiClient.get('/api/admin/test');
            expect(fetchSpy.mock.calls[0][0]).not.toContain('/api/api/');
        });

        it('preserves absolute URLs', async () => {
            const fetchSpy = mockFetch(200, {});
            const { apiClient } = await import('../../api/client');
            await apiClient.get('http://other.com/data');
            expect(fetchSpy.mock.calls[0][0]).toBe('http://other.com/data');
        });

        it('passes through auth routes without /api prefix', async () => {
            const fetchSpy = mockFetch(200, {});
            const { apiClient } = await import('../../api/client');
            await apiClient.get('/auth/me');
            expect(fetchSpy.mock.calls[0][0]).toContain('/auth/me');
            expect(fetchSpy.mock.calls[0][0]).not.toContain('/api/auth');
        });
    });


    // ── Authentication headers ───────────────────────────────────

    describe('headers', () => {
        it('includes Bearer token from localStorage', async () => {
            localStorage.setItem('token', 'admin-jwt-token');
            const fetchSpy = mockFetch(200, {});
            const { apiClient } = await import('../../api/client');
            await apiClient.get('/admin/test');
            expect(fetchSpy.mock.calls[0][1].headers.Authorization).toBe('Bearer admin-jwt-token');
        });

        it('sets Content-Type to application/json', async () => {
            const fetchSpy = mockFetch(200, {});
            const { apiClient } = await import('../../api/client');
            await apiClient.post('/admin/test', { key: 'val' });
            expect(fetchSpy.mock.calls[0][1].headers['Content-Type']).toBe('application/json');
        });

        it('omits Authorization when no token', async () => {
            const fetchSpy = mockFetch(200, {});
            const { apiClient } = await import('../../api/client');
            await apiClient.get('/admin/test');
            expect(fetchSpy.mock.calls[0][1].headers.Authorization).toBeUndefined();
        });
    });


    // ── HTTP methods ─────────────────────────────────────────────

    describe('HTTP methods', () => {
        it('GET sends correct method', async () => {
            const fetchSpy = mockFetch(200);
            const { apiClient } = await import('../../api/client');
            await apiClient.get('/test');
            expect(fetchSpy.mock.calls[0][1].method).toBe('GET');
        });

        it('POST sends correct method with body', async () => {
            const fetchSpy = mockFetch(200);
            const { apiClient } = await import('../../api/client');
            await apiClient.post('/test', { data: 'value' });
            expect(fetchSpy.mock.calls[0][1].method).toBe('POST');
            expect(fetchSpy.mock.calls[0][1].body).toContain('"data"');
        });

        it('PUT sends correct method', async () => {
            const fetchSpy = mockFetch(200);
            const { apiClient } = await import('../../api/client');
            await apiClient.put('/test', { x: 1 });
            expect(fetchSpy.mock.calls[0][1].method).toBe('PUT');
        });

        it('PATCH sends correct method', async () => {
            const fetchSpy = mockFetch(200);
            const { apiClient } = await import('../../api/client');
            await apiClient.patch('/test', { y: 2 });
            expect(fetchSpy.mock.calls[0][1].method).toBe('PATCH');
        });

        it('DELETE sends correct method', async () => {
            const fetchSpy = mockFetch(200);
            const { apiClient } = await import('../../api/client');
            await apiClient.delete('/test');
            expect(fetchSpy.mock.calls[0][1].method).toBe('DELETE');
        });

        it('GET appends query params', async () => {
            const fetchSpy = mockFetch(200);
            const { apiClient } = await import('../../api/client');
            await apiClient.get('/test', { page: 1, limit: 20 });
            const url = fetchSpy.mock.calls[0][0];
            expect(url).toContain('page=1');
            expect(url).toContain('limit=20');
        });

        it('GET handles array params', async () => {
            const fetchSpy = mockFetch(200);
            const { apiClient } = await import('../../api/client');
            await apiClient.get('/test', { ids: ['a', 'b'] });
            const url = fetchSpy.mock.calls[0][0];
            expect(url).toContain('ids=a');
            expect(url).toContain('ids=b');
        });
    });


    // ── Error handling ───────────────────────────────────────────

    describe('error handling', () => {
        it('throws on 500 response', async () => {
            mockFetch(500, { detail: 'Server error' });
            const { apiClient } = await import('../../api/client');
            await expect(apiClient.get('/test')).rejects.toThrow();
        });

        it('includes detail message in error', async () => {
            mockFetch(400, { detail: 'Bad request payload' });
            const { apiClient } = await import('../../api/client');
            await expect(apiClient.get('/test')).rejects.toThrow('Bad request payload');
        });

        it('handles 204 No Content', async () => {
            const fetchSpy = vi.fn().mockResolvedValue(
                new Response(null, { status: 204 })
            );
            vi.stubGlobal('fetch', fetchSpy);
            const { apiClient } = await import('../../api/client');
            const result = await apiClient.delete('/test');
            expect(result).toEqual({});
        });

        it('returns JSON for 200 with JSON content-type', async () => {
            mockFetch(200, { status: 'ok' });
            const { apiClient } = await import('../../api/client');
            const result = await apiClient.get('/test');
            expect(result).toEqual({ status: 'ok' });
        });
    });
});
