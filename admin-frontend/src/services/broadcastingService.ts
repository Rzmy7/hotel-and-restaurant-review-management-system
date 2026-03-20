import type { BroadcastRecord, ComposeForm } from './types';

const API_BASE = 'http://localhost:8000/api/broadcasting'; // TODO: Replace with actual API server

export const broadcastingService = {
    // Get all broadcast history
    async getHistory(): Promise<BroadcastRecord[]> {
        try {
            const response = await fetch(`${API_BASE}/history`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) throw new Error(`Failed to fetch history: ${response.status}`);
            return response.json();
        } catch (error) {
            console.error('Error fetching broadcast history:', error);
            throw error;
        }
    },

    // Send a broadcast
    async sendBroadcast(form: ComposeForm): Promise<{ success: boolean; broadcastId: string; message: string }> {
        try {
            const response = await fetch(`${API_BASE}/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (!response.ok) throw new Error(`Failed to send broadcast: ${response.status}`);
            return response.json();
        } catch (error) {
            console.error('Error sending broadcast:', error);
            throw error;
        }
    },

    // Get broadcast detail
    async getBroadcastDetail(broadcastId: string): Promise<BroadcastRecord> {
        try {
            const response = await fetch(`${API_BASE}/${broadcastId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) throw new Error(`Failed to fetch broadcast detail: ${response.status}`);
            return response.json();
        } catch (error) {
            console.error('Error fetching broadcast detail:', error);
            throw error;
        }
    },

    // Get estimated recipient count for audience
    async getEstimatedRecipients(audienceType: string, audienceValue?: string): Promise<{ count: number }> {
        try {
            const params = new URLSearchParams();
            params.append('audienceType', audienceType);
            if (audienceValue) params.append('audienceValue', audienceValue);

            const response = await fetch(`${API_BASE}/estimate-recipients?${params}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) throw new Error(`Failed to estimate recipients: ${response.status}`);
            return response.json();
        } catch (error) {
            console.error('Error estimating recipients:', error);
            throw error;
        }
    },

    // Get broadcast statistics
    async getStatistics(): Promise<{ total: number; sent: number; scheduled: number; failed: number }> {
        try {
            const response = await fetch(`${API_BASE}/statistics`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) throw new Error(`Failed to fetch statistics: ${response.status}`);
            return response.json();
        } catch (error) {
            console.error('Error fetching broadcast statistics:', error);
            throw error;
        }
    },

    // Resend a scheduled broadcast
    async resendBroadcast(broadcastId: string): Promise<{ success: boolean; message: string }> {
        try {
            const response = await fetch(`${API_BASE}/${broadcastId}/resend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) throw new Error(`Failed to resend broadcast: ${response.status}`);
            return response.json();
        } catch (error) {
            console.error('Error resending broadcast:', error);
            throw error;
        }
    },

    // Cancel a scheduled broadcast
    async cancelBroadcast(broadcastId: string): Promise<{ success: boolean; message: string }> {
        try {
            const response = await fetch(`${API_BASE}/${broadcastId}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) throw new Error(`Failed to cancel broadcast: ${response.status}`);
            return response.json();
        } catch (error) {
            console.error('Error canceling broadcast:', error);
            throw error;
        }
    },
};
