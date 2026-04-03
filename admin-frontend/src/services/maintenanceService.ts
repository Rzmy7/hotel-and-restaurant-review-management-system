import { apiClient } from '../api/client';

const MAINTENANCE_MODE_EVENT = 'maintenance-mode-updated';

export interface MaintenanceStatusResponse {
    maintenanceMode: boolean;
}

export interface MaintenanceUpdateResponse {
    success: boolean;
    maintenanceMode: boolean;
}

export const maintenanceService = {
    async getStatus(): Promise<MaintenanceStatusResponse> {
        return apiClient.get<MaintenanceStatusResponse>('/admin/maintenance/status');
    },

    async setStatus(maintenanceMode: boolean): Promise<MaintenanceUpdateResponse> {
        return apiClient.patch<MaintenanceUpdateResponse>('/admin/maintenance/status', { maintenanceMode });
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
