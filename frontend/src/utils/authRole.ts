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
    const configured = localStorage.getItem('adminPanelUrl') || 'http://localhost:4000';
    return configured.replace(/\/$/, '');
};

export const isAdminRole = (value: unknown): boolean => ADMIN_ROLES.has(normalizeRole(value));

export const isExternalDestination = (value: string): boolean => /^https?:\/\//i.test(value);

export const getDashboardPathForRole = (value: unknown): string =>
    isAdminRole(value) ? getAdminPanelUrl() : '/dashboard';
