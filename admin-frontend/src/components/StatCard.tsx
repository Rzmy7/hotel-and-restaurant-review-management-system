
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
    label: string;
    value: string;
    trend: string;
    icon: LucideIcon;
    trendPositive?: boolean;
}

export const StatCard = ({ label, value, trend, icon: Icon }: StatCardProps) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full">
            <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                    <Icon size={24} />
                </div>
                <div className="px-2 py-1 bg-blue-50 rounded-full text-blue-500 text-xs font-semibold">
                    {trend}
                </div>
            </div>

            <div>
                <div className="text-gray-500 text-sm mb-2">
                    {label}
                </div>
                <div className="text-2xl font-bold text-gray-900">
                    {value}
                </div>
            </div>
        </div>
    );
};
