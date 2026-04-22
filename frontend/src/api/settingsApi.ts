import type { SettingsData } from '../types/settings';
import axios from 'axios';

// Mocked initial data
const STORAGE_KEY = 'vite-ui-theme';
const savedTheme = (localStorage.getItem(STORAGE_KEY) as 'light' | 'dark' | 'system') || 'system';

const defaultSettings: SettingsData = {
    general: {
        propertyName: 'Grand Hotel NYC',
        timeZone: 'EST (UTC-5)',
        language: 'English',
        themePreference: savedTheme,
    },
    notifications: {
        emailNotifications: true,
        newReviewAlerts: true,
        weeklySummary: false,
    },
    security: {
        twoFactorAuth: true,
        sessionTimeout: 30,
    },
    subscription: {
        plan: 'professional',
        billingEmail: 'billing@grandplazahotel.com',
    },
    hotelInfo: {
        hotelName: 'Grand Plaza Hotel & Spa',
        websiteUrl: 'https://grandplazahotel.com',
        propertyType: 'Hotel',
        primaryEmail: 'reviews@grandplazahotel.com',
        phoneNumber: '+1 (555) 987-6543',
    }
};

let currentSettings = { ...defaultSettings };

type UserOrganization = {
    organization_id: string;
    organization_name?: string;
    organization_type?: string | null;
    organization_type_id?: number | null;
    website_url?: string | null;
    primary_email?: string | null;
    phone_number?: string | null;
    logo_url?: string | null;
};

type OrganizationType = {
    type_code: number;
    type_name: string;
};

type UserProfile = {
    is_2fa_enabled?: boolean;
};

export type PasswordChangePayload = {
    currentPassword: string;
    newPassword: string;
    confirmPassword?: string;
};

const API_BASE_URL =
    import.meta.env.VITE_MAIN_BACKEND_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    'http://localhost:8000';

const getApiBaseUrl = (): string => {
    const stored = localStorage.getItem('mainBackendUrl');
    return (stored || API_BASE_URL).replace(/\/$/, '');
};

const toApiPath = (path: string): string => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return cleanPath.startsWith('/api') ? cleanPath : `/api${cleanPath}`;
};

const settingsAxios = axios.create({
    baseURL: getApiBaseUrl(),
});

settingsAxios.interceptors.request.use((config) => {
    config.baseURL = getApiBaseUrl();
    const token = localStorage.getItem('token');
    config.headers = config.headers ?? {};
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    if (!(config.data instanceof FormData)) {
        config.headers['Content-Type'] = 'application/json';
    }

    return config;
});

const getActiveOrganizationId = (): string | null => {
    const currentOrg = localStorage.getItem('current_organization');
    if (currentOrg && currentOrg.trim()) {
        return currentOrg;
    }

    try {
        const orgIdsRaw = localStorage.getItem('organization_ids');
        if (!orgIdsRaw) return null;
        const parsed = JSON.parse(orgIdsRaw);
        if (Array.isArray(parsed) && typeof parsed[0] === 'string' && parsed[0].trim()) {
            return parsed[0];
        }
    } catch {
        return null;
    }

    return null;
};

const normalizeEmpty = (value?: string | null): string | undefined => {
    if (value == null) return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};

const mapOrganizationToHotelInfo = (org: UserOrganization): SettingsData['hotelInfo'] => ({
    hotelName: org.organization_name || currentSettings.hotelInfo.hotelName,
    websiteUrl: org.website_url || '',
    propertyType: org.organization_type || currentSettings.hotelInfo.propertyType,
    primaryEmail: org.primary_email || '',
    phoneNumber: org.phone_number || '',
    logoUrl: org.logo_url || undefined,
});

const fetchUserOrganizations = async (): Promise<UserOrganization[]> => {
    const response = await settingsAxios.get<UserOrganization[]>(toApiPath('/user/organizations'));
    return Array.isArray(response.data) ? response.data : [];
};

const resolveOrganizationTypeId = async (propertyType: string): Promise<number | undefined> => {
    const normalizedTarget = propertyType.trim().toLowerCase();
    if (!normalizedTarget) return undefined;

    const numeric = Number(propertyType);
    if (!Number.isNaN(numeric) && Number.isInteger(numeric) && numeric > 0) {
        return numeric;
    }

    try {
        const response = await settingsAxios.get<OrganizationType[]>(toApiPath('/organization-types'));
        const matched = response.data.find((type) => type.type_name?.trim().toLowerCase() === normalizedTarget);
        return matched?.type_code;
    } catch {
        return undefined;
    }
};

