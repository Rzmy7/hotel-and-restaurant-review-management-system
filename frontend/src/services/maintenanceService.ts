import { apiClient } from '../api/client';
 
export interface MaintenanceStatusResponse {
    maintenanceMode: boolean;
}
 
export const maintenanceService = {
    async getStatus(): Promise<MaintenanceStatusResponse> {
        // apiClient will handle the /api prefix and base URL automatically
        return apiClient.get<MaintenanceStatusResponse>('/maintenance/status');
    },
};
