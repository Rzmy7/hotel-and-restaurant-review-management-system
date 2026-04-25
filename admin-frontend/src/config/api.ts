/**
 * Centralised API configuration for admin-frontend.
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

/**
 * Return the current backend base URL (no trailing slash).
 */
export const getApiBaseUrl = (): string => {
    const stored = localStorage.getItem('mainBackendUrl');
    return (stored || BUILD_TIME_BACKEND_URL).replace(/\/$/, '');
};
