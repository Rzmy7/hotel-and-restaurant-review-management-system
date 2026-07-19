import type { SettingsData } from '../types/settings';
import axios from 'axios';
import { getApiBaseUrl } from '../config/api';

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
        newReviewAlerts: true,
        weeklySummary: true,
        groupInvitations: true,
        subscriptionChanges: true,
    },
    security: {
        twoFactorAuth: true,
        sessionTimeout: 30,
    },
    subscription: {
        plan: 'professional',
        billingEmail: 'billing@grandplazahotel.com',
    },
    organizationInfo: {
        organizationName: 'Grand Plaza Hotel & Spa',
        websiteUrl: 'https://grandplazahotel.com',
        propertyType: 'Hotel',
        primaryEmail: 'reviews@grandplazahotel.com',
        phoneNumber: '+1 (555) 987-6543',
        locationUrl: '',
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
    city?: string | null;
    country?: string | null;
    location_url?: string | null;
};

export type OrganizationType = {
    type_code: number;
    type_name: string;
};

type UserProfile = {
    is_2fa_enabled?: boolean;
    is_2fa_feature_enabled?: boolean;
    is_email_notifications_enabled?: boolean;
    is_new_review_alerts_enabled?: boolean;
    is_weekly_summary_enabled?: boolean;
    is_group_invitations_enabled?: boolean;
    is_subscription_changes_enabled?: boolean;
};

export type PasswordChangePayload = {
    currentPassword: string;
    newPassword: string;
    confirmPassword?: string;
};

// API base URL is resolved from config/api.ts

const toApiPath = (path: string): string => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return cleanPath.startsWith('/api') ? cleanPath : `/api${cleanPath}`;
};

const settingsAxios = axios.create({
    baseURL: getApiBaseUrl(),
    withCredentials: true,
});

