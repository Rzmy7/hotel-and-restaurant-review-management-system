import { settingsApi } from '../api/settingsApi';
import type { PasswordChangePayload } from '../api/settingsApi';
import type { SettingsData } from '../types/settings';
import axios from 'axios';

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
    },

    uploadHotelLogo: async (file: File): Promise<string> => {
        try {
            return await settingsApi.uploadHotelLogo(file);
        } catch (error) {
            console.error('Failed to upload hotel logo:', error);
            throw new Error('Failed to upload hotel logo');
        }
    },

    changePassword: async (payload: PasswordChangePayload): Promise<string> => {
        try {
            const response = await settingsApi.changePassword(payload);
            return response.message || 'Password updated successfully';
        } catch (error) {
            console.error('Failed to change password:', error);

            if (axios.isAxiosError(error)) {
                const detail = error.response?.data?.detail;
                if (typeof detail === 'string' && detail.trim()) {
                    throw new Error(detail);
                }
            }

            throw new Error('Failed to update password');
        }
    }
};
