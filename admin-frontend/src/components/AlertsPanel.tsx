import React from 'react';
import { AlertCircle, AlertTriangle, Info, X, Bell } from 'lucide-react';
import type { SystemAlert } from '../types';

interface AlertsPanelProps {
    alerts: SystemAlert[];
    onDismiss?: (id: string) => void;
    onViewAll?: () => void;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts, onDismiss, onViewAll }) => {
    const getAlertIcon = (type: SystemAlert['type']) => {
        switch (type) {
            case 'error':
                return <AlertCircle className="text-red-500" size={18} />;
            case 'warning':
                return <AlertTriangle className="text-amber-500" size={18} />;
            case 'info':
                return <Info className="text-blue-500" size={18} />;
        }
    };

    const getAlertBgColor = (type: SystemAlert['type']) => {
        switch (type) {
            case 'error':
                return 'bg-red-50 border-red-200';
            case 'warning':
                return 'bg-amber-50 border-amber-200';
            case 'info':
                return 'bg-blue-50 border-blue-200';
        }
    };

    const unreadCount = alerts.filter(a => !a.isRead).length;

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <Bell size={20} className="text-gray-600" />
                    <h3 className="font-semibold text-gray-900">System Alerts</h3>
                    {unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                            {unreadCount}
                        </span>
                    )}
                </div>
                {onViewAll && (
                    <button 
                        onClick={onViewAll}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                        View All
                    </button>
                )}
            </div>
            <div className="divide-y divide-gray-100 max-h-[320px] overflow-y-auto">
                {alerts.length === 0 ? (
                    <div className="px-5 py-8 text-center text-gray-500">
                        <Bell size={32} className="mx-auto mb-2 text-gray-300" />
                        <p>No active alerts</p>
                    </div>
                ) : (
                    alerts.slice(0, 5).map((alert) => (
                        <div 
                            key={alert.id} 
                            className={`px-5 py-3 flex items-start gap-3 ${!alert.isRead ? 'bg-gray-50' : ''}`}
                        >
                            <div className={`flex-shrink-0 p-1.5 rounded-full border ${getAlertBgColor(alert.type)}`}>
                                {getAlertIcon(alert.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <p className={`text-sm font-medium text-gray-900 ${!alert.isRead ? 'font-semibold' : ''}`}>
                                        {alert.title}
                                    </p>
                                    {onDismiss && (
                                        <button 
                                            onClick={() => onDismiss(alert.id)}
                                            className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-0.5"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                                <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                                    {alert.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {alert.timestamp}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
