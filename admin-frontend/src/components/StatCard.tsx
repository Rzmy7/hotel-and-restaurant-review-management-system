import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
    label: string;
    value: string;
    trend: string;
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
    trendPositive = true,
    iconColor = 'text-blue-500',
    iconBg = 'bg-blue-50',
}) => {
    const isPositive = trendPositive ?? trend.startsWith('+');
    const TrendIcon = isPositive ? TrendingUp : TrendingDown;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full group hover:shadow-md hover:border-gray-200 transition-all duration-200">
            <div className="flex justify-between items-start mb-5">
                <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center ${iconColor} transition-transform duration-200 group-hover:scale-105`}>
                    <Icon size={24} />
                </div>
                <div
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        isPositive
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-red-50 text-red-600'
                    }`}
                >
                    <TrendIcon size={12} strokeWidth={2.5} />
                    <span>{trend}</span>
                </div>
            </div>

            <div>
                <p className="text-sm text-gray-500 mb-1.5">{label}</p>
                <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
            </div>
        </div>
    );
};
