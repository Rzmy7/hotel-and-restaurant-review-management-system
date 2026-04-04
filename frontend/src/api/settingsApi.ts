import type { SettingsData } from '../types/settings';
import { apiClient } from './client';

// Mocked initial data
const STORAGE_KEY = 'vite-ui-theme';
const CURRENT_ORG_STORAGE_KEY = 'current_organization';
const savedTheme = (localStorage.getItem(STORAGE_KEY) as 'light' | 'dark' | 'system') || 'system';

type BackendGeneralSettings = {
    propertyName: string;
    timeZone: string;
    themePreference?: 'light' | 'dark' | 'system';
};

const UI_TO_IANA_TIMEZONE: Record<string, string> = {
    'EST (UTC-5)': 'America/New_York',
    'CST (UTC-6)': 'America/Chicago',
    'MST (UTC-7)': 'America/Denver',
    'PST (UTC-8)': 'America/Los_Angeles',
    'GMT (UTC+0)': 'UTC',
};

const IANA_TO_UI_TIMEZONE: Record<string, string> = Object.entries(UI_TO_IANA_TIMEZONE).reduce(
    (acc, [uiValue, ianaValue]) => ({ ...acc, [ianaValue]: uiValue }),
    {} as Record<string, string>,
);

const toBackendTimeZone = (value: string): string => UI_TO_IANA_TIMEZONE[value] || value;
const toUiTimeZone = (value: string): string => IANA_TO_UI_TIMEZONE[value] || 'GMT (UTC+0)';

const getCurrentOrganizationId = (): string | null => {
    const orgId = localStorage.getItem(CURRENT_ORG_STORAGE_KEY);
    return orgId && orgId.trim() ? orgId : null;
};

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

const mergeGeneralFromBackend = (general: BackendGeneralSettings): void => {
    currentSettings = {
        ...currentSettings,
        general: {
            ...currentSettings.general,
            propertyName: general.propertyName,
            timeZone: toUiTimeZone(general.timeZone),
            themePreference: general.themePreference || currentSettings.general.themePreference,
        },
    };
};

export const settingsApi = {
    fetchSettings: async (): Promise<SettingsData> => {
        const orgId = getCurrentOrganizationId();

        if (orgId) {
            try {
                const general = await apiClient.get<BackendGeneralSettings>(`/api/organizations/${orgId}/settings/general`);
                mergeGeneralFromBackend(general);
            } catch {
                // Preserve current UI behavior by falling back to in-memory values when backend fetch fails.
            }
        }

        return { ...currentSettings };
    },
    updateSettings: async (updates: Partial<SettingsData>): Promise<SettingsData> => {
        currentSettings = {
            ...currentSettings,
            ...updates,
            general: {
                ...currentSettings.general,
                ...(updates.general || {}),
            },
            notifications: {
                ...currentSettings.notifications,
                ...(updates.notifications || {}),
            },
            security: {
                ...currentSettings.security,
                ...(updates.security || {}),
            },
            subscription: {
                ...currentSettings.subscription,
                ...(updates.subscription || {}),
            },
            hotelInfo: {
                ...currentSettings.hotelInfo,
                ...(updates.hotelInfo || {}),
            },
        };

        const orgId = getCurrentOrganizationId();
        if (orgId && updates.general) {
            const payload: Pick<BackendGeneralSettings, 'propertyName' | 'timeZone' | 'themePreference'> = {
                propertyName: currentSettings.general.propertyName,
                timeZone: toBackendTimeZone(currentSettings.general.timeZone),
                themePreference: currentSettings.general.themePreference,
            };

            const updatedGeneral = await apiClient.patch<BackendGeneralSettings>(
                `/api/organizations/${orgId}/settings/general`,
                payload,
            );
            mergeGeneralFromBackend(updatedGeneral);
        }

        return { ...currentSettings };
    }
};
