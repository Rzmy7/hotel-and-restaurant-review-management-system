/**
 * Unit tests for authRole utilities.
 */

import { describe, it, expect } from 'vitest';
import {
    normalizeRole,
    isAdminRole,
    isExternalDestination,
    getDashboardPathForRole,
} from '../../utils/authRole';


// ── normalizeRole ────────────────────────────────────────────────

describe('normalizeRole', () => {
    it('uppercases string role', () => {
        expect(normalizeRole('admin')).toBe('ADMIN');
    });

    it('trims whitespace', () => {
        expect(normalizeRole('  user  ')).toBe('USER');
    });

    it('handles array input (takes first element)', () => {
        expect(normalizeRole(['admin', 'user'])).toBe('ADMIN');
    });

    it('handles empty array', () => {
        expect(normalizeRole([])).toBe('');
    });

    it('handles number input', () => {
        expect(normalizeRole(123)).toBe('');
    });

    it('handles null', () => {
        expect(normalizeRole(null)).toBe('');
    });

    it('handles undefined', () => {
        expect(normalizeRole(undefined)).toBe('');
    });
});


// ── isAdminRole ──────────────────────────────────────────────────

describe('isAdminRole', () => {
    it('ADMIN is admin', () => {
        expect(isAdminRole('ADMIN')).toBe(true);
    });

    it('admin (lowercase) is admin', () => {
        expect(isAdminRole('admin')).toBe(true);
    });

    it('SYSTEM_ADMIN is admin', () => {
        expect(isAdminRole('SYSTEM_ADMIN')).toBe(true);
    });

    it('SUPER_ADMIN is admin', () => {
        expect(isAdminRole('SUPER_ADMIN')).toBe(true);
    });

    it('USER is not admin', () => {
        expect(isAdminRole('USER')).toBe(false);
    });

    it('empty string is not admin', () => {
        expect(isAdminRole('')).toBe(false);
    });

    it('array with admin is admin', () => {
        expect(isAdminRole(['admin'])).toBe(true);
    });

    it('null is not admin', () => {
        expect(isAdminRole(null)).toBe(false);
    });
});


// ── isExternalDestination ────────────────────────────────────────

describe('isExternalDestination', () => {
    it('http URL is external', () => {
        expect(isExternalDestination('http://example.com')).toBe(true);
    });

    it('https URL is external', () => {
        expect(isExternalDestination('https://example.com')).toBe(true);
    });

    it('relative path is not external', () => {
        expect(isExternalDestination('/dashboard')).toBe(false);
    });

    it('empty string is not external', () => {
        expect(isExternalDestination('')).toBe(false);
    });
});


// ── getDashboardPathForRole ──────────────────────────────────────

describe('getDashboardPathForRole', () => {
    it('returns /dashboard for regular user', () => {
        expect(getDashboardPathForRole('user')).toBe('/dashboard');
    });

    it('returns admin panel URL for admin', () => {
        const path = getDashboardPathForRole('admin');
        expect(path).toMatch(/localhost:5174|127\.0\.0\.1:5174/);
    });

    it('includes token in admin URL if provided', () => {
        const path = getDashboardPathForRole('admin', 'my-token');
        expect(path).toContain('token=my-token');
    });

    it('includes user in admin URL if provided', () => {
        const path = getDashboardPathForRole('admin', 'tok', 'user-json');
        expect(path).toContain('user=user-json');
    });
});
