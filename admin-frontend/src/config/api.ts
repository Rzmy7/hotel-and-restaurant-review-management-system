/**
 * Centralised API configuration for admin-frontend.
 * @version 2.0.0 – Added robust URL protocol normalization
 *
 * Resolution order:
 *   1. localStorage  "mainBackendUrl"  (set at runtime via API Management page)
 *   2. VITE_MAIN_BACKEND_URL          (build-time env var)
 *   3. VITE_API_BASE_URL              (build-time env var, legacy alias)
 *   4. "http://localhost:8000"         (local-dev fallback)
 */

const FALLBACK_BACKEND_URL = 'http://localhost:8000';

const BUILD_TIME_BACKEND_URL: string =
    import.meta.env.VITE_MAIN_BACKEND_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    FALLBACK_BACKEND_URL;

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

/**
 * Return the current backend base URL (no trailing slash).
 */
export const getApiBaseUrl = (): string => {
    const stored = localStorage.getItem('mainBackendUrl');
    return normalizeBackendBaseUrl(stored || BUILD_TIME_BACKEND_URL, BUILD_TIME_BACKEND_URL);
};
