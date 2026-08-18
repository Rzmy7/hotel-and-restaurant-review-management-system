import { matchWindowHostname } from './api';

/**
 * Resolve the user-frontend base URL.
 *
 * Read from VITE_FRONTEND_URL env var. In local dev this is http://localhost:5173,
 * in production it would be https://reviewmate.live (or whatever your domain is).
 */
export const getFrontendBaseUrl = (): string => {
    const configured = (import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173').trim().replace(/\/$/, '');
    return matchWindowHostname(configured);
};

export const getFrontendLoginUrl = (query?: string): string => {
    const baseUrl = getFrontendBaseUrl();
    const cleanQuery = (query || '').replace(/^\?/, '');
    return cleanQuery ? `${baseUrl}/login?${cleanQuery}` : `${baseUrl}/login`;
};
