/**
 * Unit tests for config/api.ts — URL resolution functions.
 *
 * Tests: getApiBaseUrl, getAdminPanelUrl with localStorage overrides
 * and environment variable fallbacks.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getApiBaseUrl, getAdminPanelUrl } from '../../config/api';


describe('getApiBaseUrl', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('returns fallback when no localStorage override', () => {
        const url = getApiBaseUrl();
        expect(url).toMatch(/localhost:8000|127\.0\.0\.1:8000/);
    });

    it('uses localStorage override when set', () => {
        localStorage.setItem('mainBackendUrl', 'http://custom-server.com');
        const url = getApiBaseUrl();
        expect(url).toBe('http://custom-server.com');
    });

    it('strips trailing slash', () => {
        localStorage.setItem('mainBackendUrl', 'http://example.com/');
        const url = getApiBaseUrl();
        expect(url).not.toMatch(/\/$/);
    });

    it('handles empty localStorage value', () => {
        localStorage.setItem('mainBackendUrl', '');
        const url = getApiBaseUrl();
        expect(url).toMatch(/localhost|127\.0\.0\.1/);
    });
});


describe('getAdminPanelUrl', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('returns fallback when no localStorage override', () => {
        const url = getAdminPanelUrl();
        expect(url).toMatch(/localhost:5174|127\.0\.0\.1:5174/);
    });

    it('uses localStorage override when set', () => {
        localStorage.setItem('adminPanelUrl', 'http://admin.example.com');
        const url = getAdminPanelUrl();
        expect(url).toBe('http://admin.example.com');
    });

    it('strips trailing slash', () => {
        localStorage.setItem('adminPanelUrl', 'http://admin.example.com/');
        const url = getAdminPanelUrl();
        expect(url).not.toMatch(/\/$/);
    });
});
