/**
 * Unit tests for utils/dateTime — formatDateTime.
 */

import { describe, it, expect } from 'vitest';
import { formatDateTime } from '../../utils/dateTime';


describe('formatDateTime', () => {
    const TZ = 'America/New_York';

    // ── Valid dates ──────────────────────────────────────────────

    it('formats ISO date string', () => {
        const result = formatDateTime('2026-04-15T10:30:00Z', TZ);
        expect(result).toContain('Apr');
        expect(result).toContain('15');
        expect(result).toContain('2026');
    });

    it('formats with different timezone', () => {
        const result = formatDateTime('2026-01-01T00:00:00Z', 'Asia/Kolkata');
        expect(result).toContain('Jan');
        expect(result).toContain('2026');
    });

    it('formats UTC timezone', () => {
        const result = formatDateTime('2026-06-15T12:00:00Z', 'UTC');
        expect(result).toContain('Jun');
        expect(result).toContain('15');
    });

    it('includes time portion', () => {
        const result = formatDateTime('2026-04-15T10:30:00Z', 'UTC');
        // Should contain hour:minute format
        expect(result).toMatch(/\d{1,2}:\d{2}/);
    });


    // ── Null/undefined/empty ────────────────────────────────────

    it('returns "Unknown time" for null', () => {
        expect(formatDateTime(null, TZ)).toBe('Unknown time');
    });

    it('returns "Unknown time" for undefined', () => {
        expect(formatDateTime(undefined, TZ)).toBe('Unknown time');
    });

    it('returns "Unknown time" for empty string', () => {
        expect(formatDateTime('', TZ)).toBe('Unknown time');
    });


    // ── Invalid dates ───────────────────────────────────────────

    it('returns raw value for unparseable string', () => {
        expect(formatDateTime('not-a-date', TZ)).toBe('not-a-date');
    });

    it('returns raw value for random text', () => {
        expect(formatDateTime('hello world', TZ)).toBe('hello world');
    });


    // ── Invalid timezone falls back ─────────────────────────────

    it('falls back gracefully for invalid timezone', () => {
        const result = formatDateTime('2026-04-15T10:00:00Z', 'Invalid/Timezone');
        // Should not throw, should return something
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });
});
