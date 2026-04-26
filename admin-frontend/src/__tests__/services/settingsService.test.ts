/**
 * Unit tests for settingsService — timezone management helpers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    SYSTEM_TIMEZONE_STORAGE_KEY,
    SYSTEM_TIMEZONE_UPDATED_EVENT,
    getStoredSystemTimezone,
    applySystemTimezone,
    emitSystemTimezoneUpdated,
} from '../../services/settingsService';


describe('getStoredSystemTimezone', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('returns "UTC" when nothing stored', () => {
        expect(getStoredSystemTimezone()).toBe('UTC');
    });

    it('returns stored timezone', () => {
        localStorage.setItem(SYSTEM_TIMEZONE_STORAGE_KEY, 'America/New_York');
        expect(getStoredSystemTimezone()).toBe('America/New_York');
    });

    it('uses correct storage key', () => {
        expect(SYSTEM_TIMEZONE_STORAGE_KEY).toBe('systemTimezone');
    });
});


describe('applySystemTimezone', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('stores timezone in localStorage', () => {
        applySystemTimezone('Asia/Kolkata');
        expect(localStorage.getItem(SYSTEM_TIMEZONE_STORAGE_KEY)).toBe('Asia/Kolkata');
    });

    it('normalizes empty string to UTC', () => {
        applySystemTimezone('');
        expect(localStorage.getItem(SYSTEM_TIMEZONE_STORAGE_KEY)).toBe('UTC');
    });

    it('trims whitespace', () => {
        applySystemTimezone('  Europe/London  ');
        expect(localStorage.getItem(SYSTEM_TIMEZONE_STORAGE_KEY)).toBe('Europe/London');
    });

    it('dispatches custom event', () => {
        const handler = vi.fn();
        window.addEventListener(SYSTEM_TIMEZONE_UPDATED_EVENT, handler);

        applySystemTimezone('America/Chicago');

        expect(handler).toHaveBeenCalled();
        window.removeEventListener(SYSTEM_TIMEZONE_UPDATED_EVENT, handler);
    });
});


describe('emitSystemTimezoneUpdated', () => {
    it('dispatches event with timezone detail', () => {
        const handler = vi.fn();
        window.addEventListener(SYSTEM_TIMEZONE_UPDATED_EVENT, handler);

        emitSystemTimezoneUpdated('Pacific/Auckland');

        expect(handler).toHaveBeenCalledTimes(1);
        const event = handler.mock.calls[0][0] as CustomEvent;
        expect(event.detail).toBe('Pacific/Auckland');

        window.removeEventListener(SYSTEM_TIMEZONE_UPDATED_EVENT, handler);
    });
});


describe('SYSTEM_TIMEZONE_UPDATED_EVENT', () => {
    it('is a string constant', () => {
        expect(typeof SYSTEM_TIMEZONE_UPDATED_EVENT).toBe('string');
        expect(SYSTEM_TIMEZONE_UPDATED_EVENT).toBe('system-timezone-updated');
    });
});