settingsAxios.interceptors.request.use((config) => {
    config.baseURL = getApiBaseUrl();
    config.headers = config.headers ?? {};

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

const mapOrganizationToInfo = (org: UserOrganization): SettingsData['organizationInfo'] => ({
    organizationName: org.organization_name || currentSettings.organizationInfo.organizationName,
    websiteUrl: org.website_url || '',
    propertyType: org.organization_type || currentSettings.organizationInfo.propertyType,
    primaryEmail: org.primary_email || '',
    phoneNumber: org.phone_number || '',
    locationUrl: org.location_url || '',
    city: org.city || '',
    country: org.country || '',
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

const patchOrganizationInfoToBackend = async (organizationInfoUpdates: Partial<SettingsData['organizationInfo']>) => {
    const orgId = getActiveOrganizationId();
    if (!orgId) {
        throw new Error('No active organization selected.');
    }

    const payload: Record<string, string | number | null> = {};

    if (organizationInfoUpdates.organizationName !== undefined) {
        payload.organization_name = normalizeEmpty(organizationInfoUpdates.organizationName) ?? null;
    }
    if (organizationInfoUpdates.websiteUrl !== undefined) {
        payload.website_url = normalizeEmpty(organizationInfoUpdates.websiteUrl) ?? null;
    }
    if (organizationInfoUpdates.primaryEmail !== undefined) {
        payload.primary_email = normalizeEmpty(organizationInfoUpdates.primaryEmail) ?? null;
    }
    if (organizationInfoUpdates.phoneNumber !== undefined) {
        payload.phone_number = normalizeEmpty(organizationInfoUpdates.phoneNumber) ?? null;
    }
    if (organizationInfoUpdates.logoUrl !== undefined) {
        payload.logo_url = normalizeEmpty(organizationInfoUpdates.logoUrl) ?? null;
    }
    if (organizationInfoUpdates.locationUrl !== undefined) {
        payload.location_url = normalizeEmpty(organizationInfoUpdates.locationUrl) ?? null;
    }
    if (organizationInfoUpdates.city !== undefined) {
        payload.city = normalizeEmpty(organizationInfoUpdates.city) ?? null;
    }
    if (organizationInfoUpdates.country !== undefined) {
        payload.country = normalizeEmpty(organizationInfoUpdates.country) ?? null;
    }
    if (organizationInfoUpdates.propertyType !== undefined) {
        const organizationTypeId = await resolveOrganizationTypeId(organizationInfoUpdates.propertyType);
        if (organizationTypeId !== undefined) {
            payload.organization_type_id = organizationTypeId;
        }
    }

    if (Object.keys(payload).length > 0) {
        await settingsAxios.patch(toApiPath(`/organizations/${orgId}`), payload);
    }
};

const syncOrganizationInStorage = (organizationInfo: SettingsData['organizationInfo']) => {
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
                organization_name: organizationInfo.organizationName,
                website_url: organizationInfo.websiteUrl,
                primary_email: organizationInfo.primaryEmail,
                phone_number: organizationInfo.phoneNumber,
                logo_url: organizationInfo.logoUrl ?? null,
                organization_type: organizationInfo.propertyType,
                location_url: organizationInfo.locationUrl || null,
                city: organizationInfo.city || null,
                country: organizationInfo.country || null,
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
                    organizationInfo: mapOrganizationToInfo(activeOrg),
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
                    twoFactorFeatureEnabled: profileResponse.data?.is_2fa_feature_enabled !== false,
                },
                notifications: {
                    ...currentSettings.notifications,
                    newReviewAlerts: profileResponse.data?.is_new_review_alerts_enabled ?? true,
                    weeklySummary: profileResponse.data?.is_weekly_summary_enabled ?? true,
                    groupInvitations: profileResponse.data?.is_group_invitations_enabled ?? true,
                    subscriptionChanges: profileResponse.data?.is_subscription_changes_enabled ?? true,
                },
            };
        } catch {
            // Keep existing local security fallback when profile call fails.
        }

        return { ...currentSettings };
    },
    updateSettings: async (updates: Partial<SettingsData>): Promise<SettingsData> => {
        if (updates.organizationInfo) {
            await patchOrganizationInfoToBackend(updates.organizationInfo);
        }
        
        if (updates.notifications) {
            const payload: Record<string, boolean> = {};
            if (updates.notifications.newReviewAlerts !== undefined) {
                payload.is_new_review_alerts_enabled = updates.notifications.newReviewAlerts;
            }
            if (updates.notifications.weeklySummary !== undefined) {
                payload.is_weekly_summary_enabled = updates.notifications.weeklySummary;
            }
            if (updates.notifications.groupInvitations !== undefined) {
                payload.is_group_invitations_enabled = updates.notifications.groupInvitations;
            }
            if (updates.notifications.subscriptionChanges !== undefined) {
                payload.is_subscription_changes_enabled = updates.notifications.subscriptionChanges;
            }

            if (Object.keys(payload).length > 0) {
                try {
                    await settingsAxios.put(toApiPath('/users/me'), payload);
                } catch (err) {
                    console.error("Failed to update email notifications preference", err);
                }
            }
        }

        currentSettings = {
            ...currentSettings,
            ...updates,
            organizationInfo: {
                ...currentSettings.organizationInfo,
                ...(updates.organizationInfo || {}),
            },
        };

        syncOrganizationInStorage(currentSettings.organizationInfo);

        return { ...currentSettings };
    },

    // Get active org ID from localStorage
    uploadOrganizationLogo: async (file: File): Promise<string> => {
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
            organizationInfo: {
                ...currentSettings.organizationInfo,
                logoUrl,
            },
        };

        syncOrganizationInStorage(currentSettings.organizationInfo);

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
    },

    uploadRulesFile: async (file: File): Promise<{
        message: string;
        filename: string;
        rules_extracted: number;
        rules: Array<{ rule_id: string; text: string; order: number }>;
    }> => {
        const orgId = getActiveOrganizationId();
        if (!orgId) {
            throw new Error('No active organization selected.');
        }

        const formData = new FormData();
        formData.append('file', file);

        const response = await settingsAxios.post(
            toApiPath(`/organizations/${orgId}/upload-rules`),
            formData,
        );

        return response.data;
    },

    fetchOrganizationRules: async (): Promise<Array<{
        rule_id: string;
        rule_text: string;
        rule_order: number;
        is_embedded: boolean;
        source_filename: string | null;
        created_at: string | null;
    }>> => {
        const orgId = getActiveOrganizationId();
        if (!orgId) {
            return [];
        }

        const response = await settingsAxios.get(
            toApiPath(`/organizations/${orgId}/rules`),
        );

        return Array.isArray(response.data) ? response.data : [];
    },

    addOrganizationRule: async (ruleText: string): Promise<{
        rule_id: string;
        rule_text: string;
        rule_order: number;
        is_embedded: boolean;
        source_filename: string | null;
        created_at: string | null;
    }> => {
        const orgId = getActiveOrganizationId();
        if (!orgId) {
            throw new Error('No active organization selected.');
        }

        const response = await settingsAxios.post(
            toApiPath(`/organizations/${orgId}/rules`),
            { rule_text: ruleText }
        );
        return response.data;
    },

    deleteOrganizationRule: async (ruleId: string): Promise<{ message: string; rule_id: string }> => {
        const orgId = getActiveOrganizationId();
        if (!orgId) {
            throw new Error('No active organization selected.');
        }

        const response = await settingsAxios.delete(
            toApiPath(`/organizations/${orgId}/rules/${ruleId}`)
        );
        return response.data;
    },

    fetchOrganizationTypes: async (): Promise<OrganizationType[]> => {
        const response = await settingsAxios.get<OrganizationType[]>(toApiPath('/organization-types'));
        return response.data;
    },
};
