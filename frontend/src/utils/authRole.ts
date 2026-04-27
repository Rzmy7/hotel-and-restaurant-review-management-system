import { getAdminPanelUrl as getAdminPanelBaseUrl } from "../config/api";

export const normalizeRole = (value: unknown): string => {
  if (Array.isArray(value)) {
    return String(value[0] || "")
      .trim()
      .toUpperCase();
  }

  if (typeof value === "string") {
    return value.trim().toUpperCase();
  }

  return "";
};

const ADMIN_ROLES = new Set(["ADMIN", "SYSTEM_ADMIN", "SUPER_ADMIN"]);

const getAdminPanelUrl = (providedToken?: string, providedUser?: string): string => {
    const base = getAdminPanelBaseUrl();
    const token = providedToken || localStorage.getItem('token');
    const authUser = providedUser || localStorage.getItem('authUser');
    
    if (token) {
        const params = new URLSearchParams();
        params.set('token', token);
        if (authUser) params.set('user', authUser);
        return `${base}?${params.toString()}`;
    }
    return base;
};

export const isAdminRole = (value: unknown): boolean =>
  ADMIN_ROLES.has(normalizeRole(value));

export const isExternalDestination = (value: string): boolean =>
  /^https?:\/\//i.test(value);

export const getDashboardPathForRole = (value: unknown, token?: string, userStr?: string): string =>
    isAdminRole(value) ? getAdminPanelUrl(token, userStr) : '/dashboard';
