import React, { useEffect, useState } from 'react';
import { X, ShieldAlert, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { SystemAlert } from '../types';
import { fetchPaginatedAlerts } from '../services/dashboardService';
import { Pagination } from './Pagination';
import { LoadingSpinner } from './LoadingSpinner';
import { formatDateTime } from '../utils/dateTime';

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
            return 'border-l-red-400 bg-red-50/50 dark:bg-red-900/10';
        case 'warning':
            return 'border-l-amber-400 bg-amber-50/50 dark:bg-amber-900/10';
        case 'info':
            return 'border-l-blue-400 bg-blue-50/50 dark:bg-blue-900/10';
    }
};

const getAlertBadge = (type: SystemAlert['type']) => {
    switch (type) {
        case 'error':
            return (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">
                    Error
                </span>
            );
        case 'warning':
            return (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                    Warning
                </span>
            );
        case 'info':
            return (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                    Info
                </span>
            );
    }
};

/**
 * Format an ISO timestamp string into a human-friendly relative label.
 */
function formatRelativeTime(timestamp: string, timezone: string): string {
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
        return formatDateTime(timestamp, timezone);
    } catch {
        return timestamp;
    }
}

interface AllAlertsModalProps {
    isOpen: boolean;
    onClose: () => void;
    timezone: string;
}

export const AllAlertsModal: React.FC<AllAlertsModalProps> = ({ isOpen, onClose, timezone }) => {
    const [alerts, setAlerts] = useState<SystemAlert[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const limit = 10;

    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        const loadAlerts = async () => {
            setLoading(true);
            try {
                const response = await fetchPaginatedAlerts(page, limit);
                if (isMounted) {
                    setAlerts(response.data);
                    setTotal(response.total);
                }
            } catch (error) {
                console.error('Failed to load paginated alerts:', error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadAlerts();

        return () => {
            isMounted = false;
        };
    }, [isOpen, page]);

    if (!isOpen) return null;

    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-100 dark:border-slate-700">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/30">
                            <ShieldAlert size={20} className="text-red-500 dark:text-red-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">System Alerts</h2>
                            <p className="text-sm text-gray-500 dark:text-slate-400">All system events and warnings</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="py-20 flex justify-center">
                            <LoadingSpinner size={32} />
                        </div>
                    ) : alerts.length === 0 ? (
                        <div className="py-20 text-center text-gray-400 dark:text-slate-500">
                            <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-300 dark:text-emerald-500" />
                            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">All Systems Operational</p>
                            <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">No active alerts — everything is running normally</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50 dark:divide-slate-700/50">
                            {alerts.map((alert) => (
                                <div
                                    key={alert.id}
                                    className={`p-4 flex items-start gap-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors rounded-lg mx-2 my-1 border-l-2 ${getAlertAccent(alert.type)} ${!alert.isRead ? 'bg-opacity-100' : 'bg-opacity-0 border-l-transparent'}`}
                                >
                                    <div className="flex-shrink-0 mt-0.5">
                                        {getAlertIcon(alert.type)}
                                    </div>
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p
                                                    className={`text-sm text-gray-900 dark:text-white ${!alert.isRead ? 'font-semibold' : 'font-medium'}`}
                                                >
                                                    {alert.title}
                                                </p>
                                                {getAlertBadge(alert.type)}
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                                            {alert.message}
                                        </p>
                                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
                                            {formatRelativeTime(alert.timestamp, timezone)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer with Pagination */}
                <div className="mt-auto">
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        totalItems={total}
                        itemsPerPage={limit}
                        startIndex={startIndex}
                        onPageChange={setPage}
                        itemLabel="alerts"
                    />
                </div>
            </div>
        </div>
    );
};
