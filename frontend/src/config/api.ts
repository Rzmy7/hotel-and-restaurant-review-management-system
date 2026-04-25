/**
 * Centralised API configuration for user-frontend.
 *
 * All URLs are read from VITE_* environment variables set in the .env file.
 * Local dev: point to localhost addresses.
 * Production: point to production URLs.
 *
 * Resolution order:
 *   1. localStorage  "mainBackendUrl"  (runtime override from setup/admin)
 *   2. VITE_MAIN_BACKEND_URL          (build-time env var from .env)
 *   3. VITE_API_BASE_URL              (legacy alias)
 */

const FALLBACK_BACKEND_URL = import.meta.env.VITE_MAIN_BACKEND_URL
    || import.meta.env.VITE_API_BASE_URL
    || 'http://localhost:8000';

const FALLBACK_ADMIN_PANEL_URL = import.meta.env.VITE_ADMIN_PANEL_URL
    || 'http://localhost:5174';

const hasHttpProtocol = (url: string): boolean => /^https?:\/\//i.test(url);

const withProtocol = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return trimmed;
    if (hasHttpProtocol(trimmed)) return trimmed;
    if (trimmed.startsWith('//')) return `${window.location.protocol}${trimmed}`;
    return `${window.location.protocol}//${trimmed}`;
};

const normalizeUrl = (value: string, fallback: string): string => {
    const candidate = withProtocol(value || '');
    if (!candidate) return fallback.replace(/\/$/, '');
    try {
        return new URL(candidate).toString().replace(/\/$/, '');
    } catch {
        return fallback.replace(/\/$/, '');
    }
};

/**
 * Return the current backend base URL (no trailing slash).
 *
 * Prefers a runtime override stored in localStorage so that the
 * setup wizard or admin panel can redirect to the correct server
 * without rebuilding the frontend bundle.
 */
export const getApiBaseUrl = (): string => {
    const stored = localStorage.getItem('mainBackendUrl');
    return normalizeUrl(stored || FALLBACK_BACKEND_URL, FALLBACK_BACKEND_URL);
};

/**
 * Return the admin-panel base URL (no trailing slash).
 */
export const getAdminPanelUrl = (): string => {
    const stored = localStorage.getItem('adminPanelUrl');
    return normalizeUrl(stored || FALLBACK_ADMIN_PANEL_URL, FALLBACK_ADMIN_PANEL_URL);
};
