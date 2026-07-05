/**
 * Unit tests for config/api.ts — URL resolution for admin backend.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getApiBaseUrl, normalizeBackendBaseUrl } from '../../config/api';


describe('normalizeBackendBaseUrl', () => {
    it('returns valid URL as-is (no trailing slash)', () => {
        expect(normalizeBackendBaseUrl('http://example.com')).toBe('http://example.com');
    });

    it('strips trailing slash', () => {
        expect(normalizeBackendBaseUrl('http://example.com/')).toBe('http://example.com');
    });

    it('auto-prepends protocol for bare domains', () => {
        const result = normalizeBackendBaseUrl('example.com');
        expect(result).toContain('example.com');
        expect(result).toMatch(/^https?:\/\//);
    });

    it('handles protocol-relative URLs', () => {
        const result = normalizeBackendBaseUrl('//example.com');
        expect(result).toContain('example.com');
    });

    it('returns fallback for empty string', () => {
        expect(normalizeBackendBaseUrl('')).toMatch(/localhost|127\.0\.0\.1/);
    });

    it('returns custom fallback when provided', () => {
        expect(normalizeBackendBaseUrl('', 'http://custom-fallback.com')).toBe('http://custom-fallback.com');
    });

    it('strips trailing slash from fallback', () => {
        expect(normalizeBackendBaseUrl('', 'http://fallback.com/')).toBe('http://fallback.com');
    });
});


describe('getApiBaseUrl', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('returns fallback when no localStorage override', () => {
        const url = getApiBaseUrl();
        expect(url).toMatch(/localhost:8000|127\.0\.0\.1:8000/);
    });

    it('uses localStorage override', () => {
        localStorage.setItem('mainBackendUrl', 'http://production-api.com');
        expect(getApiBaseUrl()).toBe('http://production-api.com');
    });

    it('strips trailing slash from localStorage value', () => {
        localStorage.setItem('mainBackendUrl', 'http://api.com/');
        const url = getApiBaseUrl();
        expect(url).not.toMatch(/\/$/);
    });
});
