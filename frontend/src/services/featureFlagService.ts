interface FeatureFlag {
    key: string;
    status: 'Enabled' | 'Disabled';
}

const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const getBaseUrl = (): string => {
    const stored = localStorage.getItem('mainBackendUrl');
    return (stored || DEFAULT_API_BASE_URL).replace(/\/$/, '');
};

export const featureFlagService = {
    async isContentSearchEnabled(): Promise<boolean> {
        try {
            const response = await fetch(`${getBaseUrl()}/api/admin/settings/feature-flags`);
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
