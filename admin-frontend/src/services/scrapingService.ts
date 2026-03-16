import type { ScrapingJob, ScrapingPlatform, ScrapingStats } from '../types';

const DEFAULT_MAIN_BACKEND_URL = import.meta.env.VITE_MAIN_BACKEND_URL || 'http://localhost:8000';

const getBaseUrl = (): string => {
    const stored = localStorage.getItem('mainBackendUrl');
    return (stored || DEFAULT_MAIN_BACKEND_URL).replace(/\/$/, '');
};

const requestJson = async <T>(path: string): Promise<T> => {
    const response = await fetch(`${getBaseUrl()}${path}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
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
