import React from 'react';
import { Building2, CheckCircle2, Clock } from 'lucide-react';
import { OrganizationStatCard } from './OrganizationStatCard';
import type { OrganizationStats } from '../types';

interface OrganizationStatsGridProps {
    stats: OrganizationStats;
}

export const OrganizationStatsGrid: React.FC<OrganizationStatsGridProps> = ({ stats }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <OrganizationStatCard
                label="Total Organizations"
                value={stats.total}
                icon={Building2}
                iconColor="text-blue-500"
                iconBgColor="bg-blue-50"
            />
            <OrganizationStatCard
                label="Active Organizations"
                value={stats.active}
                icon={CheckCircle2}
                iconColor="text-green-500"
                iconBgColor="bg-green-50"
            />
            <OrganizationStatCard
                label="Pending Organizations"
                value={stats.pending}
                icon={Clock}
                iconColor="text-yellow-500"
                iconBgColor="bg-yellow-50"
            />
        </div>
    );
};
