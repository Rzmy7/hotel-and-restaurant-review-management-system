import React from 'react';
import { AlertsPanel } from './AlertsPanel';
import { RecentActivity } from './RecentActivity';
import type { SystemAlert, RecentActivity as RecentActivityType } from '../types';
import { useSystemTimezone } from '../hooks/useSystemTimezone';

interface DashboardSidebarProps {
    alerts: SystemAlert[];
    activities: RecentActivityType[];
    onDismissAlert: (id: string) => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ 
    alerts, 
    activities, 
    onDismissAlert 
}) => {
    const systemTimezone = useSystemTimezone();

    return (
        <div className="space-y-6">
            {/* Alerts Panel */}
            <AlertsPanel 
                alerts={alerts} 
                timezone={systemTimezone}
                onDismiss={onDismissAlert}
            />

            {/* Recent Activity */}
            <RecentActivity activities={activities} timezone={systemTimezone} />
        </div>
    );
};
