/**
 * Unit tests for featureFlagService.
 *
 * Tests the isFlagEnabled logic and service methods
 * by mocking the fetch API.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { featureFlagService } from '../../services/featureFlagService';


describe('featureFlagService', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    const mockFetchWithFlags = (flags: Array<{ key: string; status: 'Enabled' | 'Disabled' }>) => {
        const fetchSpy = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(flags), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );
        vi.stubGlobal('fetch', fetchSpy);
        return fetchSpy;
    };

    const mockFetchFailure = () => {
        const fetchSpy = vi.fn().mockRejectedValue(new Error('Network error'));
        vi.stubGlobal('fetch', fetchSpy);
        return fetchSpy;
    };

    // ── isContentSearchEnabled ───────────────────────────────────

    it('returns true when content_search_embeddings is Enabled', async () => {
        mockFetchWithFlags([{ key: 'content_search_embeddings', status: 'Enabled' }]);
        const result = await featureFlagService.isContentSearchEnabled();
        expect(result).toBe(true);
    });

    it('returns false when content_search_embeddings is Disabled', async () => {
        mockFetchWithFlags([{ key: 'content_search_embeddings', status: 'Disabled' }]);
        const result = await featureFlagService.isContentSearchEnabled();
        expect(result).toBe(false);
    });

    it('returns false when flag is missing', async () => {
        mockFetchWithFlags([]);
        const result = await featureFlagService.isContentSearchEnabled();
        expect(result).toBe(false);
    });

    // ── isDarkModeEnabled ────────────────────────────────────────

    it('returns true when dark_mode is Enabled', async () => {
        mockFetchWithFlags([{ key: 'dark_mode', status: 'Enabled' }]);
        const result = await featureFlagService.isDarkModeEnabled();
        expect(result).toBe(true);
    });

    it('returns false when dark_mode is Disabled', async () => {
        mockFetchWithFlags([{ key: 'dark_mode', status: 'Disabled' }]);
        const result = await featureFlagService.isDarkModeEnabled();
        expect(result).toBe(false);
    });

    // ── is2faFeatureEnabled ──────────────────────────────────────

    it('returns true when two_factor_auth is Enabled', async () => {
        mockFetchWithFlags([{ key: 'two_factor_auth', status: 'Enabled' }]);
        const result = await featureFlagService.is2faFeatureEnabled();
        expect(result).toBe(true);
    });

    // ── getAllFlags ──────────────────────────────────────────────

    it('returns all flags', async () => {
        const flags = [
            { key: 'dark_mode', status: 'Enabled' as const },
            { key: 'two_factor_auth', status: 'Disabled' as const },
        ];
        mockFetchWithFlags(flags);
        const result = await featureFlagService.getAllFlags();
        expect(result).toHaveLength(2);
    });

    // ── Error handling ──────────────────────────────────────────

    it('returns empty array on network failure', async () => {
        mockFetchFailure();
        const result = await featureFlagService.getAllFlags();
        expect(result).toEqual([]);
    });

    it('returns false for flags on network failure', async () => {
        mockFetchFailure();
        const result = await featureFlagService.isContentSearchEnabled();
        expect(result).toBe(false);
    });

    it('returns empty array on non-ok response', async () => {
        const fetchSpy = vi.fn().mockResolvedValue(
            new Response('', { status: 500 })
        );
        vi.stubGlobal('fetch', fetchSpy);
        const result = await featureFlagService.getAllFlags();
        expect(result).toEqual([]);
    });
});
