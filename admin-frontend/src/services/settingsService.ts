const DEFAULT_MAIN_BACKEND_URL = import.meta.env.VITE_MAIN_BACKEND_URL || 'http://localhost:8000';

export const SYSTEM_TIMEZONE_STORAGE_KEY = 'systemTimezone';
export const SYSTEM_TIMEZONE_UPDATED_EVENT = 'system-timezone-updated';

const getBaseUrl = (): string => {
    const stored = localStorage.getItem('mainBackendUrl');
    return (stored || DEFAULT_MAIN_BACKEND_URL).replace(/\/$/, '');
};

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(`${getBaseUrl()}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers || {}),
        },
        ...init,
    });

    if (!response.ok) {
        const details = await response.text().catch(() => '');
        throw new Error(details || `Request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
};

export interface GeneralSettings {
    timezone: string;
    language: string;
    dateFormat: string;
    currency: string;
}

export interface ReplyGenerationSettings {
    googleApiKey: string;
    claudeApiKey: string;
    selectedModel: string;
    similarReviewsCount: number;
    googleRequestCount: number;
    claudeRequestCount: number;
    googleTokenUsage: number;
    claudeTokenUsage: number;
    useEmbeddingRules: boolean;
    useSimilarReviews: boolean;
}

export interface ReplyGenerationApiTestPayload {
    provider: 'google' | 'claude';
    apiKey: string;
    model: string;
}

export interface ReplyGenerationApiTestResponse {
    provider: 'google' | 'claude';
    success: boolean;
    message: string;
}

export const getStoredSystemTimezone = (): string => {
    return localStorage.getItem(SYSTEM_TIMEZONE_STORAGE_KEY) || 'UTC';
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
        const settings = await requestJson<GeneralSettings>('/api/settings/general', { method: 'GET' });
        applySystemTimezone(settings.timezone);
        return settings;
    },

    async updateGeneralSettings(payload: GeneralSettings): Promise<GeneralSettings> {
        const settings = await requestJson<GeneralSettings>('/api/settings/general', {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
        applySystemTimezone(settings.timezone);
        return settings;
    },

    async getReplyGenerationSettings(): Promise<ReplyGenerationSettings> {
        return requestJson<ReplyGenerationSettings>('/api/settings/reply-generation', { method: 'GET' });
    },

    async updateReplyGenerationSettings(payload: ReplyGenerationSettings): Promise<ReplyGenerationSettings> {
        const requestPayload = {
            googleApiKey: payload.googleApiKey,
            claudeApiKey: payload.claudeApiKey,
            selectedModel: payload.selectedModel,
            similarReviewsCount: payload.similarReviewsCount,
            useEmbeddingRules: payload.useEmbeddingRules,
            useSimilarReviews: payload.useSimilarReviews,
        };

        return requestJson<ReplyGenerationSettings>('/api/settings/reply-generation', {
            method: 'PATCH',
            body: JSON.stringify(requestPayload),
        });
    },

    async testReplyGenerationApiKey(payload: ReplyGenerationApiTestPayload): Promise<ReplyGenerationApiTestResponse> {
        return requestJson<ReplyGenerationApiTestResponse>('/api/settings/reply-generation/test', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },
};
