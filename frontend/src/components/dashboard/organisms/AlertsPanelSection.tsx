import React from 'react';
import { useDashboardAlerts } from '../../../hooks/useDashboardAlerts';
import { AlertsPanel } from './AlertsPanel';
import Skeleton from '../../shared/Skeleton';

const AlertsSkeleton: React.FC = () => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm animate-pulse space-y-4">
        <Skeleton className="w-1/4 h-5 rounded mb-4" />
        {[1, 2].map((i) => (
            <div key={i} className="flex gap-3 py-3 border-b border-gray-50 dark:border-slate-700 last:border-0">
                <Skeleton className="w-5 h-5 rounded flex-shrink-0" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="w-11/12 h-3 rounded" />
                    <Skeleton className="w-1/4 h-2 rounded" />
                </div>
            </div>
        ))}
    </div>
);

export const AlertsPanelSection: React.FC = () => {
    const { data: alerts, loading, error } = useDashboardAlerts();

    if (loading) {
        return <AlertsSkeleton />;
    }

    if (error) {
        return (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm flex items-center justify-center text-center">
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400">Failed to load alerts: {error}</p>
            </div>
        );
    }

    return <AlertsPanel alerts={alerts} />;
};

export default AlertsPanelSection;
