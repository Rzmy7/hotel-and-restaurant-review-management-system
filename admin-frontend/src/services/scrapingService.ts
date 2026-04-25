import { apiClient } from '../api/client';
import type { ScrapingJob, ScrapingPlatform, ScrapingStats } from '../types';

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

interface UpdateScrapingPlatformPayload {
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

interface ScrapingPlatformDetailsResponse {
    id: string;
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

interface RawScrapingPlatformDetailsResponse {
    id?: string;
    name?: string;
    tableName?: string;
    table_name?: string;
    attributes?: Array<{
        name?: string;
        column_name?: string;
        type?: string;
        data_type?: string;
        nullable?: boolean;
        is_nullable?: boolean;
    }>;
    baseUrl?: string;
    base_url?: string;
    enabled?: boolean;
}

const normalizeTableAttributes = (attributes: RawScrapingPlatformDetailsResponse['attributes']) => {
    if (!Array.isArray(attributes)) {
        return [];
    }

    return attributes
        .map((attr) => ({
            name: String(attr.name ?? attr.column_name ?? '').trim(),
            type: String(attr.type ?? attr.data_type ?? '').trim(),
            nullable: typeof attr.nullable === 'boolean'
                ? attr.nullable
                : typeof attr.is_nullable === 'boolean'
                    ? attr.is_nullable
                    : true,
        }))
        .filter((attr) => attr.name || attr.type);
};

export const fetchScrapingStats = (): Promise<ScrapingStats> => {
    return apiClient.get<ScrapingStats>('/admin/monitoring/scraping/stats');
};

export const fetchScrapingPlatforms = (): Promise<ScrapingPlatform[]> => {
    return apiClient.get<ScrapingPlatform[]>('/admin/monitoring/scraping/platforms');
};

export const fetchScrapingJobs = (): Promise<ScrapingJob[]> => {
    return apiClient.get<ScrapingJob[]>('/admin/monitoring/scraping/jobs');
};

export const createScrapingPlatform = (payload: CreateScrapingPlatformPayload): Promise<ScrapingPlatform> => {
    return apiClient.post<ScrapingPlatform>('/admin/monitoring/scraping/platforms', payload);
};

export const fetchScrapingPlatformDetails = async (platformId: string): Promise<ScrapingPlatformDetailsResponse> => {
    const raw = await apiClient.get<RawScrapingPlatformDetailsResponse>(`/admin/monitoring/scraping/platforms/${encodeURIComponent(platformId)}`);
    return {
        id: String(raw.id ?? platformId),
        name: String(raw.name ?? ''),
        tableName: String(raw.tableName ?? raw.table_name ?? ''),
        attributes: normalizeTableAttributes(raw.attributes),
        baseUrl: String(raw.baseUrl ?? raw.base_url ?? ''),
        enabled: typeof raw.enabled === 'boolean' ? raw.enabled : true,
    };
};

export const updateScrapingPlatform = (platformId: string, payload: UpdateScrapingPlatformPayload): Promise<ScrapingPlatform> => {
    return apiClient.put<ScrapingPlatform>(`/admin/monitoring/scraping/platforms/${encodeURIComponent(platformId)}`, payload);
};

export const deleteScrapingPlatform = (platformId: string): Promise<{ status: string; id: string; name: string }> => {
    return apiClient.delete<{ status: string; id: string; name: string }>(`/admin/monitoring/scraping/platforms/${encodeURIComponent(platformId)}`);
};

export const toggleScrapingPlatform = (platformId: string): Promise<{ id: string; name: string; enabled: boolean; status: 'active' | 'maintenance' }> => {
    return apiClient.patch<{ id: string; name: string; enabled: boolean; status: 'active' | 'maintenance' }>(`/admin/monitoring/scraping/platforms/${encodeURIComponent(platformId)}/toggle`, {});
};

export const stopScrapingJob = (jobId: string): Promise<{ status: string; job_id: string }> => {
    return apiClient.post<{ status: string; job_id: string }>(`/admin/monitoring/scraping/jobs/${encodeURIComponent(jobId)}/cancel`, {});
};

// ── File upload goes directly to the scraping backend (not admin-backend) ──

const DEFAULT_SCRAPING_BACKEND_URL = import.meta.env.VITE_SCRAPING_URL || '';

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
