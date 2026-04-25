const isLocalHost = (hostname: string): boolean => {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
};

/**
 * Resolve the user-frontend base URL.
 *
 * In production, if the configured value points to localhost (or is empty),
 * derive the frontend URL by stripping the "admin." prefix from the current host.
 */
export const getFrontendBaseUrl = (): string => {
    const configured = (import.meta.env.VITE_FRONTEND_URL || '').trim().replace(/\/$/, '');
    const currentOrigin = window.location.origin.replace(/\/$/, '');

    // Helper: derive main frontend URL from admin domain (strip "admin." prefix)
    const deriveFromCurrentHost = (): string => {
        const host = window.location.host; // e.g. admin.reviewmate.blimas.live
        if (host.startsWith('admin.')) {
            return `${window.location.protocol}//${host.slice(6)}`; // reviewmate.blimas.live
        }
        return currentOrigin;
    };

    if (!configured) {
        const currentIsLocal = isLocalHost(window.location.hostname);
        return currentIsLocal ? currentOrigin : deriveFromCurrentHost();
    }

    try {
        const configuredUrl = new URL(configured);
        const configuredIsLocal = isLocalHost(configuredUrl.hostname);
        const currentIsLocal = isLocalHost(window.location.hostname);

        // Prevent production deployments from redirecting users to localhost.
        if (configuredIsLocal && !currentIsLocal) {
            return deriveFromCurrentHost();
        }

        return configured;
    } catch {
        return deriveFromCurrentHost();
    }
};

export const getFrontendLoginUrl = (query?: string): string => {
    const baseUrl = getFrontendBaseUrl();
    const cleanQuery = (query || '').replace(/^\?/, '');
    return cleanQuery ? `${baseUrl}/login?${cleanQuery}` : `${baseUrl}/login`;
};
