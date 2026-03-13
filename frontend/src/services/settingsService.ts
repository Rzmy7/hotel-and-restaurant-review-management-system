import { settingsApi } from '../api/settingsApi';
import type { SettingsData } from '../types/settings';

export const settingsService = {
    getSettings: async (): Promise<SettingsData> => {
        try {
            const data = await settingsApi.fetchSettings();
            return data;
        } catch (error) {
            console.error('Failed to fetch settings:', error);
            throw new Error('Failed to load settings data');
        }
    },

    updateSettings: async (updates: Partial<SettingsData>): Promise<SettingsData> => {
        try {
            const updatedData = await settingsApi.updateSettings(updates);
            return updatedData;
        } catch (error) {
            console.error('Failed to update settings:', error);
            throw new Error('Failed to save settings');
        }
    }
};
