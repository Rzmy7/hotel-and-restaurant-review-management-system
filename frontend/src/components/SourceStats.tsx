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
            color: 'text-[#4e80ee]',
            bg: 'bg-blue-50',
            border: 'hover:border-blue-200'
        },
        {
            label: 'Active Channels',
            value: stats.activeSources,
            icon: Activity,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            border: 'hover:border-emerald-200'
        },
        {
            label: 'Paused Tracks',
            value: stats.pausedSources,
            icon: PauseCircle,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            border: 'hover:border-amber-200'
        },
        {
            label: 'Sync Errors',
            value: stats.errorSources,
            icon: AlertCircle,
            color: 'text-rose-600',
            bg: 'bg-rose-50',
            border: 'hover:border-rose-200'
        },
        {
            label: 'Reviews Fetched',
            value: stats.totalReviewsFetched.toLocaleString(),
            icon: RefreshCw,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
            border: 'hover:border-indigo-200'
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {cards.map((card, index) => (
                <div
                    key={index}
                    className={`bg-white p-5 rounded-xl border border-gray-100 transition-all duration-300 hover:shadow-lg hover:shadow-gray-200/40 hover:-translate-y-0.5 group ${card.border} relative overflow-hidden`}
                >
                    <div className="flex justify-between items-center mb-4">
                        <div className={`w-10 h-10 flex items-center justify-center rounded-xl ${card.bg} ${card.color} transition-transform duration-300 group-hover:scale-110 shadow-sm border border-transparent`}>
                            <card.icon size={20} />
                        </div>
                        {index === 1 && !isLoading && (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100/50">
                                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                                Live
                            </div>
                        )}
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{card.label}</p>
                        {isLoading ? (
                            <div className="h-8 w-16 bg-gray-50 animate-pulse rounded-lg" />
                        ) : (
                            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{card.value}</h3>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SourceStats;
