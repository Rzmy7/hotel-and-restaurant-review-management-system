import React from 'react';
import { AlertsPanel } from './AlertsPanel';
import { RecentActivity } from './RecentActivity';
import type { SystemAlert, RecentActivity as RecentActivityType } from '../types';

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
    return (
        <div className="space-y-6">
            {/* Alerts Panel */}
            <AlertsPanel 
                alerts={alerts} 
                onDismiss={onDismissAlert}
            />

            {/* Recent Activity */}
            <RecentActivity activities={activities} />
        </div>
    );
};
