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

const hasHttpProtocol = (url: string): boolean => /^https?:\/\//i.test(url);

const isLocalHost = (hostname: string): boolean =>
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

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
    return normalizeUrl(stored || BUILD_TIME_BACKEND_URL, FALLBACK_BACKEND_URL);
};

/**
 * Return the admin-panel base URL (no trailing slash).
 *
 * In production, if the configured value points to localhost,
 * infer the admin URL by prepending "admin." to the current host.
 */
export const getAdminPanelUrl = (): string => {
    const stored = localStorage.getItem('adminPanelUrl');
    const configured = normalizeUrl(stored || BUILD_TIME_ADMIN_URL, FALLBACK_ADMIN_PANEL_URL);

    try {
        const configuredUrl = new URL(configured);
        const configuredIsLocal = isLocalHost(configuredUrl.hostname);
        const currentIsLocal = isLocalHost(window.location.hostname);

        // In production, don't redirect to localhost — derive admin URL from current origin
        if (configuredIsLocal && !currentIsLocal) {
            return `${window.location.protocol}//admin.${window.location.host}`;
        }
    } catch {
        // fall through
    }

    return configured;
};
