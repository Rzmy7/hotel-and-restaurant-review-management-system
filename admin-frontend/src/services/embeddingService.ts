/**
 * API Service for Embedding Service Configuration
 */

const DEFAULT_EMBEDDING_SERVICE_URL = import.meta.env.VITE_EMBEDDING_SERVICE_URL || 'http://localhost:8001';
const STORAGE_KEY = 'embeddingServiceUrl';

/**
 * Get the current embedding service URL (from localStorage or default)
 */
const getBaseUrl = (): string => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored || DEFAULT_EMBEDDING_SERVICE_URL;
};

/**
 * Set the embedding service URL
 */
export const setEmbeddingServiceUrl = (url: string): void => {
    localStorage.setItem(STORAGE_KEY, url);
};

/**
 * Reset to default embedding service URL
 */
export const resetEmbeddingServiceUrl = (): void => {
    localStorage.removeItem(STORAGE_KEY);
};

export interface SimilarityThresholds {
    oneWord: number;
    twoWords: number;
    threeOrMore: number;
}

export interface EmbeddingJob {
    id: string;
    jobId: string;
    type: 'Review' | 'Regulation';
    status: 'Completed' | 'Failed' | 'Running';
    progress: number;
    duration: string;
    timestamp: string;
}

export interface APISettings {
    model: string;
    geminiApiKey: string;
    embeddingServiceUrl: string;
}

export interface VectorDbStats {
    totalVectors: number;
    namespace: string;
    dimensions: number;
    indexType: string;
    storage: string;
    isHealthy: boolean;
}

/**
 * Get current similarity thresholds
 */
export const getThresholds = async (): Promise<SimilarityThresholds> => {
    try {
        const response = await fetch(`${getBaseUrl()}/thresholds`);
        if (!response.ok) {
            throw new Error('Failed to fetch thresholds');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching thresholds:', error);
        throw error;
    }
};

/**
 * Update similarity thresholds
 */
export const updateThresholds = async (thresholds: SimilarityThresholds): Promise<void> => {
    try {
        const response = await fetch(`${getBaseUrl()}/thresholds`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(thresholds),
        });

        if (!response.ok) {
            throw new Error('Failed to update thresholds');
        }
    } catch (error) {
        console.error('Error updating thresholds:', error);
        throw error;
    }
};

/**
 * Reset thresholds to default values
 */
export const resetThresholds = async (): Promise<SimilarityThresholds> => {
    try {
        const response = await fetch(`${getBaseUrl()}/thresholds/reset`, {
            method: 'POST',
        });

        if (!response.ok) {
            throw new Error('Failed to reset thresholds');
        }

        const data = await response.json();
        return data.thresholds;
    } catch (error) {
        console.error('Error resetting thresholds:', error);
        throw error;
    }
};

/**
 * Get current embedding model
 */
export const getModel = async (): Promise<string> => {
    try {
        const response = await fetch(`${getBaseUrl()}/model`);
        if (!response.ok) {
            throw new Error('Failed to fetch model');
        }
        const data = await response.json();
        return data.model;
    } catch (error) {
        console.error('Error fetching model:', error);
        throw error;
    }
};

/**
 * Change embedding model
 */
export const changeModel = async (model: string): Promise<void> => {
    try {
        const response = await fetch(`${getBaseUrl()}/model`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ model }),
        });

        if (!response.ok) {
            throw new Error('Failed to change model');
        }
    } catch (error) {
        console.error('Error changing model:', error);
        throw error;
    }
};

/**
 * Get recent embedding jobs
 */
export const getRecentJobs = async (limit: number = 10): Promise<EmbeddingJob[]> => {
    try {
        const response = await fetch(`${getBaseUrl()}/jobs/recent?limit=${limit}`);
        if (!response.ok) {
            throw new Error('Failed to fetch jobs');
        }
        const data = await response.json();
        return data.jobs;
    } catch (error) {
        console.error('Error fetching jobs:', error);
        throw error;
    }
};

/**
 * Get API settings
 */
export const getAPISettings = async (): Promise<APISettings> => {
    try {
        const response = await fetch(`${getBaseUrl()}/api-settings`);
        if (!response.ok) {
            throw new Error('Failed to fetch API settings');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching API settings:', error);
        throw error;
    }
};

/**
 * Update API settings
 */
export const updateAPISettings = async (settings: Partial<APISettings>): Promise<void> => {
    try {
        const response = await fetch(`${getBaseUrl()}/api-settings`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(settings),
        });

        if (!response.ok) {
            throw new Error('Failed to update API settings');
        }
    } catch (error) {
        console.error('Error updating API settings:', error);
        throw error;
    }
};

/**
 * Get vector database statistics
 */
export const getDatabaseStats = async (): Promise<VectorDbStats> => {
    try {
        const response = await fetch(`${getBaseUrl()}/database/stats`);
        if (!response.ok) {
            throw new Error('Failed to fetch database stats');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching database stats:', error);
        throw error;
    }
};

/**
 * Re-index all vectors in the database using the current model
 */
export const reindexDatabase = async (): Promise<{ vectorsReindexed: number; message: string }> => {
    try {
        const response = await fetch(`${getBaseUrl()}/database/reindex`, {
            method: 'POST',
        });
        if (!response.ok) {
            throw new Error('Failed to re-index database');
        }
        return await response.json();
    } catch (error) {
        console.error('Error re-indexing database:', error);
        throw error;
    }
};

/**
 * Clear all vectors from the database (for re-indexing)
 */
export const clearDatabase = async (): Promise<{ vectorsRemoved: number; message: string }> => {
    try {
        const response = await fetch(`${getBaseUrl()}/database/clear`, {
            method: 'POST',
        });
        if (!response.ok) {
            throw new Error('Failed to clear database');
        }
        return await response.json();
    } catch (error) {
        console.error('Error clearing database:', error);
        throw error;
    }
};
