import React from 'react';
import { Database, Activity, PauseCircle, AlertCircle } from 'lucide-react';
import type { SourceStats as SourceStatsType } from '../../types/sources';

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
            color: 'text-[#4e80ee] dark:text-blue-400',
            bg: 'bg-blue-50 dark:bg-blue-900/40',
            border: 'hover:border-blue-200 dark:hover:border-blue-800'
        },
        {
            label: 'Active Sources',
            value: stats.activeSources,
            icon: Activity,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-50 dark:bg-emerald-900/40',
            border: 'hover:border-emerald-200 dark:hover:border-emerald-800'
        },
        {
            label: 'Paused Sources',
            value: stats.pausedSources,
            icon: PauseCircle,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-900/40',
            border: 'hover:border-amber-200 dark:hover:border-amber-800'
        },
        {
            label: 'Failed Updates',
            value: stats.errorSources,
            icon: AlertCircle,
            color: 'text-rose-600 dark:text-rose-400',
            bg: 'bg-rose-50 dark:bg-rose-900/40',
            border: 'hover:border-rose-200 dark:hover:border-rose-800'
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {cards.map((card, index) => (
                <div
                    key={index}
                    className={`bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-100 dark:border-slate-700 transition-all duration-300 hover:shadow-lg hover:shadow-gray-200/40 dark:hover:shadow-slate-900/40 hover:-translate-y-0.5 group ${card.border} relative overflow-hidden`}
                >
                    <div className="flex justify-between items-center mb-4">
                        <div className={`w-10 h-10 flex items-center justify-center rounded-xl ${card.bg} ${card.color} transition-transform duration-300 group-hover:scale-110 shadow-sm border border-transparent`}>
                            <card.icon size={20} />
                        </div>
                        {index === 1 && !isLoading && (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/50">
                                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                                Live
                            </div>
                        )}
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">{card.label}</p>
                        {isLoading ? (
                            <div className="h-8 w-16 bg-gray-50 dark:bg-slate-700 animate-pulse rounded-lg" />
                        ) : (
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{card.value}</h3>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SourceStats;
