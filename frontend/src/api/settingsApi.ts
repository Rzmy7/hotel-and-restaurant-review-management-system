import { SettingsData } from '../types/settings';

// Mocked initial data
const defaultSettings: SettingsData = {
    general: {
        propertyName: 'Grand Hotel NYC',
        timeZone: 'EST (UTC-5)',
        language: 'English',
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

export const settingsApi = {
    fetchSettings: async (): Promise<SettingsData> => {
        return new Promise((resolve) => {
            setTimeout(() => resolve({ ...currentSettings }), 400); // simulate network latency
        });
    },
    updateSettings: async (updates: Partial<SettingsData>): Promise<SettingsData> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                currentSettings = { ...currentSettings, ...updates };
                resolve({ ...currentSettings });
            }, 500);
        });
    }
};
