const DEFAULT_MAIN_BACKEND_URL =
    import.meta.env.VITE_MAIN_BACKEND_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    'http://localhost:8000';

const getBaseUrl = (): string => {
    const stored = localStorage.getItem('mainBackendUrl');
    return (stored || DEFAULT_MAIN_BACKEND_URL).replace(/\/$/, '');
};

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(`${getBaseUrl()}${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers || {}),
        },
    });

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
};

export interface MaintenanceStatusResponse {
    maintenanceMode: boolean;
}

export const maintenanceService = {
    async getStatus(): Promise<MaintenanceStatusResponse> {
        return requestJson<MaintenanceStatusResponse>('/api/maintenance/status', { method: 'GET' });
    },
};
