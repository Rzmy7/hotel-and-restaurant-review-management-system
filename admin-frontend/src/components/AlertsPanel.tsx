import React from 'react';
import { AlertCircle, AlertTriangle, Info, X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { SystemAlert } from '../types';

interface AlertsPanelProps {
    alerts: SystemAlert[];
    onDismiss?: (id: string) => void;
    onViewAll?: () => void;
}

/**
 * Format an ISO timestamp string into a human-friendly relative label.
 */
function formatRelativeTime(timestamp: string): string {
    try {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffSec < 60) return 'Just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHour < 24) return `${diffHour}h ago`;
        if (diffDay < 7) return `${diffDay}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
        return timestamp;
    }
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts, onDismiss, onViewAll }) => {
    const getAlertIcon = (type: SystemAlert['type']) => {
        switch (type) {
            case 'error':
                return <AlertCircle className="text-red-500" size={16} />;
            case 'warning':
                return <AlertTriangle className="text-amber-500" size={16} />;
            case 'info':
                return <Info className="text-blue-500" size={16} />;
        }
    };

    const getAlertAccent = (type: SystemAlert['type']) => {
        switch (type) {
            case 'error':
                return 'border-l-red-400 bg-red-50/50';
            case 'warning':
                return 'border-l-amber-400 bg-amber-50/50';
            case 'info':
                return 'border-l-blue-400 bg-blue-50/50';
        }
    };

    const getAlertBadge = (type: SystemAlert['type']) => {
        switch (type) {
            case 'error':
                return (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                        Error
                    </span>
                );
            case 'warning':
                return (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                        Warning
                    </span>
                );
            case 'info':
                return (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                        Info
                    </span>
                );
        }
    };

    const unreadCount = alerts.filter((a) => !a.isRead).length;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-md hover:border-gray-200 transition-all duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-red-50">
                        <ShieldAlert size={18} className="text-red-500" />
                    </div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">System Alerts</h3>
                        {unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                </div>
                {onViewAll && (
                    <button
                        onClick={onViewAll}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                        View All
                    </button>
                )}
            </div>

            {/* Alerts List */}
            <div className="divide-y divide-gray-50 max-h-[360px] overflow-y-auto flex-1">
                {alerts.length === 0 ? (
                    <div className="px-5 py-10 text-center text-gray-400">
                        <CheckCircle2 size={28} className="mx-auto mb-2 text-emerald-300" />
                        <p className="text-sm font-medium text-gray-500">All Systems Operational</p>
                        <p className="text-xs text-gray-400 mt-1">No active alerts — everything is running normally</p>
                    </div>
                ) : (
                    alerts.slice(0, 5).map((alert) => (
                        <div
                            key={alert.id}
                            className={`px-5 py-3.5 flex items-start gap-3 border-l-2 transition-colors ${getAlertAccent(alert.type)} ${!alert.isRead ? 'bg-opacity-100' : 'bg-opacity-0 border-l-transparent'}`}
                        >
                            <div className="flex-shrink-0 mt-0.5">
                                {getAlertIcon(alert.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p
                                            className={`text-sm text-gray-900 ${!alert.isRead ? 'font-semibold' : 'font-medium'}`}
                                        >
                                            {alert.title}
                                        </p>
                                        {getAlertBadge(alert.type)}
                                    </div>
                                    {onDismiss && (
                                        <button
                                            onClick={() => onDismiss(alert.id)}
                                            className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-0.5 rounded hover:bg-gray-100 transition-colors"
                                            title="Dismiss alert"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                                <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                                    {alert.message}
                                </p>
                                <p className="text-[11px] text-gray-400 mt-1.5">
                                    {formatRelativeTime(alert.timestamp)}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
