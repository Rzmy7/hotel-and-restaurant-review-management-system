import type { BroadcastRecord, ComposeForm } from '../components/Broadcasting/types';

const DEFAULT_MAIN_BACKEND_URL = import.meta.env.VITE_MAIN_BACKEND_URL || 'http://localhost:8000';

const getBaseUrl = (): string => {
    const stored = localStorage.getItem('mainBackendUrl');
    return (stored || DEFAULT_MAIN_BACKEND_URL).replace(/\/$/, '');
};

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(`${getBaseUrl()}${path}`, {
        headers: {
            'Content-Type': 'application/json',
        },
        ...init,
    });

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
};

export const broadcastingService = {
    async getHistory(): Promise<BroadcastRecord[]> {
        return requestJson<BroadcastRecord[]>('/api/broadcasting/history', { method: 'GET' });
    },

    async sendBroadcast(form: ComposeForm): Promise<{ success: boolean; broadcastId: string; message: string }> {
        return requestJson('/api/broadcasting/send', {
            method: 'POST',
            body: JSON.stringify(form),
        });
    },

    async getBroadcastDetail(broadcastId: string): Promise<BroadcastRecord> {
        return requestJson<BroadcastRecord>(`/api/broadcasting/${encodeURIComponent(broadcastId)}`, {
            method: 'GET',
        });
    },

    async getEstimatedRecipients(audienceType: string, audienceValue?: string): Promise<number> {
        const params = new URLSearchParams();
        params.append('audienceType', audienceType);
        if (audienceValue) params.append('audienceValue', audienceValue);

        const result = await requestJson<{ count: number }>(`/api/broadcasting/estimate-recipients?${params}`, {
            method: 'GET',
        });
        return result.count;
    },

    async getStatistics(): Promise<{ total: number; sent: number; scheduled: number; failed: number }> {
        return requestJson('/api/broadcasting/statistics', { method: 'GET' });
    },

    async resendBroadcast(broadcastId: string): Promise<{ success: boolean; message: string }> {
        return requestJson(`/api/broadcasting/${encodeURIComponent(broadcastId)}/resend`, {
            method: 'POST',
        });
    },

    async cancelBroadcast(broadcastId: string): Promise<{ success: boolean; message: string }> {
        return requestJson(`/api/broadcasting/${encodeURIComponent(broadcastId)}/cancel`, {
            method: 'POST',
        });
    },
};
