interface FeatureFlag {
    key: string;
    status: 'Enabled' | 'Disabled';
}

import { getApiBaseUrl } from '../config/api';

const getBaseUrl = (): string => getApiBaseUrl();

export const featureFlagService = {
    async isContentSearchEnabled(): Promise<boolean> {
        try {
            const response = await fetch(`${getBaseUrl()}/api/settings/feature-flags`);
            if (!response.ok) {
                return false;
            }

            const flags = (await response.json()) as FeatureFlag[];
            const target = flags.find((flag) => flag.key === 'content_search_embeddings');

            if (!target) {
                return false;
            }

            return target.status === 'Enabled';
        } catch {
            return false;
        }
    },
};
