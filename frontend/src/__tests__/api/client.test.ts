/**
 * Unit tests for the API client utility functions.
 *
 * Tests the pure helper functions: getFullUrl, isAuthLoginRequest,
 * readErrorMessage, getHeaders, and handleResponse behavior.
 *
 * We re-implement / extract the logic to test since they're not
 * directly exported — we test through the apiClient methods via fetch mocks.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';


// ── getFullUrl logic ─────────────────────────────────────────────

describe('getFullUrl logic', () => {
    it('auto-prepends /api to relative paths', async () => {
        const fetchSpy = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ ok: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );
        vi.stubGlobal('fetch', fetchSpy);

        const { apiClient } = await import('../../api/client');
        await apiClient.get('/reviews');

        const calledUrl = fetchSpy.mock.calls[0][0];
        expect(calledUrl).toContain('/api/reviews');

        vi.unstubAllGlobals();
    });

    it('does not double-prepend /api', async () => {
        const fetchSpy = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({}), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );
        vi.stubGlobal('fetch', fetchSpy);

        const { apiClient } = await import('../../api/client');
        await apiClient.get('/api/auth/login');

        const calledUrl = fetchSpy.mock.calls[0][0];
        // Should NOT contain /api/api/
        expect(calledUrl).not.toContain('/api/api/');

        vi.unstubAllGlobals();
    });

    it('preserves absolute URLs', async () => {
        const fetchSpy = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({}), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );
        vi.stubGlobal('fetch', fetchSpy);

        const { apiClient } = await import('../../api/client');
        await apiClient.get('http://other-service.com/data');

        const calledUrl = fetchSpy.mock.calls[0][0];
        expect(calledUrl).toBe('http://other-service.com/data');

        vi.unstubAllGlobals();
    });
});


// ── getHeaders logic ─────────────────────────────────────────────

describe('getHeaders (Authorization)', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('includes Bearer token when stored', async () => {
        localStorage.setItem('token', 'test-jwt-token');

        const fetchSpy = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({}), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );
        vi.stubGlobal('fetch', fetchSpy);

        const { apiClient } = await import('../../api/client');
        await apiClient.get('/test');

        const headers = fetchSpy.mock.calls[0][1].headers;
        expect(headers.Authorization).toBe('Bearer test-jwt-token');

        vi.unstubAllGlobals();
    });

    it('sets Content-Type to application/json for non-FormData', async () => {
        const fetchSpy = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({}), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );
        vi.stubGlobal('fetch', fetchSpy);

        const { apiClient } = await import('../../api/client');
        await apiClient.post('/test', { data: 'value' });

        const headers = fetchSpy.mock.calls[0][1].headers;
        expect(headers['Content-Type']).toBe('application/json');

        vi.unstubAllGlobals();
    });
});


// ── handleResponse error handling ────────────────────────────────

describe('handleResponse (error behavior)', () => {
    it('throws on 500 response', async () => {
        const fetchSpy = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ detail: 'Internal server error' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            })
        );
        vi.stubGlobal('fetch', fetchSpy);

        const { apiClient } = await import('../../api/client');
        await expect(apiClient.get('/test')).rejects.toThrow();

        vi.unstubAllGlobals();
    });

    it('throws on 403 response', async () => {
        const fetchSpy = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ detail: 'Access denied' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
            })
        );
        vi.stubGlobal('fetch', fetchSpy);

        const { apiClient } = await import('../../api/client');
        await expect(apiClient.get('/test')).rejects.toThrow('Access denied');

        vi.unstubAllGlobals();
    });

    it('returns JSON for successful response', async () => {
        const fetchSpy = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ status: 'healthy' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );
        vi.stubGlobal('fetch', fetchSpy);

        const { apiClient } = await import('../../api/client');
        const result = await apiClient.get('/test');
        expect(result).toEqual({ status: 'healthy' });

        vi.unstubAllGlobals();
    });

    it('bypasses redirect on 401 response for /auth/me', async () => {
        const fetchSpy = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ detail: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            })
        );
        vi.stubGlobal('fetch', fetchSpy);
        
        // Mock window.location
        const originalLocation = window.location;
        const mockLocation = {
            pathname: '/dashboard',
            href: ''
        };
        delete (window as any).location;
        window.location = mockLocation as any;

        const { apiClient } = await import('../../api/client');
        await expect(apiClient.get('/auth/me')).rejects.toThrow();

        expect(mockLocation.href).toBe(''); // No redirect!

        // Cleanup
        delete (window as any).location;
        window.location = originalLocation;
        vi.unstubAllGlobals();
    });

    it('redirects on 401 response for other routes when not on /login', async () => {
        const fetchSpy = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ detail: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            })
        );
        vi.stubGlobal('fetch', fetchSpy);
        
        // Mock window.location
        const originalLocation = window.location;
        const mockLocation = {
            pathname: '/dashboard',
            href: ''
        };
        delete (window as any).location;
        window.location = mockLocation as any;

        const { apiClient } = await import('../../api/client');
        await expect(apiClient.get('/other-route')).rejects.toThrow();

        expect(mockLocation.href).toBe('/login?expired=true'); // Redirected!

        // Cleanup
        delete (window as any).location;
        window.location = originalLocation;
        vi.unstubAllGlobals();
    });

    it('bypasses redirect on 401 response when on public routes like /reset-password', async () => {
        const fetchSpy = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ detail: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            })
        );
        vi.stubGlobal('fetch', fetchSpy);
        
        // Mock window.location on /reset-password route
        const originalLocation = window.location;
        const mockLocation = {
            pathname: '/reset-password/test-token-123',
            href: ''
        };
        delete (window as any).location;
        window.location = mockLocation as any;

        const { apiClient } = await import('../../api/client');
        await expect(apiClient.get('/user/organizations')).rejects.toThrow();

        expect(mockLocation.href).toBe(''); // No redirect!

        // Cleanup
        delete (window as any).location;
        window.location = originalLocation;
        vi.unstubAllGlobals();
    });
});


// ── HTTP methods ─────────────────────────────────────────────────

describe('apiClient HTTP methods', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('GET sends correct method', async () => {
        const fetchSpy = vi.fn().mockResolvedValue(
            new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
        );
        vi.stubGlobal('fetch', fetchSpy);

        const { apiClient } = await import('../../api/client');
        await apiClient.get('/test');
        expect(fetchSpy.mock.calls[0][1].method).toBe('GET');
    });

    it('POST sends correct method with body', async () => {
        const fetchSpy = vi.fn().mockResolvedValue(
            new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
        );
        vi.stubGlobal('fetch', fetchSpy);

        const { apiClient } = await import('../../api/client');
        await apiClient.post('/test', { key: 'value' });
        expect(fetchSpy.mock.calls[0][1].method).toBe('POST');
        expect(fetchSpy.mock.calls[0][1].body).toContain('"key"');
    });

    it('PUT sends correct method', async () => {
        const fetchSpy = vi.fn().mockResolvedValue(
            new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
        );
        vi.stubGlobal('fetch', fetchSpy);

        const { apiClient } = await import('../../api/client');
        await apiClient.put('/test', { data: 1 });
        expect(fetchSpy.mock.calls[0][1].method).toBe('PUT');
    });

    it('DELETE sends correct method', async () => {
        const fetchSpy = vi.fn().mockResolvedValue(
            new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
        );
        vi.stubGlobal('fetch', fetchSpy);

        const { apiClient } = await import('../../api/client');
        await apiClient.delete('/test');
        expect(fetchSpy.mock.calls[0][1].method).toBe('DELETE');
    });

    it('GET appends query params', async () => {
        const fetchSpy = vi.fn().mockResolvedValue(
            new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
        );
        vi.stubGlobal('fetch', fetchSpy);

        const { apiClient } = await import('../../api/client');
        await apiClient.get('/reviews', { page: 1, limit: 10 });
        const calledUrl = fetchSpy.mock.calls[0][0];
        expect(calledUrl).toContain('page=1');
        expect(calledUrl).toContain('limit=10');
    });
});
