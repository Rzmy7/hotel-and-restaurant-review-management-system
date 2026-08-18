import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatTrend } from '../utils/format';

interface StatCardProps {
    label: string;
    value: string | number;
    trend?: string | number;
    icon: LucideIcon;
    trendPositive?: boolean;
    iconColor?: string;
    iconBg?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
    label,
    value,
    trend,
    icon: Icon,
    trendPositive,
    iconColor = 'text-blue-500',
    iconBg = 'bg-blue-50',
}) => {
    const { text: formattedTrend, isPositive: inferredPositive } = formatTrend(trend);
    const isPositive = trendPositive !== undefined ? trendPositive : inferredPositive;
    const TrendIcon = isPositive ? TrendingUp : TrendingDown;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 flex flex-col h-full group hover:shadow-md hover:border-gray-200 dark:border-slate-700 dark:hover:border-slate-600 transition-all duration-200">
            <div className="flex justify-between items-start mb-5">
                <div className={`w-12 h-12 rounded-xl ${iconBg} dark:bg-opacity-20 flex items-center justify-center ${iconColor} transition-transform duration-200 group-hover:scale-105`}>
                    <Icon size={24} />
                </div>
                {trend !== undefined && trend !== null && (
                    <div
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isPositive
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                    >
                        <TrendIcon size={12} strokeWidth={2.5} />
                        <span>{formattedTrend}</span>
                    </div>
                )}
            </div>

            <div>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-1.5">{label}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</p>
            </div>
        </div>
    );
};

