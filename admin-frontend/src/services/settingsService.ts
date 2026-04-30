import { apiClient } from '../api/client';

export const SYSTEM_TIMEZONE_STORAGE_KEY = 'systemTimezone';
export const SYSTEM_TIMEZONE_UPDATED_EVENT = 'system-timezone-updated';

export interface GeneralSettings {
    timezone: string;
    language: string;
    dateFormat: string;
    currency: string;
}

export interface ReplyGenerationSettings {
    googleApiKey: string;
    selectedModel: string;
    similarReviewsCount: number;
    googleRequestCount: number;
    googleTokenUsage: number;
    useEmbeddingRules: boolean;
    useSimilarReviews: boolean;
}

export interface SecuritySettings {
    userSessionTimeoutMinutes: number;
    adminSessionTimeoutMinutes: number;
    requireTwoFactorAuth: boolean;
}

export interface ReplyGenerationApiTestPayload {
    provider: 'google';
    apiKey: string;
    model: string;
}

export interface ReplyGenerationApiTestResponse {
    provider: 'google';
    success: boolean;
    message: string;
}

export interface AdminProfile {
    name: string;
}

export interface AdminPasswordChangePayload {
    currentPassword: string;
    newPassword: string;
}

export interface AdminPasswordChangeResponse {
    message: string;
}

export const getStoredSystemTimezone = (): string => {
    return localStorage.getItem(SYSTEM_TIMEZONE_STORAGE_KEY) || Intl.DateTimeFormat().resolvedOptions().timeZone;
};

export const emitSystemTimezoneUpdated = (timezone: string): void => {
    window.dispatchEvent(new CustomEvent<string>(SYSTEM_TIMEZONE_UPDATED_EVENT, { detail: timezone }));
};

export const applySystemTimezone = (timezone: string): void => {
    const normalized = timezone.trim() || 'UTC';
    localStorage.setItem(SYSTEM_TIMEZONE_STORAGE_KEY, normalized);
    emitSystemTimezoneUpdated(normalized);
};

export const settingsService = {
    async getGeneralSettings(): Promise<GeneralSettings> {
        const settings = await apiClient.get<GeneralSettings>('/admin/settings/general');
        applySystemTimezone(settings.timezone);
        return settings;
    },

    async updateGeneralSettings(payload: GeneralSettings): Promise<GeneralSettings> {
        const settings = await apiClient.patch<GeneralSettings>('/admin/settings/general', payload);
        applySystemTimezone(settings.timezone);
        return settings;
    },

    async getReplyGenerationSettings(): Promise<ReplyGenerationSettings> {
        return apiClient.get<ReplyGenerationSettings>('/admin/settings/reply-generation');
    },

    async updateReplyGenerationSettings(payload: ReplyGenerationSettings): Promise<ReplyGenerationSettings> {
        const requestPayload = {
            googleApiKey: payload.googleApiKey,
            selectedModel: payload.selectedModel,
            similarReviewsCount: payload.similarReviewsCount,
            useEmbeddingRules: payload.useEmbeddingRules,
            useSimilarReviews: payload.useSimilarReviews,
        };

        return apiClient.patch<ReplyGenerationSettings>('/admin/settings/reply-generation', requestPayload);
    },

    async testReplyGenerationApiKey(payload: ReplyGenerationApiTestPayload): Promise<ReplyGenerationApiTestResponse> {
        return apiClient.post<ReplyGenerationApiTestResponse>('/admin/settings/reply-generation/test', payload);
    },

    async getAdminProfile(): Promise<AdminProfile> {
        return apiClient.get<AdminProfile>('/admin/settings/admin-profile');
    },

    async updateAdminProfile(payload: AdminProfile): Promise<AdminProfile> {
        return apiClient.patch<AdminProfile>('/admin/settings/admin-profile', payload);
    },

    async changeAdminPassword(payload: AdminPasswordChangePayload): Promise<AdminPasswordChangeResponse> {
        return apiClient.patch<AdminPasswordChangeResponse>('/admin/settings/admin-profile/password', payload);
    },

    async getSecuritySettings(): Promise<SecuritySettings> {
        return apiClient.get<SecuritySettings>('/admin/settings/security');
    },

    async updateSecuritySettings(payload: SecuritySettings): Promise<SecuritySettings> {
        return apiClient.patch<SecuritySettings>('/admin/settings/security', payload);
    },
};
