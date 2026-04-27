import { useEffect } from 'react';
import { maintenanceService, emitMaintenanceModeUpdated } from '../services/maintenanceService';

const POLLING_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Hook that polls maintenance mode status on component mount and every 5 minutes.
 * Emits custom event when status changes.
 * 
 * Should be used in a top-level component (like MainLayout) to ensure
 * maintenance mode is checked app-wide.
 */
export const useMaintenanceModePoller = () => {
    useEffect(() => {
        let pollInterval: ReturnType<typeof setInterval> | null = null;
        let lastKnownStatus: boolean | null = null;

        const checkMaintenanceStatus = async () => {
            try {
                const status = await maintenanceService.getStatus();
                
                // Emit event if status changed
                if (lastKnownStatus !== null && lastKnownStatus !== status.maintenanceMode) {
                    emitMaintenanceModeUpdated(status.maintenanceMode);
                }
                
                lastKnownStatus = status.maintenanceMode;
            } catch (error) {
                console.error('Failed to check maintenance status:', error);
            }
        };

        // Check immediately on component mount
        checkMaintenanceStatus();

        // Set up polling every 5 minutes
        pollInterval = setInterval(checkMaintenanceStatus, POLLING_INTERVAL_MS);

        // Cleanup
        return () => {
            if (pollInterval) {
                clearInterval(pollInterval);
            }
        };
    }, []);
};