const patchHotelInfoToBackend = async (hotelInfoUpdates: Partial<SettingsData['hotelInfo']>) => {
    const orgId = getActiveOrganizationId();
    if (!orgId) {
        throw new Error('No active organization selected.');
    }

    const payload: Record<string, string | number | null> = {};

    if (hotelInfoUpdates.hotelName !== undefined) {
        payload.organization_name = normalizeEmpty(hotelInfoUpdates.hotelName) ?? null;
    }
    if (hotelInfoUpdates.websiteUrl !== undefined) {
        payload.website_url = normalizeEmpty(hotelInfoUpdates.websiteUrl) ?? null;
    }
    if (hotelInfoUpdates.primaryEmail !== undefined) {
        payload.primary_email = normalizeEmpty(hotelInfoUpdates.primaryEmail) ?? null;
    }
    if (hotelInfoUpdates.phoneNumber !== undefined) {
        payload.phone_number = normalizeEmpty(hotelInfoUpdates.phoneNumber) ?? null;
    }
    if (hotelInfoUpdates.logoUrl !== undefined) {
        payload.logo_url = normalizeEmpty(hotelInfoUpdates.logoUrl) ?? null;
    }
    if (hotelInfoUpdates.propertyType !== undefined) {
        const organizationTypeId = await resolveOrganizationTypeId(hotelInfoUpdates.propertyType);
        if (organizationTypeId !== undefined) {
            payload.organization_type_id = organizationTypeId;
        }
    }

    if (Object.keys(payload).length > 0) {
        await settingsAxios.patch(toApiPath(`/organizations/${orgId}`), payload);
    }
};

const syncOrganizationInStorage = (hotelInfo: SettingsData['hotelInfo']) => {
    const currentOrgId = getActiveOrganizationId();
    if (!currentOrgId) return;

    try {
        const raw = localStorage.getItem('organizations');
        if (!raw) return;

        const organizations = JSON.parse(raw);
        if (!Array.isArray(organizations)) return;

        const nextOrganizations = organizations.map((org) => {
            if (!org || org.organization_id !== currentOrgId) {
                return org;
            }

            return {
                ...org,
                organization_name: hotelInfo.hotelName,
                website_url: hotelInfo.websiteUrl,
                primary_email: hotelInfo.primaryEmail,
                phone_number: hotelInfo.phoneNumber,
                logo_url: hotelInfo.logoUrl ?? null,
                organization_type: hotelInfo.propertyType,
            };
        });

        localStorage.setItem('organizations', JSON.stringify(nextOrganizations));
    } catch {
        // Ignore storage sync failures; server save remains source of truth.
    }
};

export const settingsApi = {
    fetchSettings: async (): Promise<SettingsData> => {
        try {
            const organizations = await fetchUserOrganizations();
            const activeOrgId = getActiveOrganizationId();
            const activeOrg =
                organizations.find((org) => org.organization_id === activeOrgId) ||
                organizations[0];

            if (activeOrg) {
                currentSettings = {
                    ...currentSettings,
                    hotelInfo: mapOrganizationToHotelInfo(activeOrg),
                };
            }
        } catch {
            // Keep local fallback settings when backend data is unavailable.
        }

        try {
            const profileResponse = await settingsAxios.get<UserProfile>(toApiPath('/users/me'));
            currentSettings = {
                ...currentSettings,
                security: {
                    ...currentSettings.security,
                    twoFactorAuth: !!profileResponse.data?.is_2fa_enabled,
                },
            };
        } catch {
            // Keep existing local security fallback when profile call fails.
        }

        return { ...currentSettings };
    },
    updateSettings: async (updates: Partial<SettingsData>): Promise<SettingsData> => {
        if (updates.hotelInfo) {
            await patchHotelInfoToBackend(updates.hotelInfo);
        }

        currentSettings = {
            ...currentSettings,
            ...updates,
            hotelInfo: {
                ...currentSettings.hotelInfo,
                ...(updates.hotelInfo || {}),
            },
        };

        syncOrganizationInStorage(currentSettings.hotelInfo);

        return { ...currentSettings };
    },

    uploadHotelLogo: async (file: File): Promise<string> => {
        const orgId = getActiveOrganizationId();
        if (!orgId) {
            throw new Error('No active organization selected.');
        }

        const formData = new FormData();
        formData.append('file', file);

        const response = await settingsAxios.post<{ logo_url: string }>(
            toApiPath(`/organizations/${orgId}/upload-logo`),
            formData
        );

        const logoUrl = response.data?.logo_url;
        if (!logoUrl) {
            throw new Error('Logo upload succeeded but URL was not returned.');
        }

        currentSettings = {
            ...currentSettings,
            hotelInfo: {
                ...currentSettings.hotelInfo,
                logoUrl,
            },
        };

        syncOrganizationInStorage(currentSettings.hotelInfo);

        return logoUrl;
    },

    changePassword: async (payload: PasswordChangePayload): Promise<{ message: string }> => {
        const response = await settingsAxios.post<{ message: string }>(
            toApiPath('/users/me/password'),
            {
                current_password: payload.currentPassword,
                new_password: payload.newPassword,
                confirm_password: payload.confirmPassword ?? payload.newPassword,
            }
        );

        return response.data;
    },

    request2FA: async (): Promise<{ message: string }> => {
        const response = await settingsAxios.post<{ message: string }>(
            toApiPath('/users/me/2fa/request')
        );
        return response.data;
    },

    enable2FA: async (code: string): Promise<{ message: string }> => {
        const response = await settingsAxios.post<{ message: string }>(
            toApiPath('/users/me/2fa/enable'),
            { code }
        );
        return response.data;
    },

    disable2FA: async (): Promise<{ message: string }> => {
        const response = await settingsAxios.post<{ message: string }>(
            toApiPath('/users/me/2fa/disable')
        );
        return response.data;
    }
};
