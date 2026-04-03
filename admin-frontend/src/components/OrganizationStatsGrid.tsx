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
            <div className="group relative bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-6 border border-blue-200/50 hover:shadow-lg hover:shadow-blue-100/50 transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-blue-600 mb-1">Total Organizations</p>
                        <h3 className="text-3xl font-bold text-blue-900">{stats.total}</h3>
                        <div className="flex items-center gap-1 mt-2 text-xs text-blue-600">
                            <TrendingUp size={14} />
                            <span>All time</span>
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform duration-300">
                        <Building2 size={24} />
                    </div>
                </div>
            </div>

            {/* Active Organizations */}
            <div className="group relative bg-gradient-to-br from-green-50 to-green-100/50 rounded-2xl p-6 border border-green-200/50 hover:shadow-lg hover:shadow-green-100/50 transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-green-600 mb-1">Active Organizations</p>
                        <h3 className="text-3xl font-bold text-green-900">{stats.active}</h3>
                        <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span>Live now</span>
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-200 group-hover:scale-110 transition-transform duration-300">
                        <CheckCircle2 size={24} />
                    </div>
                </div>
            </div>
        </div>
    );
};
