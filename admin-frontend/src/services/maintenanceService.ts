const DEFAULT_MAIN_BACKEND_URL = import.meta.env.VITE_MAIN_BACKEND_URL || 'http://localhost:8000';
const MAINTENANCE_MODE_EVENT = 'maintenance-mode-updated';

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

export interface MaintenanceUpdateResponse {
    success: boolean;
    maintenanceMode: boolean;
}

export const maintenanceService = {
    async getStatus(): Promise<MaintenanceStatusResponse> {
        return requestJson<MaintenanceStatusResponse>('/api/maintenance/status', { method: 'GET' });
    },

    async setStatus(maintenanceMode: boolean): Promise<MaintenanceUpdateResponse> {
        return requestJson<MaintenanceUpdateResponse>('/api/maintenance/status', {
            method: 'PATCH',
            body: JSON.stringify({ maintenanceMode }),
        });
    },
};

export const emitMaintenanceModeUpdated = (maintenanceMode: boolean): void => {
    window.dispatchEvent(new CustomEvent<boolean>(MAINTENANCE_MODE_EVENT, { detail: maintenanceMode }));
};

export const onMaintenanceModeUpdated = (handler: (maintenanceMode: boolean) => void): (() => void) => {
    const listener: EventListener = (event) => {
        const customEvent = event as CustomEvent<boolean>;
        handler(!!customEvent.detail);
    };

    window.addEventListener(MAINTENANCE_MODE_EVENT, listener);
    return () => window.removeEventListener(MAINTENANCE_MODE_EVENT, listener);
};
