/**
 * Centralised API configuration for admin-frontend.
 *
 * All URLs are read from VITE_* environment variables set in the .env file.
 * Local dev: point to localhost addresses.
 * Production: point to production URLs.
 *
 * Resolution order:
 *   1. localStorage  "mainBackendUrl"  (set at runtime via API Management page)
 *   2. VITE_MAIN_BACKEND_URL          (build-time env var from .env)
 *   3. VITE_API_BASE_URL              (legacy alias)
 */

const FALLBACK_BACKEND_URL = import.meta.env.VITE_MAIN_BACKEND_URL
    || import.meta.env.VITE_API_BASE_URL
    || 'http://localhost:8000';

const hasHttpProtocol = (url: string): boolean => /^https?:\/\//i.test(url);

const withProtocol = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return trimmed;
    if (hasHttpProtocol(trimmed)) return trimmed;
    if (trimmed.startsWith('//')) return `${window.location.protocol}${trimmed}`;
    return `${window.location.protocol}//${trimmed}`;
};

/**
 * Normalize any backend URL-like value into an absolute URL without trailing slash.
 * Falls back to a safe default when parsing fails.
 */
export const normalizeBackendBaseUrl = (value: string, fallback: string = FALLBACK_BACKEND_URL): string => {
    const candidate = withProtocol(value || '');

    if (!candidate) {
        return fallback.replace(/\/$/, '');
    }

    try {
        return new URL(candidate).toString().replace(/\/$/, '');
    } catch {
        return fallback.replace(/\/$/, '');
    }
};

export const matchWindowHostname = (urlStr: string): string => {
    try {
        if (typeof window === 'undefined' || !window.location) return urlStr;
        const url = new URL(urlStr);
        const winHost = window.location.hostname;
        // ponytail: dynamically swap localhost/127.0.0.1 to match window hostname for secure SameSite cookie delivery
        if (winHost === 'localhost' && url.hostname === '127.0.0.1') {
            url.hostname = 'localhost';
        } else if (winHost === '127.0.0.1' && url.hostname === 'localhost') {
            url.hostname = '127.0.0.1';
        }
        return url.toString().replace(/\/$/, '');
    } catch {
        return urlStr;
    }
};

/**
 * Return the current backend base URL (no trailing slash).
 */
export const getApiBaseUrl = (): string => {
    const stored = localStorage.getItem('mainBackendUrl');
    return matchWindowHostname(normalizeBackendBaseUrl(stored || FALLBACK_BACKEND_URL, FALLBACK_BACKEND_URL));
};
