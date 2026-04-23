import { apiClient } from '../api/client';
import type { FeatureFlag } from '../types';

export const featureFlagsService = {
    async getFeatureFlags(): Promise<FeatureFlag[]> {
        return apiClient.get<FeatureFlag[]>('/admin/settings/feature-flags');
    },

    async updateFeatureFlag(
        key: string,
        payload: { status: 'Enabled' | 'Disabled'; limit?: number }
    ): Promise<FeatureFlag> {
        return apiClient.patch<FeatureFlag>(`/admin/settings/feature-flags/${encodeURIComponent(key)}`, payload);
    },
};
