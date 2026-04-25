/**
 * Centralised API configuration.
 *
 * Every module that needs the backend URL should import from here
 * instead of defining its own fallback.
 *
 * Resolution order:
 *   1. localStorage  "mainBackendUrl"  (set at runtime, e.g. during setup)
 *   2. VITE_MAIN_BACKEND_URL          (build-time env var)
 *   3. VITE_API_BASE_URL              (build-time env var, legacy alias)
 *   4. "http://localhost:8000"         (local-dev fallback)
 */

const FALLBACK_BACKEND_URL = 'http://localhost:8000';
const FALLBACK_ADMIN_PANEL_URL = 'http://localhost:5174';

/**
 * Build-time default resolved once at module load so every call
 * to `getApiBaseUrl` doesn't re-read `import.meta.env`.
 */
const BUILD_TIME_BACKEND_URL: string =
    import.meta.env.VITE_MAIN_BACKEND_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    FALLBACK_BACKEND_URL;

const BUILD_TIME_ADMIN_URL: string =
    import.meta.env.VITE_ADMIN_PANEL_URL || FALLBACK_ADMIN_PANEL_URL;

/**
 * Return the current backend base URL (no trailing slash).
 *
 * Prefers a runtime override stored in localStorage so that the
 * setup wizard or admin panel can redirect to the correct server
 * without rebuilding the frontend bundle.
 */
export const getApiBaseUrl = (): string => {
    const stored = localStorage.getItem('mainBackendUrl');
    return (stored || BUILD_TIME_BACKEND_URL).replace(/\/$/, '');
};

/**
 * Return the admin-panel base URL (no trailing slash).
 */
export const getAdminPanelUrl = (): string => {
    const stored = localStorage.getItem('adminPanelUrl');
    return (stored || BUILD_TIME_ADMIN_URL).replace(/\/$/, '');
};
