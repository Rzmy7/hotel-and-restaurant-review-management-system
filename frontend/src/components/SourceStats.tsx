import React from 'react';
import { Database, Activity, PauseCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { SourceStats as SourceStatsType } from '../types/sources';

interface SourceStatsProps {
    stats: SourceStatsType;
    isLoading?: boolean;
}

const SourceStats: React.FC<SourceStatsProps> = ({ stats, isLoading }) => {
    const cards = [
        {
            label: 'Total Sources',
            value: stats.totalSources,
            icon: Database,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
        },
        {
            label: 'Active',
            value: stats.activeSources,
            icon: Activity,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
        },
        {
            label: 'Paused',
            value: stats.pausedSources,
            icon: PauseCircle,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
        },
        {
            label: 'Errors',
            value: stats.errorSources,
            icon: AlertCircle,
            color: 'text-rose-600',
            bg: 'bg-rose-50',
        },
        {
            label: 'Total Fetched',
            value: stats.totalReviewsFetched.toLocaleString(),
            icon: RefreshCw,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {cards.map((card, index) => (
                <div
                    key={index}
                    className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md hover:border-blue-100 group"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className={`p-2 rounded-lg ${card.bg} ${card.color} group-hover:scale-110 transition-transform`}>
                            <card.icon size={20} />
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">{card.label}</p>
                        {isLoading ? (
                            <div className="h-8 w-16 bg-gray-100 animate-pulse rounded" />
                        ) : (
                            <h3 className="text-2xl font-bold text-gray-900 leading-none">{card.value}</h3>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SourceStats;
