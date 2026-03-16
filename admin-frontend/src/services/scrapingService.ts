import type { ScrapingJob, ScrapingPlatform, ScrapingStats } from '../types';

const DEFAULT_MAIN_BACKEND_URL = import.meta.env.VITE_MAIN_BACKEND_URL || 'http://localhost:8000';

const getBaseUrl = (): string => {
    const stored = localStorage.getItem('mainBackendUrl');
    return (stored || DEFAULT_MAIN_BACKEND_URL).replace(/\/$/, '');
};

interface CreateScrapingPlatformPayload {
    name: string;
    tableName: string;
    attributes: {
        name: string;
        type: string;
        nullable: boolean;
    }[];
    baseUrl?: string;
    enabled: boolean;
}

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(`${getBaseUrl()}${path}`, {
        headers: {
            'Content-Type': 'application/json',
        },
        method: 'GET',
        ...init,
    });

    if (!response.ok) {
        let detail = `Request failed: ${response.status}`;
        try {
            const body = await response.json() as { detail?: string };
            if (body?.detail) {
                detail = body.detail;
            }
        } catch {
            // Keep default message if response is not JSON.
        }
        throw new Error(detail);
    }

    return response.json() as Promise<T>;
};

export const fetchScrapingStats = (): Promise<ScrapingStats> => {
    return requestJson<ScrapingStats>('/monitoring/scraping/stats');
};

export const fetchScrapingPlatforms = (): Promise<ScrapingPlatform[]> => {
    return requestJson<ScrapingPlatform[]>('/monitoring/scraping/platforms');
};

export const fetchScrapingJobs = (): Promise<ScrapingJob[]> => {
    return requestJson<ScrapingJob[]>('/monitoring/scraping/jobs');
};

export const createScrapingPlatform = (payload: CreateScrapingPlatformPayload): Promise<ScrapingPlatform> => {
    return requestJson<ScrapingPlatform>('/monitoring/scraping/platforms', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
};

export const deleteScrapingPlatform = (platformId: string): Promise<{ status: string; id: string; name: string }> => {
    return requestJson(`/monitoring/scraping/platforms/${encodeURIComponent(platformId)}`, {
        method: 'DELETE',
    });
};

export const toggleScrapingPlatform = (platformId: string): Promise<{ id: string; name: string; enabled: boolean; status: 'active' | 'maintenance' }> => {
    return requestJson(`/monitoring/scraping/platforms/${encodeURIComponent(platformId)}/toggle`, {
        method: 'PATCH',
    });
};

// ── File upload goes directly to the scraping backend (not admin-backend) ──

const DEFAULT_SCRAPING_BACKEND_URL = import.meta.env.VITE_SCRAPING_URL || 'http://localhost:8002';

const getScrapingBackendUrl = (): string => {
    const stored = localStorage.getItem('scrapingBackendUrl');
    return (stored || DEFAULT_SCRAPING_BACKEND_URL).replace(/\/$/, '');
};

export const uploadPlatformScript = async (
    platformId: string,
    platformName: string,
    file: File,
): Promise<{ status: string }> => {
    const formData = new FormData();
    formData.append('platform_id', platformId);
    formData.append('platform_name', platformName);
    formData.append('file', file);

    const url = `${getScrapingBackendUrl()}/api/v1/sources/${encodeURIComponent(platformName)}/upload`;
    const response = await fetch(url, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        let detail = `Upload failed: ${response.status}`;
        try {
            const body = await response.json() as { detail?: string };
            if (body?.detail) {
                detail = body.detail;
            }
        } catch {
            // Keep default message.
        }
        throw new Error(detail);
    }

    return response.json() as Promise<{ status: string }>;
};
