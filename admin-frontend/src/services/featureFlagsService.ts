import type { FeatureFlag } from '../types';

const DEFAULT_MAIN_BACKEND_URL = import.meta.env.VITE_MAIN_BACKEND_URL || 'http://localhost:8000';

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

export const featureFlagsService = {
    async getFeatureFlags(): Promise<FeatureFlag[]> {
        return requestJson<FeatureFlag[]>('/api/settings/feature-flags', { method: 'GET' });
    },

    async updateFeatureFlag(
        key: string,
        payload: { status: 'Enabled' | 'Disabled'; limit?: number }
    ): Promise<FeatureFlag> {
        return requestJson<FeatureFlag>(`/api/settings/feature-flags/${encodeURIComponent(key)}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
    },
};
