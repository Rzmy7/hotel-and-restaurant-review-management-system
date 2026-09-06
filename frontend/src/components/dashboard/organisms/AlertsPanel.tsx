import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { AlertCategory, AlertSeverity, AlertActionType } from '../../../types/dashboard';
import type { Alert, ReviewFilters, InsightFilters } from '../../../types/dashboard';
import { Card } from '../atoms/Card';
import { SectionHeader } from '../molecules/SectionHeader';

export interface AlertsPanelProps {
    alerts: Alert[];
}

const formatRelativeTime = (isoString: string): string => {
    try {
        const occurred = new Date(isoString);
        const now = new Date();
        const diffMs = now.getTime() - occurred.getTime();
        if (isNaN(diffMs)) return 'Recent';
        
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHr = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHr / 24);
        
        if (diffSec < 60) return 'Just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHr < 24) return `${diffHr}h ago`;
        if (diffDay === 1) return 'Yesterday';
        return `${diffDay} days ago`;
    } catch {
        return 'Recent';
    }
};

const getCategoryLabel = (category: AlertCategory): string => {
    switch (category) {
        case AlertCategory.REPUTATION:
            return '🚨 Reputation Risk';
        case AlertCategory.OPERATIONS:
            return '⏱️ Operations';
        case AlertCategory.TREND:
            return '📊 Performance Trends';
        default:
            return 'Alert';
    }
};

const buildNavigateUrl = (type: AlertActionType, filters?: ReviewFilters | InsightFilters): string => {
    if (type === AlertActionType.OPEN_INSIGHTS) {
        return '/insights';
    }
    
    // AlertActionType.VIEW_REVIEWS
    const params = new URLSearchParams();
    if (filters) {
        if ('status' in filters && filters.status) {
            params.append('status', filters.status);
        }
        if ('ratingMax' in filters && filters.ratingMax === 2) {
            params.append('rating', '1');
            params.append('rating', '2');
        }
        if ('keywords' in filters && filters.keywords && filters.keywords.length > 0) {
            params.set('q', filters.keywords[0]);
        }
    }
    const queryStr = params.toString();
    return queryStr ? `/reviews?${queryStr}` : '/reviews';
};

const getActionLabel = (type: AlertActionType): string => {
    switch (type) {
        case AlertActionType.VIEW_REVIEWS:
            return 'Respond Now';
        case AlertActionType.OPEN_INSIGHTS:
            return 'Open Insights';
        default:
            return 'View';
    }
};

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts }) => {
    const navigate = useNavigate();

    return (
        <Card hoverEffect className="shadow-sm p-6 flex flex-col" style={{ maxHeight: 380 }}>
            <SectionHeader
                title="System Alerts"
                subtitle="Operational Warnings"
                icon={<AlertTriangle size={18} />}
                iconClassName="bg-rose-50 text-rose-600 border border-rose-100/50"
                className="mb-8 items-center shrink-0"
            >
                <button
                    className="flex items-center gap-1 text-blue-600 font-bold text-xs hover:text-blue-700 transition-colors group/btn cursor-pointer bg-transparent border-none"
                    onClick={() => navigate('/notifications?filter=alert')}
                >
                    View All
                    <ChevronRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
                </button>
            </SectionHeader>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 -mr-2 no-scrollbar" style={{ maxHeight: 260 }}>
                {alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-6">
                        <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 m-0">No active alerts</p>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 m-0">Everything is running normally</p>
                    </div>
                ) : (
                    alerts.map((alert) => (
                        <div
                            key={alert.id}
                            className={`flex items-start gap-3 p-4 rounded-xl border transition-all hover:shadow-md group/item ${
                                alert.severity === AlertSeverity.CRITICAL
                                    ? 'bg-rose-50/20 border-rose-100/30 text-rose-900 hover:bg-rose-50/40 dark:bg-rose-900/10 dark:border-rose-900/30 dark:text-rose-200 dark:hover:bg-rose-900/20'
                                    : alert.severity === AlertSeverity.WARNING
                                        ? 'bg-amber-50/20 border-amber-100/30 text-amber-900 hover:bg-amber-50/40 dark:bg-amber-900/10 dark:border-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/20'
                                        : 'bg-blue-50/20 border-blue-100/30 text-blue-900 hover:bg-blue-50/40 dark:bg-blue-900/10 dark:border-blue-900/30 dark:text-blue-200 dark:hover:bg-blue-900/20'
                            }`}
                        >
                            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                alert.severity === AlertSeverity.CRITICAL
                                    ? 'bg-rose-500'
                                    : alert.severity === AlertSeverity.WARNING
                                        ? 'bg-amber-500'
                                        : 'bg-blue-500'
                            }`} />
                            <div className="flex-1 min-w-0">
                                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block mb-1">
                                    {getCategoryLabel(alert.category)}
                                </span>
                                <p className="m-0 text-[13px] font-bold leading-tight group-hover/item:translate-x-0.5 transition-transform">
                                    {alert.title}
                                </p>
                                <p className="m-0 mt-1 text-xs opacity-75 leading-snug">
                                    {alert.message}
                                </p>
                                <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
                                    <p className="m-0 text-[9px] font-black opacity-50 uppercase tracking-widest">
                                        {formatRelativeTime(alert.occurred_at)}
                                    </p>
                                    {alert.action && alert.action.type && (
                                        <button
                                            onClick={() => navigate(buildNavigateUrl(alert.action.type, alert.action.filters))}
                                            className={`px-2.5 py-1 text-[10px] font-bold rounded-md border transition-all cursor-pointer inline-flex items-center gap-0.5 hover:shadow hover:-translate-y-0.5 active:scale-95 ${
                                                alert.severity === AlertSeverity.CRITICAL
                                                    ? 'bg-rose-500 text-white border-transparent hover:bg-rose-600'
                                                    : alert.severity === AlertSeverity.WARNING
                                                        ? 'bg-amber-500 text-white border-transparent hover:bg-amber-600'
                                                        : 'bg-blue-500 text-white border-transparent hover:bg-blue-600'
                                            }`}
                                        >
                                            {getActionLabel(alert.action.type)}
                                            <ChevronRight size={10} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Card>
    );
};

export default AlertsPanel;
