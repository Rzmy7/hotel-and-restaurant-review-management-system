interface FeatureFlag {
  key: string;
  status: "Enabled" | "Disabled";
}

import { getApiBaseUrl } from "../config/api";

const getBaseUrl = (): string => getApiBaseUrl();

async function fetchFlags(): Promise<FeatureFlag[]> {
  try {
    const response = await fetch(`${getBaseUrl()}/api/settings/feature-flags`);
    if (!response.ok) {
      return [];
    }
    return (await response.json()) as FeatureFlag[];
  } catch {
    return [];
  }
}

function isFlagEnabled(flags: FeatureFlag[], key: string): boolean {
  const target = flags.find((flag) => flag.key === key);
  return target ? target.status === "Enabled" : false;
}

export const featureFlagService = {
  async isContentSearchEnabled(): Promise<boolean> {
    const flags = await fetchFlags();
    return isFlagEnabled(flags, "content_search_embeddings");
  },

  async isDarkModeEnabled(): Promise<boolean> {
    const flags = await fetchFlags();
    return isFlagEnabled(flags, "dark_mode");
  },

    async is2faFeatureEnabled(): Promise<boolean> {
        const flags = await fetchFlags();
        return isFlagEnabled(flags, 'two_factor_auth');
    },

    async getAllFlags(): Promise<FeatureFlag[]> {
        return fetchFlags();
    },
};
