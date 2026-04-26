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
    },

    request2FA: async (): Promise<string> => {
        try {
            const response = await settingsApi.request2FA();
            return response.message;
        } catch (error) {
            console.error('Failed to request 2FA:', error);
            if (axios.isAxiosError(error)) {
                const detail = error.response?.data?.detail;
                if (typeof detail === 'string') throw new Error(detail);
            }
            throw new Error('Failed to send verification code');
        }
    },
    
    enable2FA: async (code: string): Promise<string> => {
        try {
            const response = await settingsApi.enable2FA(code);
            return response.message;
        } catch (error) {
            console.error('Failed to enable 2FA:', error);
            if (axios.isAxiosError(error)) {
                const detail = error.response?.data?.detail;
                if (typeof detail === 'string') throw new Error(detail);
            }
            throw new Error('Failed to verify OTP');
        }
    },

    disable2FA: async (): Promise<string> => {
        try {
            const response = await settingsApi.disable2FA();
            return response.message;
        } catch (error) {
            console.error('Failed to disable 2FA:', error);
            if (axios.isAxiosError(error)) {
                const detail = error.response?.data?.detail;
                if (typeof detail === 'string') throw new Error(detail);
            }
            throw new Error('Failed to disable 2FA');
        }
    },

    uploadRulesFile: async (file: File) => {
        try {
            return await settingsApi.uploadRulesFile(file);
        } catch (error) {
            console.error('Failed to upload rules file:', error);
            if (axios.isAxiosError(error)) {
                const detail = error.response?.data?.detail;
                if (typeof detail === 'string' && detail.trim()) {
                    throw new Error(detail);
                }
            }
            throw new Error('Failed to process rules file');
        }
    },

    fetchOrganizationRules: async () => {
        try {
            return await settingsApi.fetchOrganizationRules();
        } catch (error) {
            console.error('Failed to fetch organization rules:', error);
            return [];
        }
    },
};
