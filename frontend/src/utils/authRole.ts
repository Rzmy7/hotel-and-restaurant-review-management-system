import { getAdminPanelUrl as getAdminPanelBaseUrl } from '../config/api';

export const normalizeRole = (value: unknown): string => {
    if (Array.isArray(value)) {
        return String(value[0] || '').trim().toUpperCase();
    }

    if (typeof value === 'string') {
        return value.trim().toUpperCase();
    }

    return '';
};

const ADMIN_ROLES = new Set(['ADMIN', 'SYSTEM_ADMIN', 'SUPER_ADMIN']);

const getAdminPanelUrl = (): string => {
    return getAdminPanelBaseUrl();
};

export const isAdminRole = (value: unknown): boolean => ADMIN_ROLES.has(normalizeRole(value));

export const isExternalDestination = (value: string): boolean => /^https?:\/\//i.test(value);

export const getDashboardPathForRole = (value: unknown, token?: string, user?: string): string => {
    if (isAdminRole(value)) {
        const baseUrl = getAdminPanelUrl();
        const params = new URLSearchParams();
        if (token) params.append('token', token);
        if (user) params.append('user', user);
        const query = params.toString();
        return query ? `${baseUrl}?${query}` : baseUrl;
    }
    return '/dashboard';
};
