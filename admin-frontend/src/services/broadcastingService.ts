import { apiClient } from '../api/client';
import type { BroadcastRecord, ComposeForm } from '../components/Broadcasting/types';

export const broadcastingService = {
    async getHistory(): Promise<BroadcastRecord[]> {
        return apiClient.get<BroadcastRecord[]>('/admin/broadcasting/history');
    },

    async sendBroadcast(form: ComposeForm): Promise<{ success: boolean; broadcastId: string; message: string }> {
        return apiClient.post<{ success: boolean; broadcastId: string; message: string }>('/admin/broadcasting/send', form);
    },

    async getBroadcastDetail(broadcastId: string): Promise<BroadcastRecord> {
        return apiClient.get<BroadcastRecord>(`/admin/broadcasting/${encodeURIComponent(broadcastId)}`);
    },

    async getEstimatedRecipients(audienceType: string, audienceValue?: string): Promise<number> {
        const params = new URLSearchParams();
        params.append('audienceType', audienceType);
        if (audienceValue) params.append('audienceValue', audienceValue);

        const result = await apiClient.get<{ count: number }>(`/admin/broadcasting/estimate-recipients?${params}`);
        return result.count;
    },

    async getStatistics(): Promise<{ total: number; sent: number; scheduled: number; failed: number }> {
        return apiClient.get<{ total: number; sent: number; scheduled: number; failed: number }>('/admin/broadcasting/statistics');
    },

    async resendBroadcast(broadcastId: string): Promise<{ success: boolean; message: string }> {
        return apiClient.post<{ success: boolean; message: string }>(`/admin/broadcasting/${encodeURIComponent(broadcastId)}/resend`, {});
    },

    async cancelBroadcast(broadcastId: string): Promise<{ success: boolean; message: string }> {
        return apiClient.post<{ success: boolean; message: string }>(`/admin/broadcasting/${encodeURIComponent(broadcastId)}/cancel`, {});
    },
};
