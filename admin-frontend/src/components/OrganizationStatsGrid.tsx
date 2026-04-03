import React from 'react';
import { Building2, CheckCircle2, TrendingUp } from 'lucide-react';
import type { OrganizationStats } from '../types';

interface OrganizationStatsGridProps {
    stats: OrganizationStats;
}

export const OrganizationStatsGrid: React.FC<OrganizationStatsGridProps> = ({ stats }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Total Organizations */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                        <Building2 size={24} />
                    </div>
                    <div className="px-2 py-1 bg-blue-50 rounded-full text-blue-500 text-xs font-semibold">
                        All time
                    </div>
                </div>
                <div>
                    <div className="text-gray-500 text-sm mb-2">Total Organizations</div>
                    <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                        <TrendingUp size={13} />
                        <span>All registered organizations</span>
                    </div>
                </div>
            </div>

            {/* Organizations Added Today */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                        <CheckCircle2 size={24} />
                    </div>
                    <div className="px-2 py-1 bg-blue-50 rounded-full text-blue-500 text-xs font-semibold">
                        Today
                    </div>
                </div>
                <div>
                    <div className="text-gray-500 text-sm mb-2">Added Today</div>
                    <div className="text-3xl font-bold text-gray-900">{stats.addedToday}</div>
                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                        <span>Newly registered</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
