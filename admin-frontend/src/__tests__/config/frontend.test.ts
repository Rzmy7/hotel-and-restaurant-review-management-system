/**
 * Unit tests for config/frontend.ts — frontend URL resolution.
 */

import { describe, it, expect } from 'vitest';
import { getFrontendBaseUrl, getFrontendLoginUrl } from '../../config/frontend';


describe('getFrontendBaseUrl', () => {
    it('returns configured URL', () => {
        const url = getFrontendBaseUrl();
        expect(url).toMatch(/localhost:5173|127\.0\.0\.1:5173/);
    });

    it('does not have trailing slash', () => {
        const url = getFrontendBaseUrl();
        expect(url).not.toMatch(/\/$/);
    });
});


describe('getFrontendLoginUrl', () => {
    it('returns login URL with no query', () => {
        const url = getFrontendLoginUrl();
        expect(url).toMatch(/\/login$/);
    });

    it('appends query string', () => {
        const url = getFrontendLoginUrl('expired=true');
        expect(url).toContain('/login?expired=true');
    });

    it('strips leading ? from query', () => {
        const url = getFrontendLoginUrl('?expired=true');
        expect(url).toContain('/login?expired=true');
        expect(url).not.toContain('??');
    });

    it('handles empty query', () => {
        const url = getFrontendLoginUrl('');
        expect(url).toMatch(/\/login$/);
    });
});
