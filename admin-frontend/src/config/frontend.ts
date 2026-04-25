const isLocalHost = (hostname: string): boolean => {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
};

/**
 * Resolve the user-frontend base URL.
 * Falls back to current origin in production when configured value points to localhost.
 */
export const getFrontendBaseUrl = (): string => {
    const configured = (import.meta.env.VITE_FRONTEND_URL || '').trim().replace(/\/$/, '');
    const currentOrigin = window.location.origin.replace(/\/$/, '');

    if (!configured) {
        return currentOrigin;
    }

    try {
        const configuredUrl = new URL(configured);
        const configuredIsLocal = isLocalHost(configuredUrl.hostname);
        const currentIsLocal = isLocalHost(window.location.hostname);

        // Prevent production deployments from redirecting users to localhost.
        if (configuredIsLocal && !currentIsLocal) {
            return currentOrigin;
        }

        return configured;
    } catch {
        return currentOrigin;
    }
};

export const getFrontendLoginUrl = (query?: string): string => {
    const baseUrl = getFrontendBaseUrl();
    const cleanQuery = (query || '').replace(/^\?/, '');
    return cleanQuery ? `${baseUrl}/login?${cleanQuery}` : `${baseUrl}/login`;
};
